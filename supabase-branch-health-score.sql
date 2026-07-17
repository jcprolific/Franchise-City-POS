-- Branch Health Score — foundation tables + snapshot storage.
-- Run in Supabase SQL Editor after pos_order / branch setup.

-- ============================================================
-- Portal foundation (if not yet deployed)
-- ============================================================

create table if not exists public.portal_announcement (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  title text not null,
  body text not null,
  tag text not null default 'update'
    check (tag in ('policy', 'promo', 'launch', 'campaign', 'update', 'reminder')),
  pinned boolean not null default false,
  requires_ack boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.portal_announcement
  add column if not exists requires_ack boolean not null default false;

create index if not exists portal_announcement_brand_idx
  on public.portal_announcement (brand_id, published_at desc);

create table if not exists public.portal_document (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  doc_type text not null check (doc_type in ('manual', 'form', 'training', 'resource')),
  title text not null,
  description text,
  file_url text,
  format text default 'PDF',
  section text,
  sort_order integer not null default 0,
  updated_at date,
  created_at timestamptz not null default now()
);

create index if not exists portal_document_brand_type_idx
  on public.portal_document (brand_id, doc_type, sort_order);

-- ============================================================
-- Supply orders
-- ============================================================

create table if not exists public.supply_order (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  reference_no text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  item_count integer not null default 0,
  total_amount numeric not null default 0,
  notes text,
  placed_by text,
  payment_method text check (payment_method in ('gcash', 'bank_transfer')),
  promised_delivery_date date,
  created_at timestamptz not null default now()
);

create index if not exists supply_order_brand_idx on public.supply_order (brand_id, created_at desc);
create index if not exists supply_order_branch_idx on public.supply_order (branch_id, created_at desc);

create table if not exists public.supply_order_item (
  id uuid primary key default gen_random_uuid(),
  supply_order_id uuid not null references public.supply_order(id) on delete cascade,
  raw_material_id text,
  name text not null,
  packaging text,
  unit text,
  unit_price numeric not null default 0,
  quantity numeric not null default 0,
  line_total numeric not null default 0
);

create index if not exists supply_order_item_order_idx on public.supply_order_item (supply_order_id);

-- ============================================================
-- EOD reports
-- ============================================================

create table if not exists public.branch_daily_report (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branch(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  report_date date not null,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  total_sales numeric not null default 0,
  submitted_by text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (branch_id, report_date)
);

create index if not exists branch_daily_report_branch_date_idx
  on public.branch_daily_report (branch_id, report_date desc);

-- ============================================================
-- Compliance tracking
-- ============================================================

create table if not exists public.branch_compliance_task (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid references public.branch(id) on delete cascade,
  category text not null check (category in (
    'training', 'marketing', 'store_updates', 'inventory', 'ordering'
  )),
  title text not null,
  description text,
  due_date date,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists branch_compliance_task_brand_idx
  on public.branch_compliance_task (brand_id, due_date);

create table if not exists public.branch_compliance_ack (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  ref_type text not null check (ref_type in ('announcement', 'task', 'document')),
  ref_id uuid not null,
  acknowledged_by text,
  evidence_url text,
  acknowledged_at timestamptz not null default now(),
  unique (branch_id, ref_type, ref_id)
);

create index if not exists branch_compliance_ack_branch_idx
  on public.branch_compliance_ack (branch_id, acknowledged_at desc);

create table if not exists public.training_assignment (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid references public.branch(id) on delete cascade,
  document_id uuid references public.portal_document(id) on delete cascade,
  title text not null,
  required boolean not null default true,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists training_assignment_brand_idx
  on public.training_assignment (brand_id, branch_id);

create table if not exists public.training_completion (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  assignment_id uuid references public.training_assignment(id) on delete cascade,
  document_id uuid references public.portal_document(id) on delete set null,
  completed_by text,
  completed_at timestamptz not null default now(),
  unique (branch_id, assignment_id)
);

create index if not exists training_completion_branch_idx
  on public.training_completion (branch_id, completed_at desc);

create table if not exists public.inventory_cycle_count (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  branch_id uuid not null references public.branch(id) on delete cascade,
  count_date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'submitted', 'reviewed')),
  submitted_by text,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists inventory_cycle_count_branch_idx
  on public.inventory_cycle_count (branch_id, count_date desc);

create table if not exists public.inventory_cycle_count_line (
  id uuid primary key default gen_random_uuid(),
  cycle_count_id uuid not null references public.inventory_cycle_count(id) on delete cascade,
  raw_material_id text not null,
  material_name text not null,
  system_qty numeric not null default 0,
  counted_qty numeric not null default 0
);

create index if not exists inventory_cycle_count_line_count_idx
  on public.inventory_cycle_count_line (cycle_count_id);

-- ============================================================
-- Health score config + snapshots
-- ============================================================

create table if not exists public.branch_health_config (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  weights jsonb not null default '{
    "sales_growth": 0.25,
    "pos_usage": 0.15,
    "inventory_accuracy": 0.15,
    "ordering_compliance": 0.15,
    "training_completion": 0.10,
    "marketing_compliance": 0.10,
    "store_updates": 0.10
  }'::jsonb,
  low_score_threshold numeric not null default 60,
  updated_at timestamptz not null default now()
);

create table if not exists public.branch_health_snapshot (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branch(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  sales_growth_score numeric not null default 0,
  pos_usage_score numeric not null default 0,
  inventory_accuracy_score numeric not null default 0,
  ordering_compliance_score numeric not null default 0,
  training_completion_score numeric not null default 0,
  marketing_compliance_score numeric not null default 0,
  store_updates_score numeric not null default 0,
  composite_score numeric not null default 0,
  computed_at timestamptz not null default now(),
  unique (branch_id, period_start, period_end)
);

create index if not exists branch_health_snapshot_brand_idx
  on public.branch_health_snapshot (brand_id, period_end desc, composite_score desc);

-- ============================================================
-- RLS (permissive for app — tighten in production)
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'portal_announcement', 'portal_document', 'supply_order', 'supply_order_item',
    'branch_daily_report', 'branch_compliance_task', 'branch_compliance_ack',
    'training_assignment', 'training_completion',
    'inventory_cycle_count', 'inventory_cycle_count_line',
    'branch_health_config', 'branch_health_snapshot'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s all for app" on public.%I', t, t);
    execute format(
      'create policy "%s all for app" on public.%I for all to anon, authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;
