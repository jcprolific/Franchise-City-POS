-- Two-level franchise ownership: owner accounts + branch staff roles.
-- Run once in Supabase SQL Editor (COFTEA POS project).
-- Depends on: supabase-role-setup.sql, supabase-staff-access-setup.sql,
--             supabase-franchisee-fields.sql, supabase-branch-policy.sql

-- ============================================================
-- 1) Owner ↔ branch binding (one primary owner per branch)
-- ============================================================
alter table if exists public.branch
  add column if not exists owner_user_id uuid references auth.users(id);

create unique index if not exists branch_one_owner
  on public.branch (owner_user_id)
  where owner_user_id is not null;

-- Backfill owner_user_id from existing franchisee_email + profiles links.
update public.branch b
set owner_user_id = p.id
from public.profiles p
join auth.users u on u.id = p.id
where b.owner_user_id is null
  and b.franchisee_email is not null
  and lower(u.email) = lower(b.franchisee_email)
  and p.role in ('franchisee', 'franchise_owner');

-- ============================================================
-- 2) Expand role enums + migrate legacy values
-- ============================================================
update public.profiles set role = 'franchise_owner' where role = 'franchisee';
update public.profiles set role = 'manager' where role = 'branch_manager';
update public.staff_access set role = 'manager' where role = 'branch_manager';

alter table if exists public.profiles
  drop constraint if exists profiles_role_check;

alter table if exists public.profiles
  add constraint profiles_role_check
  check (role in (
    'cashier',
    'manager',
    'supervisor',
    'inventory_staff',
    'franchise_owner',
    'hq_admin'
  ));

alter table if exists public.staff_access
  drop constraint if exists staff_access_role_check;

alter table if exists public.staff_access
  add constraint staff_access_role_check
  check (role in (
    'cashier',
    'manager',
    'supervisor',
    'inventory_staff',
    'hq_admin'
  ));

alter table if exists public.staff_access
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.staff_access
  add column if not exists account_level text not null default 'staff'
  check (account_level in ('owner', 'staff'));

-- ============================================================
-- 3) Owner transfer audit log (HQ-only workflow)
-- ============================================================
create table if not exists public.owner_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branch(id) on delete cascade,
  previous_owner_id uuid references auth.users(id) on delete set null,
  new_owner_email text not null,
  document_refs jsonb default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists owner_transfer_branch_idx
  on public.owner_transfer_requests(branch_id);

-- ============================================================
-- 4) Helper: current user's role
-- ============================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- 5) Row Level Security — profiles (HQ reads all; users read own)
-- ============================================================
drop policy if exists "HQ can read all profiles" on public.profiles;
create policy "HQ can read all profiles"
on public.profiles
for select
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or auth.uid() = id
);

drop policy if exists "Franchise owner reads branch staff profiles" on public.profiles;
create policy "Franchise owner reads branch staff profiles"
on public.profiles
for select
to authenticated
using (
  public.current_user_role() = 'franchise_owner'
  and branch_id in (
    select b.id from public.branch b where b.owner_user_id = auth.uid()
  )
);

-- ============================================================
-- 6) Row Level Security — staff_access
-- ============================================================
drop policy if exists "staff_access read for app users" on public.staff_access;
drop policy if exists "staff_access write for app users" on public.staff_access;

create policy "staff_access read scoped"
on public.staff_access
for select
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or auth_user_id = auth.uid()
  or (
    public.current_user_role() = 'franchise_owner'
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
);

create policy "staff_access insert scoped"
on public.staff_access
for insert
to authenticated
with check (
  public.current_user_role() = 'hq_admin'
  or (
    public.current_user_role() = 'franchise_owner'
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
    and role in ('cashier', 'manager', 'supervisor', 'inventory_staff')
    and account_level = 'staff'
  )
);

create policy "staff_access update scoped"
on public.staff_access
for update
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or (
    public.current_user_role() = 'franchise_owner'
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
)
with check (
  public.current_user_role() = 'hq_admin'
  or (
    public.current_user_role() = 'franchise_owner'
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
    and role in ('cashier', 'manager', 'supervisor', 'inventory_staff')
  )
);

-- ============================================================
-- 7) Row Level Security — branch
-- ============================================================
drop policy if exists "branch read for app users" on public.branch;
drop policy if exists "branch insert for app users" on public.branch;
drop policy if exists "branch update for app users" on public.branch;
drop policy if exists "branch delete for app users" on public.branch;

create policy "branch read scoped"
on public.branch
for select
to authenticated
using (
  public.current_user_role() = 'hq_admin'
  or owner_user_id = auth.uid()
  or id in (select p.branch_id from public.profiles p where p.id = auth.uid())
  or lower(franchisee_email) = lower((select email from auth.users where id = auth.uid()))
);

create policy "branch insert hq"
on public.branch
for insert
to authenticated
with check (public.current_user_role() = 'hq_admin');

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
  or (
    owner_user_id = auth.uid()
  )
);

create policy "branch delete hq"
on public.branch
for delete
to authenticated
using (public.current_user_role() = 'hq_admin');

-- ============================================================
-- 8) Row Level Security — owner_transfer_requests (HQ only)
-- ============================================================
alter table public.owner_transfer_requests enable row level security;

create policy "owner_transfer hq read"
on public.owner_transfer_requests
for select
to authenticated
using (public.current_user_role() = 'hq_admin');

create policy "owner_transfer hq write"
on public.owner_transfer_requests
for all
to authenticated
using (public.current_user_role() = 'hq_admin')
with check (public.current_user_role() = 'hq_admin');
