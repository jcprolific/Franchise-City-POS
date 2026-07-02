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

-- Update access for order status changes (Orders page workflow + void).
drop policy if exists "pos_order update for app users" on public.pos_order;
create policy "pos_order update for app users"
on public.pos_order
for update
to anon, authenticated
using (true)
with check (true);

-- Optional columns for richer Orders page (safe to run even if already present).
alter table if exists public.pos_order
  add column if not exists order_type text;
