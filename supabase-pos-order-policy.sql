-- Run this in Supabase SQL Editor (same project as POS).
-- Goal: allow POS app (anon/authenticated) to insert/select pos_order rows for realtime dashboard sync.

alter table if exists public.pos_order enable row level security;

-- Read access for dashboard polling/subscription.
drop policy if exists "pos_order read for app users" on public.pos_order;
create policy "pos_order read for app users"
on public.pos_order
for select
to anon, authenticated
using (true);

-- Insert access for POS checkout.
drop policy if exists "pos_order insert for app users" on public.pos_order;
create policy "pos_order insert for app users"
on public.pos_order
for insert
to anon, authenticated
with check (true);

-- Optional: if you want to restrict to authenticated only, replace 'anon, authenticated' with 'authenticated'
-- and ensure your cashier login always creates an authenticated Supabase session.
