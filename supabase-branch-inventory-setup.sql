-- Branch-level inventory for the COFTEA POS platform.
-- Run in Supabase SQL Editor (same project as POS), after supabase-menu-catalog-setup.sql.
-- Tracks per-franchisee stock counts so HQ can monitor reorder needs network-wide.

-- ============================================================
-- Table
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
-- updated_at trigger (reuses the catalog helper if present)
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

drop trigger if exists set_branch_inventory_updated_at on public.branch_inventory;
create trigger set_branch_inventory_updated_at
before update on public.branch_inventory
for each row execute function public.set_catalog_updated_at();

-- ============================================================
-- Row Level Security (demo: open to app users, matches existing tables)
-- ============================================================

alter table public.branch_inventory enable row level security;

drop policy if exists "branch_inventory read for app users" on public.branch_inventory;
create policy "branch_inventory read for app users"
  on public.branch_inventory for select to anon, authenticated using (true);

drop policy if exists "branch_inventory write for app users" on public.branch_inventory;
create policy "branch_inventory write for app users"
  on public.branch_inventory for all to anon, authenticated using (true) with check (true);

-- ============================================================
-- Seed: distribute brand raw materials across each brand's branches.
-- on_hand_qty is varied per branch so low-stock alerts surface realistically.
-- Re-runnable: existing rows keep their qty, new pairs get a seeded value.
-- ============================================================

insert into public.branch_inventory (brand_id, branch_id, raw_material_id, on_hand_qty, low_stock_qty)
select
  rm.brand_id,
  b.id as branch_id,
  rm.id as raw_material_id,
  -- spread on-hand between ~0.4x and ~1.6x of the brand baseline using a stable hash
  round(
    greatest(
      0,
      rm.on_hand_qty * (0.4 + (abs(hashtext(b.id::text || rm.id::text)) % 120) / 100.0)
    )::numeric,
    2
  ) as on_hand_qty,
  rm.low_stock_qty
from public.raw_material rm
join public.branch b
  on b.brand_id = rm.brand_id
on conflict (branch_id, raw_material_id) do nothing;
