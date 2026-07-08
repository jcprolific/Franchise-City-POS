-- Enterprise Phase 1: Foundation (schema upgrade, audit log, BGC seed)
-- Run via Supabase migrations or SQL Editor on the COFTEA POS project.

-- ============================================================
-- 1. Brands
-- ============================================================

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
set name = excluded.name, logo_url = excluded.logo_url, theme = excluded.theme;

alter table public.brands enable row level security;
drop policy if exists "brands read for app users" on public.brands;
create policy "brands read for app users"
  on public.brands for select to anon, authenticated using (true);

-- ============================================================
-- 2. Upgrade legacy pos_order → enterprise columns
-- ============================================================

alter table public.branch add column if not exists brand_id uuid references public.brands(id);
alter table public.branch add column if not exists branch_code text;
alter table public.branch add column if not exists city text;
alter table public.branch add column if not exists onboarding_status text;

alter table public.pos_order add column if not exists order_number integer;
alter table public.pos_order add column if not exists item_count integer not null default 1;
alter table public.pos_order add column if not exists brand_id uuid references public.brands(id);
alter table public.pos_order add column if not exists brand_name text;
alter table public.pos_order add column if not exists payment_reference text;
alter table public.pos_order add column if not exists order_type text;
alter table public.pos_order add column if not exists discount_type text;
alter table public.pos_order add column if not exists void_reason text;
alter table public.pos_order add column if not exists voided_by text;
alter table public.pos_order add column if not exists voided_at timestamptz;
alter table public.pos_order add column if not exists refund_amount numeric default 0;
alter table public.pos_order add column if not exists refund_reason text;
alter table public.pos_order add column if not exists refunded_at timestamptz;
alter table public.pos_order add column if not exists client_order_id text;
alter table public.pos_order add column if not exists terminal_id text;

create unique index if not exists pos_order_client_order_id_unique
  on public.pos_order (client_order_id)
  where client_order_id is not null;

create index if not exists pos_order_created_at_idx on public.pos_order (created_at desc);
create index if not exists pos_order_brand_id_idx on public.pos_order (brand_id);

-- Widen status enum → text so POS workflow statuses work
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pos_order'
      and column_name = 'status' and udt_name = 'order_status'
  ) then
    alter table public.pos_order alter column status drop default;
    alter table public.pos_order alter column status type text using status::text;
    alter table public.pos_order alter column status set default 'NEW';
  end if;
end $$;

-- Ensure permissive RLS on pos_order (legacy may already have it)
alter table public.pos_order enable row level security;
drop policy if exists "pos_order read for app users" on public.pos_order;
create policy "pos_order read for app users"
  on public.pos_order for select to anon, authenticated using (true);
drop policy if exists "pos_order insert for app users" on public.pos_order;
create policy "pos_order insert for app users"
  on public.pos_order for insert to anon, authenticated with check (true);
drop policy if exists "pos_order update for app users" on public.pos_order;
create policy "pos_order update for app users"
  on public.pos_order for update to anon, authenticated using (true) with check (true);

-- ============================================================
-- 3. Audit log
-- ============================================================

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  branch_id uuid references public.branch(id),
  terminal_id text,
  user_id text,
  user_name text,
  action text not null check (action in (
    'order_created', 'order_synced', 'order_status_changed',
    'order_voided', 'order_refunded', 'stock_adjusted', 'shift_opened', 'shift_closed'
  )),
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_branch_idx on public.audit_log (branch_id, created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_action_idx on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;
drop policy if exists "audit_log read for app users" on public.audit_log;
create policy "audit_log read for app users"
  on public.audit_log for select to anon, authenticated using (true);
drop policy if exists "audit_log insert for app users" on public.audit_log;
create policy "audit_log insert for app users"
  on public.audit_log for insert to anon, authenticated with check (true);

-- ============================================================
-- 4. Seed BGC Central branch (matches pos-client default)
-- ============================================================

insert into public.branch (id, name, address, is_active, brand_id, branch_code, city, onboarding_status)
values (
  'b1000000-0000-4000-8000-000000000001',
  'Coftea — BGC Central',
  'BGC, Taguig City',
  true,
  'a1000000-0000-4000-8000-000000000002',
  'BGC-01',
  'Taguig',
  'active'
)
on conflict (id) do update
set
  name = excluded.name,
  address = excluded.address,
  brand_id = excluded.brand_id,
  branch_code = excluded.branch_code,
  city = excluded.city,
  onboarding_status = excluded.onboarding_status;
