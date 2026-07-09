-- Enterprise Phase 3: Franchisee portal roles (franchise_owner + barista)
-- Run via Supabase migration or SQL Editor on the COFTEA POS project.
--
-- Role model (franchisee side):
--   franchise_owner — full franchisee portal + all branch operations
--   barista         — POS and Orders only (no portal, dashboard, inventory)
--
-- Depends on: enterprise phase 1/2, franchisee-fields, franchise-ownership (if present)

-- ============================================================
-- 1) Canonical role enums
-- ============================================================

-- Migrate legacy cashier → barista before tightening constraints
update public.profiles set role = 'barista' where role = 'cashier';
update public.staff_access set role = 'barista' where role = 'cashier';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'hq_admin',
    'franchise_owner',
    'barista',
    -- legacy values kept for backward compatibility during transition
    'cashier',
    'manager',
    'supervisor',
    'inventory_staff',
    'branch_manager',
    'franchisee'
  ));

alter table public.staff_access
  drop constraint if exists staff_access_role_check;

alter table public.staff_access
  add constraint staff_access_role_check
  check (role in (
    'hq_admin',
    'barista',
    'cashier',
    'manager',
    'supervisor',
    'inventory_staff',
    'branch_manager'
  ));

-- ============================================================
-- 2) Franchisee fields + owner binding (idempotent)
-- ============================================================

alter table if exists public.branch
  add column if not exists branch_code text,
  add column if not exists franchisee_name text,
  add column if not exists franchisee_phone text,
  add column if not exists franchisee_email text,
  add column if not exists business_name text,
  add column if not exists city text,
  add column if not exists opening_date date,
  add column if not exists contract_start_date date,
  add column if not exists franchise_package text,
  add column if not exists onboarding_status text,
  add column if not exists owner_user_id uuid references auth.users(id);

create unique index if not exists branch_one_owner
  on public.branch (owner_user_id)
  where owner_user_id is not null;

create unique index if not exists branch_brand_code_unique
  on public.branch (brand_id, branch_code)
  where branch_code is not null;

alter table if exists public.staff_access
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table if exists public.staff_access
  add column if not exists account_level text not null default 'staff'
  check (account_level in ('owner', 'staff'));

-- ============================================================
-- 3) Helper functions
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

create or replace function public.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_hq_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'hq_admin', false);
$$;

create or replace function public.is_franchise_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'franchise_owner', false);
$$;

create or replace function public.is_barista()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('barista', 'cashier'),
    false
  );
$$;

-- ============================================================
-- 4) Owner transfer requests (HQ workflow)
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
-- 5) Row Level Security — profiles
-- ============================================================

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile metadata" on public.profiles;
drop policy if exists "HQ can read all profiles" on public.profiles;
drop policy if exists "Franchise owner reads branch staff profiles" on public.profiles;

create policy "profiles read scoped"
on public.profiles
for select
to authenticated
using (
  public.is_hq_admin()
  or auth.uid() = id
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
);

create policy "profiles update own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- ============================================================
-- 6) Row Level Security — staff_access
-- ============================================================

alter table public.staff_access enable row level security;

drop policy if exists "staff_access read for app users" on public.staff_access;
drop policy if exists "staff_access write for app users" on public.staff_access;
drop policy if exists "staff_access read scoped" on public.staff_access;
drop policy if exists "staff_access insert scoped" on public.staff_access;
drop policy if exists "staff_access update scoped" on public.staff_access;

create policy "staff_access read scoped"
on public.staff_access
for select
to authenticated
using (
  public.is_hq_admin()
  or auth_user_id = auth.uid()
  or (
    public.is_franchise_owner()
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
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
    and role = 'barista'
    and account_level = 'staff'
  )
);

create policy "staff_access update scoped"
on public.staff_access
for update
to authenticated
using (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
)
with check (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
    and role = 'barista'
  )
);

-- ============================================================
-- 7) Row Level Security — branch
-- ============================================================

alter table public.branch enable row level security;

drop policy if exists "Enable read access for all authenticated users" on public.branch;
drop policy if exists "branch read for app users" on public.branch;
drop policy if exists "branch insert for app users" on public.branch;
drop policy if exists "branch update for app users" on public.branch;
drop policy if exists "branch delete for app users" on public.branch;
drop policy if exists "branch read scoped" on public.branch;
drop policy if exists "branch insert hq" on public.branch;
drop policy if exists "branch update scoped" on public.branch;
drop policy if exists "branch delete hq" on public.branch;

