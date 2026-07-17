-- Digital EOD Form — extend branch_daily_report with detailed report payload.
-- Run in Supabase SQL Editor after supabase-branch-health-score.sql.

alter table public.branch_daily_report
  add column if not exists report_data jsonb,
  add column if not exists drinks_subtotal numeric not null default 0,
  add column if not exists addons_total numeric not null default 0,
  add column if not exists expenses_total numeric not null default 0,
  add column if not exists total_net_sales numeric not null default 0,
  add column if not exists gcash_payment numeric not null default 0,
  add column if not exists cash_on_hand numeric not null default 0,
  add column if not exists yesterday_balance numeric not null default 0,
  add column if not exists total_cash_on_hand numeric not null default 0,
  add column if not exists total_cups_sold integer not null default 0,
  add column if not exists pos_total_sales numeric,
  add column if not exists notes text;

create index if not exists branch_daily_report_brand_date_idx
  on public.branch_daily_report (brand_id, report_date desc);

create index if not exists branch_daily_report_status_idx
  on public.branch_daily_report (brand_id, status, report_date desc);
