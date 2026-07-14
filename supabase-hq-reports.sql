-- HQ Reports & Analytics RPC contract (Supabase-first backend).
-- Run in Supabase SQL Editor after supabase-hq-kpi.sql and
-- supabase-branch-inventory-setup.sql.
--
-- All sales functions aggregate public.pos_order with the same filters used by
-- Option A: payment_status = 'PAID', status NOT IN (VOIDED, REFUNDED).
-- Date bounds (p_start, p_end) are inclusive and evaluated in the requested
-- timezone (Asia/Manila by default). p_branch_id is optional; null = whole brand.

-- ============================================================
-- Executive summary (current period vs prior period of equal length)
-- ============================================================
create or replace function public.hq_reports_summary(
  p_brand_id uuid,
  p_start date,
  p_end date,
  p_branch_id uuid default null,
  p_tz text default 'Asia/Manila'
)
returns table (
  revenue numeric,
  orders bigint,
  avg_order_value numeric,
  active_branches bigint,
  low_stock_branches bigint,
  prev_revenue numeric,
  prev_orders bigint
)
language sql
stable
as $$
  with bounds as (
    select
      p_start as cur_start,
      p_end as cur_end,
      (p_start - ((p_end - p_start) + 1))::date as prev_start,
      (p_start - 1)::date as prev_end
  ),
  normalized as (
    select
      coalesce(o.total_amount, 0)::numeric as total_amount,
      o.branch_id,
      (timezone(p_tz, o.created_at))::date as manila_date
    from public.pos_order o
    where coalesce(o.payment_status, 'PAID') = 'PAID'
      and upper(coalesce(o.status, 'NEW')) not in ('VOIDED', 'REFUNDED')
      and o.brand_id = p_brand_id
      and (p_branch_id is null or o.branch_id = p_branch_id)
  ),
  cur as (
    select
      coalesce(sum(n.total_amount), 0) as revenue,
      count(*)::bigint as orders,
      coalesce(avg(n.total_amount), 0) as aov,
      count(distinct n.branch_id)::bigint as active_branches
    from normalized n, bounds b
    where n.manila_date between b.cur_start and b.cur_end
  ),
  prev as (
    select
      coalesce(sum(n.total_amount), 0) as revenue,
      count(*)::bigint as orders
    from normalized n, bounds b
    where n.manila_date between b.prev_start and b.prev_end
  ),
  low_stock as (
    select count(distinct bi.branch_id)::bigint as branches
    from public.branch_inventory bi
    where bi.brand_id = p_brand_id
      and (p_branch_id is null or bi.branch_id = p_branch_id)
      and bi.on_hand_qty <= bi.low_stock_qty
  )
  select
    cur.revenue,
    cur.orders,
    cur.aov,
    cur.active_branches,
    low_stock.branches as low_stock_branches,
    prev.revenue as prev_revenue,
    prev.orders as prev_orders
  from cur, prev, low_stock;
$$;

-- ============================================================
-- Revenue trend (one bucket per day across the selected range)
-- ============================================================
create or replace function public.hq_revenue_trend(
  p_brand_id uuid,
  p_start date,
  p_end date,
  p_branch_id uuid default null,
  p_tz text default 'Asia/Manila'
)
returns table (
  day_date date,
  day_label text,
  revenue numeric,
  orders bigint
)
language sql
stable
as $$
  with days as (
    select generate_series(p_start, p_end, interval '1 day')::date as day_date
  ),
  normalized as (
    select
      coalesce(o.total_amount, 0)::numeric as total_amount,
      (timezone(p_tz, o.created_at))::date as manila_date
    from public.pos_order o
    where coalesce(o.payment_status, 'PAID') = 'PAID'
      and upper(coalesce(o.status, 'NEW')) not in ('VOIDED', 'REFUNDED')
      and o.brand_id = p_brand_id
      and (p_branch_id is null or o.branch_id = p_branch_id)
  )
  select
    d.day_date,
    to_char(d.day_date, 'Mon DD') as day_label,
    coalesce(sum(n.total_amount), 0) as revenue,
    coalesce(count(n.*), 0)::bigint as orders
  from days d
  left join normalized n on n.manila_date = d.day_date
  group by d.day_date
  order by d.day_date;
$$;

