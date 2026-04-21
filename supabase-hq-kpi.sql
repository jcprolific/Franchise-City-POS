-- HQ KPI SQL contract (Supabase-first backend)
-- Run in Supabase SQL Editor.

create or replace function public.hq_global_kpi(p_tz text default 'Asia/Manila')
returns table (
  today_revenue numeric,
  yesterday_revenue numeric,
  today_orders bigint,
  yesterday_orders bigint,
  avg_order_value numeric,
  active_branches bigint
)
language sql
stable
as $$
  with normalized as (
    select
      coalesce(total_amount, 0)::numeric as total_amount,
      branch_id,
      (timezone(p_tz, created_at))::date as manila_date
    from public.pos_order
    where coalesce(payment_status, 'PAID') = 'PAID'
      and coalesce(status, 'COMPLETED') = 'COMPLETED'
  ),
  day_values as (
    select
      (timezone(p_tz, now()))::date as today_date,
      ((timezone(p_tz, now()))::date - interval '1 day')::date as yesterday_date
  )
  select
    coalesce(sum(case when n.manila_date = d.today_date then n.total_amount else 0 end), 0) as today_revenue,
    coalesce(sum(case when n.manila_date = d.yesterday_date then n.total_amount else 0 end), 0) as yesterday_revenue,
    coalesce(count(*) filter (where n.manila_date = d.today_date), 0)::bigint as today_orders,
    coalesce(count(*) filter (where n.manila_date = d.yesterday_date), 0)::bigint as yesterday_orders,
    coalesce(avg(n.total_amount) filter (where n.manila_date = d.today_date), 0) as avg_order_value,
    coalesce(count(distinct n.branch_id) filter (where n.manila_date = d.today_date), 0)::bigint as active_branches
  from normalized n
  cross join day_values d;
$$;

create or replace function public.hq_weekly_revenue(p_tz text default 'Asia/Manila')
returns table (
  day_label text,
  revenue numeric
)
language sql
stable
as $$
  with days as (
    select
      generate_series(
        (timezone(p_tz, now()))::date - interval '6 days',
        (timezone(p_tz, now()))::date,
        interval '1 day'
      )::date as day_date
  ),
  normalized as (
    select
      coalesce(total_amount, 0)::numeric as total_amount,
      (timezone(p_tz, created_at))::date as manila_date
    from public.pos_order
    where coalesce(payment_status, 'PAID') = 'PAID'
      and coalesce(status, 'COMPLETED') = 'COMPLETED'
  )
  select
    to_char(d.day_date, 'Dy') as day_label,
    coalesce(sum(n.total_amount), 0) as revenue
  from days d
  left join normalized n on n.manila_date = d.day_date
  group by d.day_date
  order by d.day_date;
$$;

grant execute on function public.hq_global_kpi(text) to anon, authenticated;
grant execute on function public.hq_weekly_revenue(text) to anon, authenticated;

