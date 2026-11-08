-- Coftea POS inventory catalog (raw materials, branch stock, movements, suppliers, daily usage).
-- Brand-scoped; isolated from Shopify-style inventory_items / stores tables.

-- ============================================================
-- raw_material
-- ============================================================

create table if not exists public.raw_material (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  unit text not null default 'pcs',
  on_hand_qty numeric(12,2) not null default 0,
  low_stock_qty numeric(12,2) not null default 0,
  icon text default '',
  supplier_id uuid,
  sku text,
  category text not null default '',
  packaging text default '',
  price numeric(12,2) not null default 0,
  srp_price numeric(12,2),
  supplier_price numeric(12,2),
  shipping_fee numeric(12,2),
  sort_order int not null default 0,
  is_active boolean not null default true,
  source_sheet text,
  source_row int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, category, name)
);

create index if not exists raw_material_brand_idx on public.raw_material(brand_id);
create index if not exists raw_material_category_idx on public.raw_material(brand_id, category);

-- ============================================================
-- supplier
-- ============================================================

create table if not exists public.supplier (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  category text,
  tin text,
  tax_type text,
  is_active boolean not null default true,
  outstanding_balance numeric(12,2) not null default 0,
  credit_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

create index if not exists supplier_brand_idx on public.supplier(brand_id);

alter table public.raw_material
  drop constraint if exists raw_material_supplier_id_fkey;
alter table public.raw_material
  add constraint raw_material_supplier_id_fkey
  foreign key (supplier_id) references public.supplier(id) on delete set null;

-- ============================================================
-- branch_inventory
-- ============================================================

create table if not exists public.branch_inventory (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  raw_material_id uuid not null references public.raw_material(id) on delete cascade,
  on_hand_qty numeric(12,2) not null default 0,
  low_stock_qty numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, raw_material_id)
);

create index if not exists branch_inventory_brand_idx on public.branch_inventory(brand_id);
create index if not exists branch_inventory_branch_idx on public.branch_inventory(branch_id);
create index if not exists branch_inventory_material_idx on public.branch_inventory(raw_material_id);

-- ============================================================
-- stock_movement (audit log; raw_material_id stored as text for legacy compat)
-- ============================================================

create table if not exists public.stock_movement (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  branch_id uuid not null references public.branch(id) on delete cascade,
  raw_material_id text not null,
  material_name text not null,
  movement_type text not null check (movement_type in ('receive', 'issue', 'adjustment', 'sale')),
  qty_before numeric not null default 0,
  qty_delta numeric not null,
  qty_after numeric not null default 0,
  reason text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movement_branch_idx on public.stock_movement (branch_id, created_at desc);

-- ============================================================
-- inventory_usage_daily (from Daily Total sheets)
-- ============================================================

create table if not exists public.inventory_usage_daily (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  raw_material_id uuid not null references public.raw_material(id) on delete cascade,
  usage_date date not null,
  qty numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (branch_id, raw_material_id, usage_date)
);

create index if not exists inventory_usage_daily_branch_date_idx
  on public.inventory_usage_daily(branch_id, usage_date);

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function public.set_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_supplier_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_raw_material_updated_at on public.raw_material;
create trigger set_raw_material_updated_at
before update on public.raw_material
for each row execute function public.set_catalog_updated_at();

drop trigger if exists set_supplier_updated_at on public.supplier;
create trigger set_supplier_updated_at
before update on public.supplier
for each row execute function public.set_supplier_updated_at();

drop trigger if exists set_branch_inventory_updated_at on public.branch_inventory;
create trigger set_branch_inventory_updated_at
before update on public.branch_inventory
for each row execute function public.set_catalog_updated_at();

-- ============================================================
-- RLS (demo parity with existing POS tables)
-- ============================================================

alter table public.raw_material enable row level security;
alter table public.supplier enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.stock_movement enable row level security;
alter table public.inventory_usage_daily enable row level security;

drop policy if exists "raw_material read for app users" on public.raw_material;
create policy "raw_material read for app users"
  on public.raw_material for select to anon, authenticated using (true);
drop policy if exists "raw_material write for app users" on public.raw_material;
create policy "raw_material write for app users"
  on public.raw_material for all to anon, authenticated using (true) with check (true);

drop policy if exists "supplier read for app users" on public.supplier;
create policy "supplier read for app users"
  on public.supplier for select to anon, authenticated using (true);
drop policy if exists "supplier write for app users" on public.supplier;
create policy "supplier write for app users"
  on public.supplier for all to anon, authenticated using (true) with check (true);

drop policy if exists "branch_inventory read for app users" on public.branch_inventory;
create policy "branch_inventory read for app users"
  on public.branch_inventory for select to anon, authenticated using (true);
drop policy if exists "branch_inventory write for app users" on public.branch_inventory;
create policy "branch_inventory write for app users"
  on public.branch_inventory for all to anon, authenticated using (true) with check (true);

drop policy if exists "stock_movement read for app users" on public.stock_movement;
create policy "stock_movement read for app users"
  on public.stock_movement for select to anon, authenticated using (true);
drop policy if exists "stock_movement write for app users" on public.stock_movement;
create policy "stock_movement write for app users"
  on public.stock_movement for all to anon, authenticated using (true) with check (true);

drop policy if exists "inventory_usage_daily read for app users" on public.inventory_usage_daily;
create policy "inventory_usage_daily read for app users"
  on public.inventory_usage_daily for select to anon, authenticated using (true);
drop policy if exists "inventory_usage_daily write for app users" on public.inventory_usage_daily;
create policy "inventory_usage_daily write for app users"
  on public.inventory_usage_daily for all to anon, authenticated using (true) with check (true);
