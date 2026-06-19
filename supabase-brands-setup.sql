-- Multi-brand setup for COFTEA POS platform
-- Run in Supabase SQL Editor.

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

-- Optional: tag existing tables with brand scope when present.
alter table if exists public.branch
  add column if not exists brand_id uuid references public.brands(id);

alter table if exists public.pos_order
  add column if not exists brand_id uuid references public.brands(id);

alter table if exists public.pos_order
  add column if not exists brand_name text;

alter table if exists public.supplier
  add column if not exists brand_id uuid references public.brands(id);

-- Assign Coftea HQ users to Coftea brand.
update public.profiles p
set brand_id = 'a1000000-0000-4000-8000-000000000002'
from auth.users u
where p.id = u.id
  and lower(u.email) in (
    'hq@coftea.com',
    'admin@coftea.com'
  );

-- Default remaining users without brand to Potato Corner.
update public.profiles
set brand_id = 'a1000000-0000-4000-8000-000000000001'
where brand_id is null;

-- Allow users to read their assigned brand.
drop policy if exists "Users can read assigned brand" on public.brands;
create policy "Users can read assigned brand"
on public.brands
for select
to authenticated
using (
  id in (
    select brand_id from public.profiles where id = auth.uid()
  )
);

-- Extend profile read to include brand_id (existing policy already allows own row).
