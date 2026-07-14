-- Franchise owner Web Push on each punched POS sale.
-- Cups come from pos_order.item_count (set on insert before line items land).

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.push_dispatch_config (
  key text primary key,
  value text not null
);

alter table public.push_dispatch_config enable row level security;

-- No policies for authenticated/anon — service role / security definer only.

insert into public.push_dispatch_config (key, value) values
  ('supabase_project_url', 'https://wuthacuizslfsadkwmad.supabase.co'),
  ('owner_sale_push_secret', '0141aed897a229a72be540f50fb843478ebb1d6d4182b2a0')
on conflict (key) do update set value = excluded.value;

create or replace function public.invoke_notify_owner_sale(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
  v_full_url text;
begin
  if p_order_id is null then
    return;
  end if;

  select value into v_url from public.push_dispatch_config where key = 'supabase_project_url';
  select value into v_secret from public.push_dispatch_config where key = 'owner_sale_push_secret';

  if v_url is null or v_secret is null then
    raise log 'notify-owner-sale: missing push_dispatch_config';
    return;
  end if;

  v_full_url := rtrim(v_url, '/') || '/functions/v1/notify-owner-sale';

  perform net.http_post(
    url := v_full_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-owner-sale-push-secret', v_secret
    ),
    body := jsonb_build_object('order_id', p_order_id::text),
    timeout_milliseconds := 15000
  );
end;
$$;

create or replace function public.trg_pos_order_notify_owner_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_pay text;
begin
  v_status := upper(coalesce(new.status::text, 'COMPLETED'));
  v_pay := upper(coalesce(new.payment_status::text, 'PAID'));

  if v_pay <> 'PAID' then
    return new;
  end if;
  if v_status in ('VOIDED', 'REFUNDED', 'CANCELLED') then
    return new;
  end if;
  if new.branch_id is null then
    return new;
  end if;

  perform public.invoke_notify_owner_sale(new.id);
  return new;
end;
$$;

drop trigger if exists trg_pos_order_notify_owner_sale on public.pos_order;
create trigger trg_pos_order_notify_owner_sale
  after insert on public.pos_order
  for each row
  execute function public.trg_pos_order_notify_owner_sale();
