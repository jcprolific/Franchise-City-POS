import { supabase } from '../../lib/supabase';
import { getManilaIsoDateKey, isSameManilaDate } from '../../lib/timezone';

export interface HqKpiSnapshot {
  todayRevenue: number;
  yesterdayRevenue: number;
  todayOrders: number;
  yesterdayOrders: number;
  avgOrderValue: number;
  activeBranches: number;
}

export interface HqWeeklyRevenueItem {
  day: string;
  revenue: number;
}

interface RpcGlobalKpiRow {
  today_revenue: number | null;
  yesterday_revenue: number | null;
  today_orders: number | null;
  yesterday_orders: number | null;
  avg_order_value: number | null;
  active_branches: number | null;
}

interface RpcWeeklyRevenueRow {
  day_label: string | null;
  revenue: number | null;
}

interface PosOrderRow {
  created_at: string | null;
  total_amount: number | null;
  branch_id: string | null;
  payment_status: string | null;
  status: string | null;
}

function asNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function toDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Manila' });
}

function getRecentManilaDates(days: number) {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dates.push(d);
  }
  return dates;
}

function buildFallbackFromRows(rows: PosOrderRow[]): {
  snapshot: HqKpiSnapshot;
  weeklyRevenue: HqWeeklyRevenueItem[];
} {
  const paidRows = rows.filter((row) => {
    const payment = (row.payment_status ?? 'PAID').toUpperCase();
    const status = (row.status ?? 'COMPLETED').toUpperCase();
    return payment === 'PAID' && status === 'COMPLETED';
  });

  const todayKey = getManilaIsoDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getManilaIsoDateKey(yesterdayDate);

  const todayRows = paidRows.filter((row) => row.created_at && isSameManilaDate(row.created_at, todayKey));
  const yesterdayRows = paidRows.filter(
    (row) => row.created_at && isSameManilaDate(row.created_at, yesterdayKey)
  );

  const todayRevenue = todayRows.reduce((sum, row) => sum + asNumber(row.total_amount), 0);
  const yesterdayRevenue = yesterdayRows.reduce((sum, row) => sum + asNumber(row.total_amount), 0);
  const avgOrderValue = todayRows.length > 0 ? todayRevenue / todayRows.length : 0;
  const activeBranches = new Set(
    todayRows.map((row) => row.branch_id).filter((value): value is string => Boolean(value))
  ).size;

  const dailyRevenueMap = new Map<string, number>();
  for (const d of getRecentManilaDates(7)) {
    dailyRevenueMap.set(getManilaIsoDateKey(d), 0);
  }

  for (const row of paidRows) {
    if (!row.created_at) continue;
    const key = getManilaIsoDateKey(new Date(row.created_at));
    if (!dailyRevenueMap.has(key)) continue;
    dailyRevenueMap.set(key, (dailyRevenueMap.get(key) ?? 0) + asNumber(row.total_amount));
  }

  const weeklyRevenue = getRecentManilaDates(7).map((d) => {
    const key = getManilaIsoDateKey(d);
    return {
      day: toDayLabel(d),
      revenue: dailyRevenueMap.get(key) ?? 0,
    };
  });

  return {
    snapshot: {
      todayRevenue,
      yesterdayRevenue,
      todayOrders: todayRows.length,
      yesterdayOrders: yesterdayRows.length,
      avgOrderValue,
      activeBranches,
    },
    weeklyRevenue,
  };
}

export async function fetchHqKpiData() {
  const globalRpc = await supabase.rpc('hq_global_kpi', { p_tz: 'Asia/Manila' });
  const weeklyRpc = await supabase.rpc('hq_weekly_revenue', { p_tz: 'Asia/Manila' });

  const canUseRpc = !globalRpc.error && !weeklyRpc.error;
  if (canUseRpc) {
    const snapshotRow = ((globalRpc.data as RpcGlobalKpiRow[] | null) ?? [])[0];
    const weeklyRows = (weeklyRpc.data as RpcWeeklyRevenueRow[] | null) ?? [];
    return {
      snapshot: {
        todayRevenue: asNumber(snapshotRow?.today_revenue),
        yesterdayRevenue: asNumber(snapshotRow?.yesterday_revenue),
        todayOrders: asNumber(snapshotRow?.today_orders),
        yesterdayOrders: asNumber(snapshotRow?.yesterday_orders),
        avgOrderValue: asNumber(snapshotRow?.avg_order_value),
        activeBranches: asNumber(snapshotRow?.active_branches),
      },
      weeklyRevenue: weeklyRows.map((row) => ({
        day: row.day_label ?? '--',
        revenue: asNumber(row.revenue),
      })),
      source: 'rpc' as const,
    };
  }

  const { data, error } = await supabase
    .from('pos_order')
    .select('created_at,total_amount,branch_id,payment_status,status')
    .limit(5000);
  if (error) throw error;

  const fallback = buildFallbackFromRows((data as PosOrderRow[] | null) ?? []);
  return {
    snapshot: fallback.snapshot,
    weeklyRevenue: fallback.weeklyRevenue,
    source: 'fallback' as const,
  };
}

