-- Staff Access setup for COFTEA POS platform
-- Run in Supabase SQL Editor (same project as POS).
-- Goal: HQ-managed roster of franchisee POS users, scoped by brand + branch.

-- ============================================================
-- profiles.role: allow franchisee POS roles in addition to hq_admin
-- ============================================================
-- The original check constraint only allowed ('cashier','hq_admin').
-- Extend it to include 'branch_manager' so HQ can assign branch leads.

alter table if exists public.profiles
  drop constraint if exists profiles_role_check;

alter table if exists public.profiles
  add constraint profiles_role_check
  check (role in ('cashier', 'branch_manager', 'hq_admin'));

-- ============================================================
-- staff_access: HQ-managed directory row per POS user
-- ============================================================
create table if not exists public.staff_access (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid references public.branch(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'cashier'
    check (role in ('cashier', 'branch_manager', 'hq_admin')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, email)
);

create index if not exists staff_access_brand_idx on public.staff_access(brand_id);
create index if not exists staff_access_branch_idx on public.staff_access(branch_id);
create index if not exists staff_access_auth_user_idx on public.staff_access(auth_user_id);

create or replace function public.set_staff_access_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_staff_access_updated_at on public.staff_access;
create trigger set_staff_access_updated_at
before update on public.staff_access
for each row execute function public.set_staff_access_updated_at();

-- ============================================================
-- Row Level Security
-- Demo: open to app users (matches existing branch/supplier/catalog tables).
-- PRODUCTION NOTE: restrict writes to HQ admins, e.g.
--   using (exists (select 1 from public.profiles p
--     where p.id = auth.uid() and p.role = 'hq_admin'))
-- ============================================================
alter table public.staff_access enable row level security;

drop policy if exists "staff_access read for app users" on public.staff_access;
create policy "staff_access read for app users"
on public.staff_access
for select
to anon, authenticated
using (true);

drop policy if exists "staff_access write for app users" on public.staff_access;
create policy "staff_access write for app users"
on public.staff_access
for all
to anon, authenticated
using (true)
with check (true);
