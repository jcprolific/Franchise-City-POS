-- Branch table RLS policies for HQ management
-- Run this in Supabase SQL Editor (COFTEA POS project).

alter table if exists public.branch enable row level security;

drop policy if exists "branch read for app users" on public.branch;
create policy "branch read for app users"
on public.branch
for select
to anon, authenticated
using (true);

drop policy if exists "branch insert for app users" on public.branch;
create policy "branch insert for app users"
on public.branch
for insert
to anon, authenticated
with check (true);

drop policy if exists "branch update for app users" on public.branch;
create policy "branch update for app users"
on public.branch
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "branch delete for app users" on public.branch;
create policy "branch delete for app users"
on public.branch
for delete
to anon, authenticated
using (true);

