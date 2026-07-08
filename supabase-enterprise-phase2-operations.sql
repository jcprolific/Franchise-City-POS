-- Enterprise Phase 2: Operations (shifts, terminal counters)
-- Excludes promotions engine (deferred).

-- ============================================================
-- Multi-terminal order numbering
-- ============================================================

create table if not exists public.branch_terminal_counter (
  branch_id uuid not null references public.branch(id) on delete cascade,
  terminal_id text not null,
  last_order_number integer not null default 4999,
  updated_at timestamptz not null default now(),
  primary key (branch_id, terminal_id)
);

create index if not exists branch_terminal_counter_branch_idx
  on public.branch_terminal_counter (branch_id);

alter table public.branch_terminal_counter enable row level security;
drop policy if exists "branch_terminal_counter all for app" on public.branch_terminal_counter;
create policy "branch_terminal_counter all for app"
  on public.branch_terminal_counter for all to anon, authenticated using (true) with check (true);

create or replace function public.get_next_pos_order_number(
  p_branch_id uuid,
  p_terminal_id text
)
returns integer
language plpgsql
as $$
declare
  v_next integer;
begin
  insert into public.branch_terminal_counter (branch_id, terminal_id, last_order_number)
  values (p_branch_id, p_terminal_id, 5000)
  on conflict (branch_id, terminal_id)
  do update set
    last_order_number = public.branch_terminal_counter.last_order_number + 1,
    updated_at = now()
  returning last_order_number into v_next;

  return v_next;
end;
$$;

-- ============================================================
-- Shift management
-- ============================================================

create table if not exists public.pos_shift (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branch(id) on delete cascade,
  terminal_id text not null,
  cashier_id text,
  cashier_name text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_cash numeric(12,2) not null default 0,
  closing_cash numeric(12,2),
  expected_cash numeric(12,2),
  cash_variance numeric(12,2),
  total_sales numeric(12,2) not null default 0,
  total_orders integer not null default 0,
  cash_sales numeric(12,2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pos_shift_branch_terminal_idx
  on public.pos_shift (branch_id, terminal_id, opened_at desc);

alter table public.pos_shift enable row level security;
drop policy if exists "pos_shift all for app" on public.pos_shift;
create policy "pos_shift all for app"
  on public.pos_shift for all to anon, authenticated using (true) with check (true);
