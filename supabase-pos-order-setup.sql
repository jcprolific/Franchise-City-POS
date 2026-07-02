-- Franchise City POS: create pos_order + brands and enable app access.
-- Run in Supabase SQL Editor if Orders page cannot load data.

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('potato-corner', 'coftea')),
  name text not null,
  logo_url text,
  theme jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.brands (id, slug, name, logo_url, theme)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    'potato-corner',
    'Potato Corner',
    '/brands/potato-corner.svg',
    '{"primary":"#008d36","accent":"#f37021"}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    'coftea',
    'Coftea',
    '/brands/coftea.svg',
    '{"primary":"#6B4226","accent":"#C8956C"}'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  logo_url = excluded.logo_url,
  theme = excluded.theme;

create table if not exists public.pos_order (
  id uuid primary key default gen_random_uuid(),
  order_number integer,
  total_amount numeric not null default 0,
  payment_method text,
  item_count integer not null default 1,
  created_at timestamptz not null default now(),
  branch_id uuid,
  brand_id uuid references public.brands(id),
  brand_name text,
  subtotal numeric default 0,
  discount_amount numeric default 0,
  status text not null default 'NEW',
  payment_status text not null default 'PAID',
  cashier_id uuid,
  payment_reference text,
  order_type text
);

create index if not exists pos_order_created_at_idx on public.pos_order (created_at desc);
create index if not exists pos_order_brand_id_idx on public.pos_order (brand_id);

alter table public.brands enable row level security;
alter table public.pos_order enable row level security;

drop policy if exists "brands read for app users" on public.brands;
create policy "brands read for app users"
on public.brands
for select
to anon, authenticated
using (true);

drop policy if exists "pos_order read for app users" on public.pos_order;
create policy "pos_order read for app users"
on public.pos_order
for select
to anon, authenticated
using (true);

drop policy if exists "pos_order insert for app users" on public.pos_order;
create policy "pos_order insert for app users"
on public.pos_order
for insert
to anon, authenticated
with check (true);

drop policy if exists "pos_order update for app users" on public.pos_order;
create policy "pos_order update for app users"
on public.pos_order
for update
to anon, authenticated
using (true)
with check (true);
