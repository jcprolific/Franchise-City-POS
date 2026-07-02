-- HQ Action Plan / Memo history for franchisee branches
-- Run in Supabase SQL Editor (COFTEA POS project).
-- Depends on: supabase-brands-setup.sql, supabase-branch-policy.sql.

create table if not exists public.branch_action_memos (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid references public.branch(id) on delete set null,
  branch_name text not null,
  franchisee_name text,
  action_plan_type text not null check (action_plan_type in (
    'written_warning',
    'notice_to_explain',
    'performance_improvement_plan'
  )),
  issue_summary text not null,
  violation_details text,
  incident_date date,
  corrective_action text,
  deadline date,
  memo_body text not null,
  issued_by text not null,
  status text not null default 'issued' check (status in ('draft', 'issued')),
  created_at timestamptz not null default now()
);

create index if not exists branch_action_memos_brand_branch_idx
  on public.branch_action_memos (brand_id, branch_name, created_at desc);

create index if not exists branch_action_memos_branch_id_idx
  on public.branch_action_memos (branch_id);

alter table public.branch_action_memos enable row level security;

drop policy if exists "branch_action_memos read for app users" on public.branch_action_memos;
create policy "branch_action_memos read for app users"
on public.branch_action_memos
for select
to anon, authenticated
using (true);

drop policy if exists "branch_action_memos insert for app users" on public.branch_action_memos;
create policy "branch_action_memos insert for app users"
on public.branch_action_memos
for insert
to anon, authenticated
with check (true);

drop policy if exists "branch_action_memos update for app users" on public.branch_action_memos;
create policy "branch_action_memos update for app users"
on public.branch_action_memos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "branch_action_memos delete for app users" on public.branch_action_memos;
create policy "branch_action_memos delete for app users"
on public.branch_action_memos
for delete
to anon, authenticated
using (true);
