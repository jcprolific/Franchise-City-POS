-- Franchisee Portal role support.
-- Run once in the Supabase SQL Editor (project nooqvrikraglddxkxrul).
-- Adds the 'franchisee' role to profiles and shows how to promote a user.

-- 1) Allow the new role (constraint was created inline as profiles_role_check).
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('cashier', 'hq_admin', 'franchisee'));

-- 2) Promote a franchisee user by email.
--    First create the auth user (Supabase Dashboard → Authentication → Add user,
--    email + password), then run this with the real email:
--
-- update public.profiles p
-- set role = 'franchisee'
-- from auth.users u
-- where p.id = u.id
--   and lower(u.email) = lower('owner@example.com');
--
-- If the user has no profiles row yet:
--
-- insert into public.profiles (id, role)
-- select id, 'franchisee' from auth.users
-- where lower(email) = lower('owner@example.com')
-- on conflict (id) do update set role = 'franchisee';

-- 3) Link the branch so the portal greets them by branch name:
--
-- update public.branch
-- set franchisee_email = 'owner@example.com'
-- where name = 'BGC Central';
