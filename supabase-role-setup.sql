-- Run in Supabase SQL editor for COFTEA project.
-- Creates a profiles table used for role-based access in the app.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'cashier' check (role in ('cashier', 'hq_admin')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile metadata" on public.profiles;
create policy "Users can update own profile metadata"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Optional helper to backfill missing profiles.
insert into public.profiles (id, role)
select id, 'cashier'
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- Promote HQ users by email (replace with real HQ emails).
update public.profiles p
set role = 'hq_admin'
from auth.users u
where p.id = u.id
  and lower(u.email) in (
    'hq@coftea.com',
    'admin@coftea.com'
  );
