-- HQ "Branches to Check" watchlist — manual + tracked branch attention items
-- with a status workflow (open -> in_progress -> resolved).
-- Run in Supabase SQL Editor (COFTEA POS project).
-- Depends on: supabase-brands-setup.sql, supabase-branch-policy.sql.

create table if not exists public.branch_watch_items (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid references public.branch(id) on delete set null,
  branch_name text not null,
  issue text not null,
  flag text not null default 'needs_attention' check (flag in ('offline', 'needs_attention')),
  workflow_status text not null default 'open' check (workflow_status in ('open', 'in_progress', 'resolved')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists branch_watch_items_brand_status_idx
  on public.branch_watch_items (brand_id, workflow_status, created_at desc);

create index if not exists branch_watch_items_branch_id_idx
  on public.branch_watch_items (branch_id);

create or replace function public.set_branch_watch_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.workflow_status = 'resolved' and (old.workflow_status is distinct from 'resolved') then
    new.resolved_at = now();
  elsif new.workflow_status <> 'resolved' then
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_branch_watch_items_updated_at on public.branch_watch_items;
create trigger set_branch_watch_items_updated_at
before update on public.branch_watch_items
for each row execute function public.set_branch_watch_items_updated_at();

alter table public.branch_watch_items enable row level security;

drop policy if exists "branch_watch_items read for app users" on public.branch_watch_items;
create policy "branch_watch_items read for app users"
on public.branch_watch_items
for select
to anon, authenticated
using (true);

drop policy if exists "branch_watch_items insert for app users" on public.branch_watch_items;
create policy "branch_watch_items insert for app users"
on public.branch_watch_items
for insert
to anon, authenticated
with check (true);

drop policy if exists "branch_watch_items update for app users" on public.branch_watch_items;
create policy "branch_watch_items update for app users"
on public.branch_watch_items
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "branch_watch_items delete for app users" on public.branch_watch_items;
create policy "branch_watch_items delete for app users"
on public.branch_watch_items
for delete
to anon, authenticated
using (true);
