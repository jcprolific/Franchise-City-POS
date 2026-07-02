-- Supplier payables columns for COFTEA POS HQ
-- Run in Supabase SQL Editor if you already created public.supplier
-- before payables tracking was added.

alter table public.supplier
  add column if not exists outstanding_balance numeric(12,2) not null default 0;

alter table public.supplier
  add column if not exists credit_terms text;
