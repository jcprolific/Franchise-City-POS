-- Expand branch.onboarding_status options for the franchisee onboarding pipeline.
-- Run in Supabase SQL Editor (COFTEA POS project) after supabase-franchisee-fields.sql.

alter table if exists public.branch
  drop constraint if exists branch_onboarding_status_check;

alter table if exists public.branch
  add constraint branch_onboarding_status_check
  check (onboarding_status in (
    'signed_contract',
    'under_construction',
    'for_training_schedule',
    'onboarding',
    'active',
    'suspended'
  ));
