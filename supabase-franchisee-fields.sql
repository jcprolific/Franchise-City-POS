-- Franchisee registration fields for the branch table.
-- Run in Supabase SQL Editor (COFTEA POS project) after supabase-branch-policy.sql.
-- All columns are nullable so existing branch/demo data keeps working.

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
  add column if not exists onboarding_status text
    default 'onboarding'
    check (onboarding_status in (
      'signed_contract',
      'under_construction',
      'for_training_schedule',
      'onboarding',
      'active',
      'suspended'
    ));

-- Optional: unique branch code per brand when a code is provided.
create unique index if not exists branch_brand_code_unique
  on public.branch (brand_id, branch_code)
  where branch_code is not null;
