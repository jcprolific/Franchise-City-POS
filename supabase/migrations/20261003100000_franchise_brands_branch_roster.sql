-- Franchise network: brands + branch roster (alongside commerce schema).
-- Safe to run on projects that only have commerce tables today.

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  theme jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_slug_check check (
    slug in (
      'potato-corner',
      'coftea',
      'la-lemon',
      'keki',
      'meow-meow',
      'pizza-pocholo'
    )
  )
);

create or replace function public.set_brands_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_brands_updated_at();

alter table public.brands enable row level security;

drop policy if exists "brands read for authenticated" on public.brands;
create policy "brands read for authenticated"
on public.brands
for select
to authenticated
using (true);

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
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    'la-lemon',
    'La Lemon',
    '/brands/coftea.svg',
    '{"primary":"#F4D03F","accent":"#27AE60"}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000004',
    'keki',
    'Keki',
    '/brands/coftea.svg',
    '{"primary":"#8E44AD","accent":"#E74C3C"}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000005',
    'meow-meow',
    'Meow Meow',
    '/brands/coftea.svg',
    '{"primary":"#FF6B9D","accent":"#FFC107"}'::jsonb
  ),
  (
    'a1000000-0000-4000-8000-000000000006',
    'pizza-pocholo',
    'Pizza Pocholo',
    '/brands/coftea.svg',
    '{"primary":"#C0392B","accent":"#F39C12"}'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  logo_url = excluded.logo_url,
  theme = excluded.theme;

alter table public.profiles
  add column if not exists brand_id uuid references public.brands(id);

alter table public.profiles
  add column if not exists branch_id uuid;

create index if not exists profiles_brand_id_idx on public.profiles(brand_id);

create table if not exists public.branch (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  name text not null,
  address text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  branch_code text,
  franchisee_name text,
  franchisee_phone text,
  franchisee_email text,
  business_name text,
  opening_date date,
  contract_start_date date,
  franchise_package text,
  onboarding_status text not null default 'onboarding'
    check (onboarding_status in (
      'signed_contract',
      'under_construction',
      'for_training_schedule',
      'onboarding',
      'active',
      'suspended'
    )),
  owner_user_id uuid references auth.users(id),
  home_address text,
  store_status text not null default 'active'
    check (store_status in (
      'loi_pending',
      'downpayment',
      'for_contract_signing',
      'signed_contract',
      'no_location',
      'under_construction',
      'not_yet_open',
      'active',
      'inactive',
      'relocating',
      'breach',
      'for_termination',
      'terminated',
      'closed'
    )),
  order_cadence text
    check (order_cadence is null or order_cadence in (
      'daily',
      '0_2_weeks',
      '1_month',
      '2_months',
      'over_3_months',
      'unknown'
    )),
  last_po_date date,
  contract_status text,
  contract_signed boolean,
  agent_name text,
  viber_added boolean,
  termination_reason text,
  terminated_at date,
  source_sheet text,
  source_row integer,
  notes text,
  updated_at timestamptz not null default now()
);

create unique index if not exists branch_brand_code_unique
  on public.branch (brand_id, branch_code)
  where branch_code is not null;

create unique index if not exists branch_roster_source_unique
  on public.branch (brand_id, source_sheet, source_row)
  where source_sheet is not null and source_row is not null;

create index if not exists branch_brand_id_idx on public.branch(brand_id);
create index if not exists branch_store_status_idx on public.branch(store_status);

create or replace function public.set_branch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_branch_updated_at on public.branch;
create trigger set_branch_updated_at
before update on public.branch
for each row execute function public.set_branch_updated_at();

alter table public.branch enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'barista'
  );
$$;

drop policy if exists "branch read scoped" on public.branch;
create policy "branch read scoped"
on public.branch
for select
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or owner_user_id = auth.uid()
  or id in (select p.branch_id from public.profiles p where p.id = auth.uid())
  or lower(coalesce(franchisee_email, '')) = lower(coalesce((select email from auth.users where id = auth.uid()), ''))
);

drop policy if exists "branch insert hq" on public.branch;
create policy "branch insert hq"
on public.branch
for insert
to authenticated
with check (public.current_user_role() = 'hq_admin');

drop policy if exists "branch update scoped" on public.branch;
create policy "branch update scoped"
on public.branch
for update
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or owner_user_id = auth.uid()
)
with check (
  public.current_user_role() = 'hq_admin'
  or owner_user_id = auth.uid()
);

drop policy if exists "branch delete hq" on public.branch;
create policy "branch delete hq"
on public.branch
for delete
to authenticated
using (public.current_user_role() = 'hq_admin');

-- Service role / migrations can upsert roster rows without RLS friction.
grant select, insert, update, delete on public.brands to authenticated;
grant select, insert, update, delete on public.branch to authenticated;
