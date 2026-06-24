-- Franchise City landing page: public franchisee inquiry capture.
-- Run in Supabase SQL Editor (Franchise-City-POS project).

create table if not exists public.franchise_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text not null,
  interested_brand text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed')),
  source text not null default 'landing'
);

alter table public.franchise_inquiries enable row level security;

-- Public landing form may INSERT only, and only as a fresh 'new' lead.
drop policy if exists "anon can submit inquiry" on public.franchise_inquiries;
create policy "anon can submit inquiry"
  on public.franchise_inquiries
  for insert
  to anon
  with check (status = 'new' and source = 'landing');

-- No anon SELECT/UPDATE/DELETE policies: reads are for authenticated/HQ only.
