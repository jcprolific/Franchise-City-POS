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

