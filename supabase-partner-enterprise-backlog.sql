-- Franchise City Partner Enterprise Backlog
-- Run in Supabase SQL Editor after enterprise phase 2 migrations.

-- Extend payment_status enum for open tickets + void/refund
alter type public.payment_status_enum add value if not exists 'UNPAID';
alter type public.payment_status_enum add value if not exists 'VOIDED';
alter type public.payment_status_enum add value if not exists 'REFUNDED';

-- ============================================================
-- pos_order extensions
-- ============================================================

alter table public.pos_order
  add column if not exists customer_name text,
  add column if not exists order_note text,
  add column if not exists charged_by text,
  add column if not exists charged_by_name text,
  add column if not exists completed_at timestamptz,
  add column if not exists promo_percent numeric(5,2),
  add column if not exists shift_id uuid references public.pos_shift(id) on delete set null;

create index if not exists pos_order_shift_idx on public.pos_order (shift_id);

-- Backfill legacy NEW+PAID rows to COMPLETED (revenue alignment)
update public.pos_order
set
  status = 'COMPLETED',
  completed_at = coalesce(completed_at, created_at)
where upper(coalesce(status, 'NEW')) = 'NEW'
  and payment_status = 'PAID'::public.payment_status_enum;

-- ============================================================
-- pos_shift extensions (cups + per-shift order counter)
-- ============================================================

alter table public.pos_shift
  add column if not exists beginning_cups jsonb not null default '{}'::jsonb,
  add column if not exists ending_cups jsonb,
  add column if not exists last_order_number integer not null default 0;

-- ============================================================
-- Staff presence (online / idle)
-- ============================================================

create table if not exists public.staff_presence (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  staff_name text not null,
  branch_id uuid references public.branch(id) on delete cascade,
  role text,
  status text not null default 'offline' check (status in ('online', 'idle', 'offline')),
  terminal_id text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, branch_id)
);

create index if not exists staff_presence_branch_idx on public.staff_presence (branch_id, last_seen_at desc);

alter table public.staff_presence enable row level security;

drop policy if exists "staff_presence all for app" on public.staff_presence;
create policy "staff_presence all for app"
  on public.staff_presence for all to anon, authenticated using (true) with check (true);

-- Per-shift order counter RPC
create or replace function public.get_next_shift_order_number(p_shift_id uuid)
returns integer
language plpgsql
as $$
declare
  v_next integer;
begin
  update public.pos_shift
  set last_order_number = last_order_number + 1
  where id = p_shift_id and status = 'open'
  returning last_order_number into v_next;

  if v_next is null then
    raise exception 'shift-not-open';
  end if;

  return v_next;
end;
$$;
