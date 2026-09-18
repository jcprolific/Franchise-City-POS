-- Add the app-canonical `role` column to public.profiles.
-- The pos-client reads `profiles.role` (see src/lib/permissions.ts -> UserRole)
-- to determine access. Without this column the role query errors and every
-- email login silently defaults to 'barista'.
alter table public.profiles
  add column if not exists role text not null default 'barista';

-- Grant franchise owner (Franchisee) access to the initial account.
update public.profiles
  set role = 'franchise_owner'
  where id = 'ffc8f2c2-4101-4187-9041-7cb4678069ad';
