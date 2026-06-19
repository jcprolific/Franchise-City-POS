import { supabase } from '../../lib/supabase';
import { getManilaIsoDateKey } from '../../lib/timezone';

export type ReportDateRange = 'today' | '7d' | '30d' | 'custom';

export interface ReportsFilters {
  range: ReportDateRange;
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReportsSummary {
  revenue: number;
  orders: number;
  avgOrderValue: number;
  activeBranches: number;
  lowStockBranches: number;
  prevRevenue: number;
  prevOrders: number;
}

export interface RevenueTrendItem {
  label: string;
  revenue: number;
  orders: number;
}

export interface BranchSalesRow {
  branchId: string;
  branchName: string;
  franchiseeName: string | null;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  isActive: boolean;
}

export interface PaymentMixItem {
  method: string;
  orders: number;
  amount: number;
}

export type InventoryLevel = 'ok' | 'warn' | 'critical';

export interface BranchInventoryRow {
  branchId: string;
  branchName: string;
  materialName: string;
  unit: string;
  onHandQty: number;
  lowStockQty: number;
  level: InventoryLevel;
}

export interface ReportsSnapshot {
  summary: ReportsSummary;
  revenueTrend: RevenueTrendItem[];
  branchRanking: BranchSalesRow[];
  paymentMix: PaymentMixItem[];
  inventoryStatus: BranchInventoryRow[];
}

export interface ReportsData extends ReportsSnapshot {
  source: 'rpc' | 'fallback';
}

interface ResolvedRange {
  start: string;
  end: string;
  prevStart: string;
}

const TZ = 'Asia/Manila';

const EMPTY_SUMMARY: ReportsSummary = {
  revenue: 0,
  orders: 0,
  avgOrderValue: 0,
  activeBranches: 0,
  lowStockBranches: 0,
  prevRevenue: 0,
  prevOrders: 0,
};

function asNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function manilaDateKeyOffset(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getManilaIsoDateKey(d);
}

function dayCountBetween(start: string, end: string) {
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((endMs - startMs) / 86400000)) + 1;
}

