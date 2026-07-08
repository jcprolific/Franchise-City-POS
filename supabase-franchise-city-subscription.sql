-- Franchise City POS Subscription — schema for portal, line items, stock movements, support.
-- Run once in Supabase SQL Editor after existing pos_order / branch_inventory setup.

-- Extend pos_order for discounts, voids, refunds
alter table public.pos_order add column if not exists discount_type text;
alter table public.pos_order add column if not exists void_reason text;
alter table public.pos_order add column if not exists voided_by text;
alter table public.pos_order add column if not exists voided_at timestamptz;
alter table public.pos_order add column if not exists refund_amount numeric default 0;
alter table public.pos_order add column if not exists refund_reason text;
alter table public.pos_order add column if not exists refunded_at timestamptz;

-- Line items per POS order
create table if not exists public.pos_order_item (
  id uuid primary key default gen_random_uuid(),
  pos_order_id uuid not null references public.pos_order(id) on delete cascade,
  product_id text,
  product_name text not null,
  variant_name text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pos_order_item_order_idx on public.pos_order_item (pos_order_id);

-- Branch stock movement audit log
create table if not exists public.stock_movement (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  branch_id uuid not null,
  raw_material_id text not null,
  material_name text not null,
  movement_type text not null check (movement_type in ('receive', 'issue', 'adjustment', 'sale')),
  qty_before numeric not null default 0,
  qty_delta numeric not null,
  qty_after numeric not null default 0,
  reason text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movement_branch_idx on public.stock_movement (branch_id, created_at desc);

-- HQ → franchisee portal announcements
create table if not exists public.portal_announcement (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  title text not null,
  body text not null,
  tag text not null default 'update' check (tag in ('policy', 'promo', 'launch', 'campaign', 'update', 'reminder')),
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists portal_announcement_brand_idx on public.portal_announcement (brand_id, published_at desc);

-- Documents: manual, forms, training, resources
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

create index if not exists portal_document_brand_type_idx on public.portal_document (brand_id, doc_type, sort_order);

-- Franchisee support tickets
create table if not exists public.support_ticket (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  branch_id uuid,
  topic text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_by text,
  hq_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_ticket_branch_idx on public.support_ticket (branch_id, created_at desc);

-- System notices (updates, maintenance, security)
create table if not exists public.system_notice (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id),
  title text not null,
  body text not null,
  notice_type text not null check (notice_type in ('update', 'maintenance', 'security')),
  active_from timestamptz not null default now(),
  active_to timestamptz,
  created_at timestamptz not null default now()
);

-- RLS + policies (permissive for app users — tighten per role in production)
alter table public.pos_order_item enable row level security;
alter table public.stock_movement enable row level security;
alter table public.portal_announcement enable row level security;
alter table public.portal_document enable row level security;
alter table public.support_ticket enable row level security;
alter table public.system_notice enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'pos_order_item', 'stock_movement', 'portal_announcement',
    'portal_document', 'support_ticket', 'system_notice'
  ] loop
    execute format('drop policy if exists "%s all for app" on public.%I', t, t);
    execute format(
      'create policy "%s all for app" on public.%I for all to anon, authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- Seed sample portal content for Coftea brand
insert into public.portal_announcement (brand_id, title, body, tag, pinned, published_at)
select
  'a1000000-0000-4000-8000-000000000002',
  v.title, v.body, v.tag, v.pinned, v.published_at::timestamptz
from (values
  ('July 2026 Supply Price Update', 'Fruit series syrups adjust by ₱5–8 per pack starting July 7.', 'update', true, '2026-07-01'),
  ('Summer Duo Promo — July 8–31', 'Buy any 22oz drink + sinker add-on and get ₱20 off. POS promo code: SUMMERDUO.', 'campaign', false, '2026-07-05'),
  ('New Matcha Series Launch', 'Introducing Matcha Milk Tea and Matcha Latte — training video available in Training Materials.', 'launch', false, '2026-07-03'),
  ('Daily Sales Report Reminder', 'Submit end-of-day summary by 10:00 PM if POS sync is offline.', 'reminder', false, '2026-06-28')
) as v(title, body, tag, pinned, published_at)
where not exists (select 1 from public.portal_announcement limit 1);

insert into public.portal_document (brand_id, doc_type, title, description, format, section, sort_order, updated_at)
select
  'a1000000-0000-4000-8000-000000000002',
  v.doc_type, v.title, v.description, v.format, v.section, v.sort_order, v.updated_at::date
from (values
  ('manual', 'Store Opening Checklist', 'Daily opening procedures', 'PDF', 'Opening & Closing', 1, '2026-06-01'),
  ('manual', 'Classic Milk Tea Standards', 'Recipe and prep standards', 'PDF', 'Beverage Preparation', 2, '2026-06-01'),
  ('form', 'Purchase Order Form 2026', 'Official supply order sheet', 'XLSX', null, 1, '2026-06-01'),
  ('form', 'Daily Sales Report', 'Manual EOD when POS sync is offline', 'PDF', null, 2, '2026-05-10'),
  ('training', 'POS Basics: Ring Up & Payment', 'How to use the POS terminal', 'Video', 'Operations', 1, '2026-06-01'),
  ('resource', 'Brand Guidelines', 'Logo usage and store branding', 'PDF', 'Marketing', 1, '2026-06-01')
) as v(doc_type, title, description, format, section, sort_order, updated_at)
where not exists (select 1 from public.portal_document limit 1);
