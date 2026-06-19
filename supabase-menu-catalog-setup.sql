-- Menu Catalog + Recipe / Raw Material setup for COFTEA POS platform
-- Run in Supabase SQL Editor (same project as POS).
-- Brand-scoped: every catalog row belongs to a brand in public.brands.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.menu_category (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  icon text default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table if not exists public.menu_product (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  category_id uuid references public.menu_category(id) on delete set null,
  name text not null,
  description text default '',
  base_price numeric(10,2) not null default 0,
  icon text default '',
  image_url text,
  badge text,
  customizable boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table if not exists public.menu_product_variant (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.menu_product(id) on delete cascade,
  name text not null,
  abbr text not null,
  additional_price numeric(10,2) not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, abbr)
);

create table if not exists public.menu_addon (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table if not exists public.menu_product_addon (
  product_id uuid not null references public.menu_product(id) on delete cascade,
  addon_id uuid not null references public.menu_addon(id) on delete cascade,
  primary key (product_id, addon_id)
);

create table if not exists public.raw_material (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  unit text not null default 'g',
  on_hand_qty numeric(12,2) not null default 0,
  low_stock_qty numeric(12,2) not null default 0,
  icon text default '',
  supplier_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

-- One row per (product[/variant], raw_material). quantity_per_cup is the
-- amount of the raw material consumed to make one cup of the drink.
create table if not exists public.menu_recipe (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.menu_product(id) on delete cascade,
  variant_id uuid references public.menu_product_variant(id) on delete cascade,
  raw_material_id uuid not null references public.raw_material(id) on delete cascade,
  quantity_per_cup numeric(12,2) not null default 0,
  unit text not null default 'g',
  yield_notes text,
  created_at timestamptz not null default now(),
  unique (product_id, variant_id, raw_material_id)
);

create index if not exists menu_category_brand_idx on public.menu_category(brand_id);
create index if not exists menu_product_brand_idx on public.menu_product(brand_id);
create index if not exists menu_product_category_idx on public.menu_product(category_id);
create index if not exists menu_variant_product_idx on public.menu_product_variant(product_id);
create index if not exists menu_addon_brand_idx on public.menu_addon(brand_id);
create index if not exists raw_material_brand_idx on public.raw_material(brand_id);
create index if not exists menu_recipe_product_idx on public.menu_recipe(product_id);

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

drop trigger if exists set_menu_category_updated_at on public.menu_category;
create trigger set_menu_category_updated_at
before update on public.menu_category
for each row execute function public.set_catalog_updated_at();

drop trigger if exists set_menu_product_updated_at on public.menu_product;
create trigger set_menu_product_updated_at
before update on public.menu_product
for each row execute function public.set_catalog_updated_at();

drop trigger if exists set_raw_material_updated_at on public.raw_material;
create trigger set_raw_material_updated_at
before update on public.raw_material
for each row execute function public.set_catalog_updated_at();

-- ============================================================
-- Row Level Security (demo: open to app users, matches existing tables)
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'menu_category','menu_product','menu_product_variant',
    'menu_addon','menu_product_addon','raw_material','menu_recipe'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s read for app users" on public.%I;', t, t);
    execute format(
      'create policy "%s read for app users" on public.%I for select to anon, authenticated using (true);',
      t, t
    );
    execute format('drop policy if exists "%s write for app users" on public.%I;', t, t);
    execute format(
      'create policy "%s write for app users" on public.%I for all to anon, authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end$$;

-- ============================================================
-- Seed: Coftea catalog (matches static brand.menu so POS stays consistent)
-- ============================================================

-- Categories
insert into public.menu_category (brand_id, name, icon, sort_order)
values
  ('a1000000-0000-4000-8000-000000000002', 'Coffee', '☕', 1),
  ('a1000000-0000-4000-8000-000000000002', 'Milk Tea', '🧋', 2),
  ('a1000000-0000-4000-8000-000000000002', 'Fruit Tea', '🍹', 3),
  ('a1000000-0000-4000-8000-000000000002', 'Snacks', '🍪', 4)
on conflict (brand_id, name) do update
set icon = excluded.icon, sort_order = excluded.sort_order, is_active = true;

-- Products
insert into public.menu_product (brand_id, category_id, name, description, base_price, icon, customizable, sort_order)
select
  'a1000000-0000-4000-8000-000000000002',
  c.id,
  v.name,
  v.description,
  v.base_price,
  v.icon,
  v.customizable,
  v.sort_order
from (values
  ('Coffee',    'Americano',         'Rich espresso with hot water',        120, '☕', true,  1),
  ('Coffee',    'Latte',             'Smooth & creamy',                     150, '☕', true,  2),
  ('Coffee',    'Cappuccino',        'Foam-forward classic',                150, '☕', true,  3),
  ('Coffee',    'Espresso',          'Single shot, rich crema',             100, '☕', true,  4),
  ('Coffee',    'Mocha',             'Chocolate, espresso, milk',           160, '☕', true,  5),
  ('Coffee',    'Caramel Macchiato', 'Espresso with caramel & milk foam',   170, '☕', true,  6),
  ('Coffee',    'Flat White',        'Velvety microfoam',                   155, '☕', true,  7),
  ('Coffee',    'Spanish Latte',     'Sweetened condensed milk latte',      165, '☕', true,  8),
  ('Milk Tea',  'Classic Milk Tea',  'House-brewed black tea & milk',       130, '🧋', true,  9),
  ('Milk Tea',  'Taro Milk Tea',     'Creamy taro blend',                   140, '🧋', true, 10),
  ('Milk Tea',  'Matcha Latte',      'Premium matcha with milk',            150, '🧋', true, 11),
  ('Milk Tea',  'Brown Sugar MT',    'Caramelized brown sugar',             155, '🧋', true, 12),
  ('Milk Tea',  'Wintermelon',       'Sweet & refreshing',                  130, '🧋', true, 13),
  ('Milk Tea',  'Okinawa',           'Roasted brown sugar tea',             145, '🧋', true, 14),
  ('Fruit Tea', 'Mango Fruit Tea',   'Fresh mango pulp & tea',              130, '🥭', true, 15),
  ('Fruit Tea', 'Passion Fruit',     'Tangy tropical blend',                130, '🍑', true, 16),
  ('Fruit Tea', 'Lychee Tea',        'Lychee with jasmine green tea',       135, '🍹', true, 17),
  ('Fruit Tea', 'Green Apple',       'Crisp & refreshing',                  130, '🍏', true, 18),
  ('Snacks',    'Fries',             'Golden crispy fries',                  80, '🍟', false, 19),
  ('Snacks',    'Chicken Pops',      'Bite-sized fried chicken',             95, '🍗', false, 20),
  ('Snacks',    'Nachos',            'Loaded cheese nachos',                 85, '🧀', false, 21),
  ('Snacks',    'Fish Balls',        'Classic street snack',                 60, '🐟', false, 22)
) as v(category_name, name, description, base_price, icon, customizable, sort_order)
join public.menu_category c
  on c.brand_id = 'a1000000-0000-4000-8000-000000000002'
 and c.name = v.category_name
on conflict (brand_id, name) do update
set category_id = excluded.category_id,
    description = excluded.description,
    base_price = excluded.base_price,
    icon = excluded.icon,
    customizable = excluded.customizable,
    sort_order = excluded.sort_order;

-- Variants (Medium/Large for most drinks, Solo/Double for Espresso)
insert into public.menu_product_variant (product_id, name, abbr, additional_price, sort_order)
select p.id, s.name, s.abbr, s.additional_price, s.sort_order
from (values
  ('Americano','Medium (16oz)','MED',0,1),  ('Americano','Large (22oz)','LRG',30,2),
  ('Latte','Medium (16oz)','MED',0,1),       ('Latte','Large (22oz)','LRG',30,2),
  ('Cappuccino','Medium (16oz)','MED',0,1),  ('Cappuccino','Large (22oz)','LRG',30,2),
  ('Espresso','Solo','SOLO',0,1),            ('Espresso','Double','DBL',30,2),
  ('Mocha','Medium (16oz)','MED',0,1),       ('Mocha','Large (22oz)','LRG',30,2),
  ('Caramel Macchiato','Medium (16oz)','MED',0,1), ('Caramel Macchiato','Large (22oz)','LRG',30,2),
  ('Flat White','Medium (16oz)','MED',0,1),  ('Flat White','Large (22oz)','LRG',30,2),
  ('Spanish Latte','Medium (16oz)','MED',0,1), ('Spanish Latte','Large (22oz)','LRG',30,2),
  ('Classic Milk Tea','Medium (16oz)','MED',0,1), ('Classic Milk Tea','Large (22oz)','LRG',30,2),
  ('Taro Milk Tea','Medium (16oz)','MED',0,1), ('Taro Milk Tea','Large (22oz)','LRG',30,2),
  ('Matcha Latte','Medium (16oz)','MED',0,1), ('Matcha Latte','Large (22oz)','LRG',30,2),
  ('Brown Sugar MT','Medium (16oz)','MED',0,1), ('Brown Sugar MT','Large (22oz)','LRG',30,2),
  ('Wintermelon','Medium (16oz)','MED',0,1), ('Wintermelon','Large (22oz)','LRG',30,2),
  ('Okinawa','Medium (16oz)','MED',0,1),     ('Okinawa','Large (22oz)','LRG',30,2),
  ('Mango Fruit Tea','Medium (16oz)','MED',0,1), ('Mango Fruit Tea','Large (22oz)','LRG',30,2),
  ('Passion Fruit','Medium (16oz)','MED',0,1), ('Passion Fruit','Large (22oz)','LRG',30,2),
  ('Lychee Tea','Medium (16oz)','MED',0,1),  ('Lychee Tea','Large (22oz)','LRG',30,2),
  ('Green Apple','Medium (16oz)','MED',0,1), ('Green Apple','Large (22oz)','LRG',30,2)
) as s(product_name, name, abbr, additional_price, sort_order)
join public.menu_product p
  on p.brand_id = 'a1000000-0000-4000-8000-000000000002'
 and p.name = s.product_name
on conflict (product_id, abbr) do update
set name = excluded.name,
    additional_price = excluded.additional_price,
    sort_order = excluded.sort_order;

-- Add-ons
insert into public.menu_addon (brand_id, name, price)
values
  ('a1000000-0000-4000-8000-000000000002', 'Pearls', 15),
  ('a1000000-0000-4000-8000-000000000002', 'Nata de Coco', 15),
  ('a1000000-0000-4000-8000-000000000002', 'Cream Cheese', 25),
  ('a1000000-0000-4000-8000-000000000002', 'Coffee Jelly', 15),
  ('a1000000-0000-4000-8000-000000000002', 'Pudding', 20),
  ('a1000000-0000-4000-8000-000000000002', 'Extra Shot', 25),
  ('a1000000-0000-4000-8000-000000000002', 'Whipped Cream', 20)
on conflict (brand_id, name) do update set price = excluded.price, is_active = true;

-- Raw materials (with realistic on-hand quantities for yield demo)
insert into public.raw_material (brand_id, name, unit, on_hand_qty, low_stock_qty, icon)
values
  ('a1000000-0000-4000-8000-000000000002', 'Taro Powder',        'g',   1000, 300, '🟣'),
  ('a1000000-0000-4000-8000-000000000002', 'Matcha Powder',      'g',    600, 200, '🍵'),
  ('a1000000-0000-4000-8000-000000000002', 'Black Tea Leaves',   'g',   1200, 300, '🍂'),
  ('a1000000-0000-4000-8000-000000000002', 'Espresso Beans',     'g',   2000, 500, '🫘'),
  ('a1000000-0000-4000-8000-000000000002', 'Fresh Milk',         'ml', 20000, 5000, '🥛'),
  ('a1000000-0000-4000-8000-000000000002', 'Brown Sugar Syrup',  'ml',  4000, 1000, '🟤'),
  ('a1000000-0000-4000-8000-000000000002', 'Tapioca Pearls',     'g',   3000, 800, '⚫'),
  ('a1000000-0000-4000-8000-000000000002', '16oz Cups',          'pcs',  500, 200, '🥤'),
  ('a1000000-0000-4000-8000-000000000002', '22oz Cups',          'pcs',  400, 150, '🥤'),
  ('a1000000-0000-4000-8000-000000000002', 'Cup Lids',           'pcs',  900, 300, '🔘')
on conflict (brand_id, name) do update
set unit = excluded.unit, low_stock_qty = excluded.low_stock_qty, icon = excluded.icon;

-- Recipes (per-cup usage) for a representative set of drinks for the yield demo
insert into public.menu_recipe (product_id, raw_material_id, quantity_per_cup, unit, yield_notes)
select p.id, m.id, r.qty, r.unit, r.notes
from (values
  ('Taro Milk Tea',    'Taro Powder',    20,  'g',  '1kg powder makes ~50 cups'),
  ('Taro Milk Tea',    'Fresh Milk',     150, 'ml', null),
  ('Matcha Latte',     'Matcha Powder',  18,  'g',  null),
  ('Matcha Latte',     'Fresh Milk',     150, 'ml', null),
  ('Classic Milk Tea', 'Black Tea Leaves', 12, 'g', null),
  ('Classic Milk Tea', 'Fresh Milk',     120, 'ml', null),
  ('Americano',        'Espresso Beans', 18,  'g',  null),
  ('Latte',            'Espresso Beans', 18,  'g',  null),
  ('Latte',            'Fresh Milk',     150, 'ml', null)
) as r(product_name, material_name, qty, unit, notes)
join public.menu_product p
  on p.brand_id = 'a1000000-0000-4000-8000-000000000002'
 and p.name = r.product_name
join public.raw_material m
  on m.brand_id = 'a1000000-0000-4000-8000-000000000002'
 and m.name = r.material_name
on conflict (product_id, variant_id, raw_material_id) do update
set quantity_per_cup = excluded.quantity_per_cup,
    unit = excluded.unit,
    yield_notes = excluded.yield_notes;
