-- Franchisee supply orders + HitPay pay-first flow.
-- Creates tables if missing; safe on projects that never had supply_order.

create table if not exists public.supply_order (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  reference_no text not null,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment', 'pending', 'approved', 'preparing',
      'out_for_delivery', 'delivered', 'cancelled'
    )),
  item_count integer not null default 0,
  total_amount numeric not null default 0,
  notes text,
  placed_by text,
  payment_method text
    check (
      payment_method is null
      or payment_method = any (array['gcash'::text, 'bank_transfer'::text, 'hitpay'::text])
    ),
  payment_status text not null default 'unpaid'
    check (payment_status = any (array['unpaid'::text, 'paid'::text, 'failed'::text, 'expired'::text])),
  hitpay_payment_request_id text,
  paid_at timestamptz,
  payment_reference text,
  promised_delivery_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.supply_order_item (
  id uuid primary key default gen_random_uuid(),
  supply_order_id uuid not null references public.supply_order(id) on delete cascade,
  raw_material_id text,
  name text not null,
  packaging text,
  unit text,
  unit_price numeric not null default 0,
  quantity numeric not null default 0,
  line_total numeric not null default 0
);

create index if not exists supply_order_brand_idx
  on public.supply_order (brand_id, created_at desc);
create index if not exists supply_order_branch_idx
  on public.supply_order (branch_id, created_at desc);

create unique index if not exists supply_order_reference_no_key
  on public.supply_order (reference_no);

create index if not exists supply_order_hitpay_payment_request_id_idx
  on public.supply_order (hitpay_payment_request_id)
  where hitpay_payment_request_id is not null;

create index if not exists supply_order_item_order_idx
  on public.supply_order_item (supply_order_id);

grant select, insert, update, delete on public.supply_order to anon, authenticated, service_role;
grant select, insert, update, delete on public.supply_order_item to anon, authenticated, service_role;

alter table public.supply_order enable row level security;
alter table public.supply_order_item enable row level security;

drop policy if exists "supply_order read for app users" on public.supply_order;
create policy "supply_order read for app users"
  on public.supply_order for select to anon, authenticated using (true);

drop policy if exists "supply_order write for app users" on public.supply_order;
create policy "supply_order write for app users"
  on public.supply_order for all to anon, authenticated using (true) with check (true);

drop policy if exists "supply_order_item read for app users" on public.supply_order_item;
create policy "supply_order_item read for app users"
  on public.supply_order_item for select to anon, authenticated using (true);

drop policy if exists "supply_order_item write for app users" on public.supply_order_item;
create policy "supply_order_item write for app users"
  on public.supply_order_item for all to anon, authenticated using (true) with check (true);