-- ============================================================
-- Franchisee sales ranking (every branch in the brand, sales joined in)
-- ============================================================
create or replace function public.hq_branch_sales_ranking(
  p_brand_id uuid,
  p_start date,
  p_end date,
  p_branch_id uuid default null,
  p_tz text default 'Asia/Manila'
)
returns table (
  branch_id uuid,
  branch_name text,
  franchisee_name text,
  revenue numeric,
  orders bigint,
  avg_order_value numeric,
  is_active boolean
)
language sql
stable
as $$
  with sales as (
    select
      o.branch_id,
      coalesce(sum(coalesce(o.total_amount, 0)), 0)::numeric as revenue,
      count(*)::bigint as orders,
      coalesce(avg(coalesce(o.total_amount, 0)), 0)::numeric as aov
    from public.pos_order o
    where coalesce(o.payment_status, 'PAID') = 'PAID'
      and upper(coalesce(o.status, 'NEW')) not in ('VOIDED', 'REFUNDED')
      and o.brand_id = p_brand_id
      and (timezone(p_tz, o.created_at))::date between p_start and p_end
    group by o.branch_id
  )
  select
    b.id as branch_id,
    b.name as branch_name,
    b.franchisee_name,
    coalesce(s.revenue, 0) as revenue,
    coalesce(s.orders, 0) as orders,
    coalesce(s.aov, 0) as avg_order_value,
    coalesce(b.is_active, true) as is_active
  from public.branch b
  left join sales s on s.branch_id = b.id
  where b.brand_id = p_brand_id
    and (p_branch_id is null or b.id = p_branch_id)
  order by coalesce(s.revenue, 0) desc, b.name asc;
$$;

-- ============================================================
-- Payment method mix
-- ============================================================
create or replace function public.hq_payment_mix(
  p_brand_id uuid,
  p_start date,
  p_end date,
  p_branch_id uuid default null,
  p_tz text default 'Asia/Manila'
)
returns table (
  method text,
  orders bigint,
  amount numeric
)
language sql
stable
as $$
  select
    upper(coalesce(nullif(trim(o.payment_method), ''), 'CASH')) as method,
    count(*)::bigint as orders,
    coalesce(sum(coalesce(o.total_amount, 0)), 0)::numeric as amount
  from public.pos_order o
  where coalesce(o.payment_status, 'PAID') = 'PAID'
    and upper(coalesce(o.status, 'NEW')) not in ('VOIDED', 'REFUNDED')
    and o.brand_id = p_brand_id
    and (p_branch_id is null or o.branch_id = p_branch_id)
    and (timezone(p_tz, o.created_at))::date between p_start and p_end
  group by 1
  order by amount desc;
$$;

-- ============================================================
-- Branch inventory status (per franchisee stock counts + level)
-- ============================================================
create or replace function public.hq_branch_inventory_status(
  p_brand_id uuid,
  p_branch_id uuid default null
)
returns table (
  branch_id uuid,
  branch_name text,
  material_name text,
  unit text,
  on_hand_qty numeric,
  low_stock_qty numeric,
  level text
)
language sql
stable
as $$
  select
    b.id as branch_id,
    b.name as branch_name,
    rm.name as material_name,
    rm.unit,
    bi.on_hand_qty,
    bi.low_stock_qty,
    case
      when bi.on_hand_qty <= 0 then 'critical'
      when bi.on_hand_qty <= bi.low_stock_qty then 'warn'
      else 'ok'
    end as level
  from public.branch_inventory bi
  join public.branch b on b.id = bi.branch_id
  join public.raw_material rm on rm.id = bi.raw_material_id
  where bi.brand_id = p_brand_id
    and (p_branch_id is null or bi.branch_id = p_branch_id)
  order by
    case
      when bi.on_hand_qty <= 0 then 0
      when bi.on_hand_qty <= bi.low_stock_qty then 1
      else 2
    end,
    b.name asc,
    rm.name asc;
$$;

-- ============================================================
-- Grants
-- ============================================================
grant execute on function public.hq_reports_summary(uuid, date, date, uuid, text) to anon, authenticated;
grant execute on function public.hq_revenue_trend(uuid, date, date, uuid, text) to anon, authenticated;
grant execute on function public.hq_branch_sales_ranking(uuid, date, date, uuid, text) to anon, authenticated;
grant execute on function public.hq_payment_mix(uuid, date, date, uuid, text) to anon, authenticated;
grant execute on function public.hq_branch_inventory_status(uuid, uuid) to anon, authenticated;