create policy "branch read scoped"
on public.branch
for select
to authenticated
using (
  public.is_hq_admin()
  or owner_user_id = auth.uid()
  or id = public.current_user_branch_id()
  or lower(franchisee_email) = lower((select email from auth.users where id = auth.uid()))
);

create policy "branch insert hq"
on public.branch
for insert
to authenticated
with check (public.is_hq_admin());

create policy "branch update scoped"
on public.branch
for update
to authenticated
using (
  public.is_hq_admin()
  or owner_user_id = auth.uid()
)
with check (
  public.is_hq_admin()
  or owner_user_id = auth.uid()
);

create policy "branch delete hq"
on public.branch
for delete
to authenticated
using (public.is_hq_admin());

-- Anon read for guest/PIN POS demo (unchanged behavior)
drop policy if exists "branch read anon" on public.branch;
create policy "branch read anon"
on public.branch
for select
to anon
using (true);

-- ============================================================
-- 8) Row Level Security — pos_order (barista branch-scoped)
-- ============================================================

alter table public.pos_order enable row level security;

drop policy if exists "pos_order read for app users" on public.pos_order;
drop policy if exists "pos_order insert for app users" on public.pos_order;
drop policy if exists "pos_order update for app users" on public.pos_order;
drop policy if exists "pos_order read scoped" on public.pos_order;
drop policy if exists "pos_order insert scoped" on public.pos_order;
drop policy if exists "pos_order update scoped" on public.pos_order;

create policy "pos_order read scoped"
on public.pos_order
for select
to authenticated
using (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
);

create policy "pos_order insert scoped"
on public.pos_order
for insert
to authenticated
with check (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
);

create policy "pos_order update scoped"
on public.pos_order
for update
to authenticated
using (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
)
with check (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
);

-- Guest/PIN offline demo: anon can still write orders
drop policy if exists "pos_order read anon" on public.pos_order;
drop policy if exists "pos_order insert anon" on public.pos_order;
drop policy if exists "pos_order update anon" on public.pos_order;

create policy "pos_order read anon"
on public.pos_order for select to anon using (true);

create policy "pos_order insert anon"
on public.pos_order for insert to anon with check (true);

create policy "pos_order update anon"
on public.pos_order for update to anon using (true) with check (true);

-- ============================================================
-- 9) Row Level Security — pos_shift (barista branch-scoped)
-- ============================================================

alter table public.pos_shift enable row level security;

drop policy if exists "pos_shift read scoped" on public.pos_shift;
drop policy if exists "pos_shift insert scoped" on public.pos_shift;
drop policy if exists "pos_shift update scoped" on public.pos_shift;
drop policy if exists "pos_shift read anon" on public.pos_shift;
drop policy if exists "pos_shift insert anon" on public.pos_shift;
drop policy if exists "pos_shift update anon" on public.pos_shift;

create policy "pos_shift read scoped"
on public.pos_shift
for select
to authenticated
using (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
);

create policy "pos_shift insert scoped"
on public.pos_shift
for insert
to authenticated
with check (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
);

create policy "pos_shift update scoped"
on public.pos_shift
for update
to authenticated
using (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
)
with check (
  public.is_hq_admin()
  or (
    public.is_franchise_owner()
    and branch_id in (
      select b.id from public.branch b where b.owner_user_id = auth.uid()
    )
  )
  or (
    public.is_barista()
    and branch_id = public.current_user_branch_id()
  )
);

create policy "pos_shift read anon"
on public.pos_shift for select to anon using (true);

create policy "pos_shift insert anon"
on public.pos_shift for insert to anon with check (true);

create policy "pos_shift update anon"
on public.pos_shift for update to anon using (true) with check (true);

-- ============================================================
-- 10) Owner transfer RLS (HQ only)
-- ============================================================

alter table public.owner_transfer_requests enable row level security;

drop policy if exists "owner_transfer hq read" on public.owner_transfer_requests;
drop policy if exists "owner_transfer hq write" on public.owner_transfer_requests;

create policy "owner_transfer hq read"
on public.owner_transfer_requests
for select
to authenticated
using (public.is_hq_admin());

create policy "owner_transfer hq write"
on public.owner_transfer_requests
for all
to authenticated
using (public.is_hq_admin())
with check (public.is_hq_admin());
