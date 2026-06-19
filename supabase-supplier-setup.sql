-- Supplier directory setup for COFTEA POS HQ
-- Run in Supabase SQL Editor (same project as POS).

create table if not exists public.supplier (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_brand_idx on public.supplier(brand_id);
create index if not exists supplier_name_idx on public.supplier(name);

create or replace function public.set_supplier_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_supplier_updated_at on public.supplier;
create trigger set_supplier_updated_at
before update on public.supplier
for each row execute function public.set_supplier_updated_at();

alter table public.supplier enable row level security;

drop policy if exists "supplier read for app users" on public.supplier;
create policy "supplier read for app users"
on public.supplier
for select
to anon, authenticated
using (true);

drop policy if exists "supplier insert for app users" on public.supplier;
create policy "supplier insert for app users"
on public.supplier
for insert
to anon, authenticated
with check (true);

drop policy if exists "supplier update for app users" on public.supplier;
create policy "supplier update for app users"
on public.supplier
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "supplier delete for app users" on public.supplier;
create policy "supplier delete for app users"
on public.supplier
for delete
to anon, authenticated
using (true);