function shiftDateKey(key: string, deltaDays: number) {
  const ms = new Date(`${key}T00:00:00Z`).getTime() + deltaDays * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function resolveRange(filters: ReportsFilters): ResolvedRange {
  let start: string;
  let end: string;

  if (filters.range === 'custom' && filters.startDate && filters.endDate) {
    start = filters.startDate <= filters.endDate ? filters.startDate : filters.endDate;
    end = filters.startDate <= filters.endDate ? filters.endDate : filters.startDate;
  } else if (filters.range === 'today') {
    start = manilaDateKeyOffset(0);
    end = start;
  } else if (filters.range === '30d') {
    start = manilaDateKeyOffset(29);
    end = manilaDateKeyOffset(0);
  } else {
    start = manilaDateKeyOffset(6);
    end = manilaDateKeyOffset(0);
  }

  const length = dayCountBetween(start, end);
  const prevStart = shiftDateKey(start, -length);
  return { start, end, prevStart };
}

function formatDayLabel(key: string) {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
}

interface RpcSummaryRow {
  revenue: number | null;
  orders: number | null;
  avg_order_value: number | null;
  active_branches: number | null;
  low_stock_branches: number | null;
  prev_revenue: number | null;
  prev_orders: number | null;
}

interface RpcTrendRow {
  day_label: string | null;
  revenue: number | null;
  orders: number | null;
}

interface RpcRankingRow {
  branch_id: string | null;
  branch_name: string | null;
  franchisee_name: string | null;
  revenue: number | null;
  orders: number | null;
  avg_order_value: number | null;
  is_active: boolean | null;
}

interface RpcPaymentRow {
  method: string | null;
  orders: number | null;
  amount: number | null;
}

interface RpcInventoryRow {
  branch_id: string | null;
  branch_name: string | null;
  material_name: string | null;
  unit: string | null;
  on_hand_qty: number | null;
  low_stock_qty: number | null;
  level: string | null;
}

interface PosOrderRow {
  created_at: string | null;
  total_amount: number | null;
  branch_id: string | null;
  payment_method: string | null;
  payment_status: string | null;
  status: string | null;
}

interface BranchRow {
  id: string;
  name: string | null;
  franchisee_name: string | null;
  is_active: boolean | null;
}

interface BranchInventoryDbRow {
  branch_id: string | null;
  on_hand_qty: number | null;
  low_stock_qty: number | null;
  branch: { name: string | null } | { name: string | null }[] | null;
  raw_material: { name: string | null; unit: string | null } | { name: string | null; unit: string | null }[] | null;
}

function toInventoryLevel(onHand: number, low: number): InventoryLevel {
  if (onHand <= 0) return 'critical';
  if (onHand <= low) return 'warn';
  return 'ok';
}

async function fetchViaRpc(brandId: string, range: ResolvedRange, branchId: string | null): Promise<ReportsData | null> {
  const rpcBranch = branchId ?? null;
  const summaryRpc = await supabase.rpc('hq_reports_summary', {
    p_brand_id: brandId,
    p_start: range.start,
    p_end: range.end,
    p_branch_id: rpcBranch,
    p_tz: TZ,
  });
  if (summaryRpc.error) return null;

  const [trendRpc, rankingRpc, paymentRpc, inventoryRpc] = await Promise.all([
    supabase.rpc('hq_revenue_trend', { p_brand_id: brandId, p_start: range.start, p_end: range.end, p_branch_id: rpcBranch, p_tz: TZ }),
    supabase.rpc('hq_branch_sales_ranking', { p_brand_id: brandId, p_start: range.start, p_end: range.end, p_branch_id: rpcBranch, p_tz: TZ }),
    supabase.rpc('hq_payment_mix', { p_brand_id: brandId, p_start: range.start, p_end: range.end, p_branch_id: rpcBranch, p_tz: TZ }),
    supabase.rpc('hq_branch_inventory_status', { p_brand_id: brandId, p_branch_id: rpcBranch }),
  ]);

  if (trendRpc.error || rankingRpc.error || paymentRpc.error || inventoryRpc.error) {
    return null;
  }

  const summaryRow = ((summaryRpc.data as RpcSummaryRow[] | null) ?? [])[0];
  const summary: ReportsSummary = {
    revenue: asNumber(summaryRow?.revenue),
    orders: asNumber(summaryRow?.orders),
    avgOrderValue: asNumber(summaryRow?.avg_order_value),
    activeBranches: asNumber(summaryRow?.active_branches),
    lowStockBranches: asNumber(summaryRow?.low_stock_branches),
    prevRevenue: asNumber(summaryRow?.prev_revenue),
    prevOrders: asNumber(summaryRow?.prev_orders),
  };

  const revenueTrend = ((trendRpc.data as RpcTrendRow[] | null) ?? []).map((row) => ({
    label: row.day_label ?? '--',
    revenue: asNumber(row.revenue),
    orders: asNumber(row.orders),
  }));

  const branchRanking = ((rankingRpc.data as RpcRankingRow[] | null) ?? []).map((row) => ({
    branchId: row.branch_id ?? '',
    branchName: row.branch_name ?? 'Unknown branch',
    franchiseeName: row.franchisee_name,
    revenue: asNumber(row.revenue),
    orders: asNumber(row.orders),
    avgOrderValue: asNumber(row.avg_order_value),
    isActive: row.is_active ?? true,
  }));

  const paymentMix = ((paymentRpc.data as RpcPaymentRow[] | null) ?? []).map((row) => ({
    method: row.method ?? 'CASH',
    orders: asNumber(row.orders),
    amount: asNumber(row.amount),
  }));

  const inventoryStatus = ((inventoryRpc.data as RpcInventoryRow[] | null) ?? []).map((row) => ({
    branchId: row.branch_id ?? '',
    branchName: row.branch_name ?? 'Unknown branch',
    materialName: row.material_name ?? 'Material',
    unit: row.unit ?? '',
    onHandQty: asNumber(row.on_hand_qty),
    lowStockQty: asNumber(row.low_stock_qty),
    level: (row.level as InventoryLevel) ?? 'ok',
  }));

  return { summary, revenueTrend, branchRanking, paymentMix, inventoryStatus, source: 'rpc' };
}

async function fetchFallback(brandId: string, range: ResolvedRange, branchId: string | null): Promise<ReportsData> {
  let orderQuery = supabase
    .from('pos_order')
    .select('created_at,total_amount,branch_id,payment_method,payment_status,status,brand_id')
    .eq('brand_id', brandId)
    .gte('created_at', `${range.prevStart}T00:00:00`)
    .limit(5000);
  if (branchId) {
    orderQuery = orderQuery.eq('branch_id', branchId);
  }

  const { data: orderData, error: orderError } = await orderQuery;
  if (orderError) throw orderError;

  const paidRows = ((orderData as PosOrderRow[] | null) ?? []).filter((row) => {
    const payment = (row.payment_status ?? 'PAID').toUpperCase();
    const status = (row.status ?? 'COMPLETED').toUpperCase();
    return payment === 'PAID' && status === 'COMPLETED' && Boolean(row.created_at);
  });

  const inRange = (key: string) => key >= range.start && key <= range.end;
  const inPrev = (key: string) => key >= range.prevStart && key < range.start;

  let revenue = 0;
  let orders = 0;
  let prevRevenue = 0;
  let prevOrders = 0;
  const activeBranchSet = new Set<string>();
  const trendMap = new Map<string, { revenue: number; orders: number }>();
  const paymentMap = new Map<string, { orders: number; amount: number }>();
  const branchSalesMap = new Map<string, { revenue: number; orders: number }>();

  for (let key = range.start; key <= range.end; key = shiftDateKey(key, 1)) {
    trendMap.set(key, { revenue: 0, orders: 0 });
  }

  for (const row of paidRows) {
    const key = getManilaIsoDateKey(new Date(row.created_at as string));
    const amount = asNumber(row.total_amount);
    if (inRange(key)) {
      revenue += amount;
      orders += 1;
      if (row.branch_id) activeBranchSet.add(row.branch_id);

      const bucket = trendMap.get(key);
      if (bucket) {
        bucket.revenue += amount;
        bucket.orders += 1;
      }

      const method = (row.payment_method ?? 'CASH').toUpperCase();
      const pay = paymentMap.get(method) ?? { orders: 0, amount: 0 };
      pay.orders += 1;
      pay.amount += amount;
      paymentMap.set(method, pay);

      if (row.branch_id) {
        const bs = branchSalesMap.get(row.branch_id) ?? { revenue: 0, orders: 0 };
        bs.revenue += amount;
        bs.orders += 1;
        branchSalesMap.set(row.branch_id, bs);
      }
    } else if (inPrev(key)) {
      prevRevenue += amount;
      prevOrders += 1;
    }
  }

  const revenueTrend: RevenueTrendItem[] = Array.from(trendMap.entries()).map(([key, value]) => ({
    label: formatDayLabel(key),
    revenue: value.revenue,
    orders: value.orders,
  }));

  const paymentMix: PaymentMixItem[] = Array.from(paymentMap.entries())
    .map(([method, value]) => ({ method, orders: value.orders, amount: value.amount }))
    .sort((a, b) => b.amount - a.amount);

  let branchQuery = supabase
    .from('branch')
    .select('id,name,franchisee_name,is_active,brand_id')
    .eq('brand_id', brandId);
  if (branchId) {
    branchQuery = branchQuery.eq('id', branchId);
  }
  const { data: branchData } = await branchQuery;
  const branchRows = (branchData as BranchRow[] | null) ?? [];

  const branchRanking: BranchSalesRow[] = branchRows
    .map((branch) => {
      const sales = branchSalesMap.get(branch.id) ?? { revenue: 0, orders: 0 };
      return {
        branchId: branch.id,
        branchName: branch.name ?? 'Unknown branch',
        franchiseeName: branch.franchisee_name,
        revenue: sales.revenue,
        orders: sales.orders,
        avgOrderValue: sales.orders > 0 ? sales.revenue / sales.orders : 0,
        isActive: branch.is_active ?? true,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.branchName.localeCompare(b.branchName));

  let inventoryStatus: BranchInventoryRow[] = [];
  let lowStockBranches = 0;
  let inventoryQuery = supabase
    .from('branch_inventory')
    .select('branch_id,on_hand_qty,low_stock_qty,branch(name),raw_material(name,unit)')
    .eq('brand_id', brandId);
  if (branchId) {
    inventoryQuery = inventoryQuery.eq('branch_id', branchId);
  }
  const { data: invData, error: invError } = await inventoryQuery;
  if (!invError && invData) {
    const lowStockBranchSet = new Set<string>();
    inventoryStatus = (invData as BranchInventoryDbRow[]).map((row) => {
      const branchRel = Array.isArray(row.branch) ? row.branch[0] : row.branch;
      const materialRel = Array.isArray(row.raw_material) ? row.raw_material[0] : row.raw_material;
      const onHand = asNumber(row.on_hand_qty);
      const low = asNumber(row.low_stock_qty);
      const level = toInventoryLevel(onHand, low);
      if (level !== 'ok' && row.branch_id) lowStockBranchSet.add(row.branch_id);
      return {
        branchId: row.branch_id ?? '',
        branchName: branchRel?.name ?? 'Unknown branch',
        materialName: materialRel?.name ?? 'Material',
        unit: materialRel?.unit ?? '',
        onHandQty: onHand,
        lowStockQty: low,
        level,
      };
    });
    const levelRank: Record<InventoryLevel, number> = { critical: 0, warn: 1, ok: 2 };
    inventoryStatus.sort(
      (a, b) =>
        levelRank[a.level] - levelRank[b.level] ||
        a.branchName.localeCompare(b.branchName) ||
        a.materialName.localeCompare(b.materialName)
    );
    lowStockBranches = lowStockBranchSet.size;
  }

  const summary: ReportsSummary = {
    revenue,
    orders,
    avgOrderValue: orders > 0 ? revenue / orders : 0,
    activeBranches: activeBranchSet.size,
    lowStockBranches,
    prevRevenue,
    prevOrders,
  };

  return { summary, revenueTrend, branchRanking, paymentMix, inventoryStatus, source: 'fallback' };
}

export async function fetchReportsData(brandId: string, filters: ReportsFilters): Promise<ReportsData> {
  const range = resolveRange(filters);
  const branchId = filters.branchId && filters.branchId !== 'all' ? filters.branchId : null;

  const viaRpc = await fetchViaRpc(brandId, range, branchId);
  if (viaRpc) return viaRpc;

  return fetchFallback(brandId, range, branchId);
}

export { EMPTY_SUMMARY };
