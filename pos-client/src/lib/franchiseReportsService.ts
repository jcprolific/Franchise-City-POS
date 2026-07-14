import { supabase, isSupabaseConfigured } from './supabase';
import { resolvePosOrderColumns } from './dashboardRealtime';
import { fetchProductSales } from './posOrderItemService';
import { fetchBranchInventory, type BranchInventoryItem } from './inventoryService';
import { fetchStockMovements } from './stockMovementService';
import { getManilaIsoDateKey } from './timezone';
import { isCountablePaidSale } from './saleEligibility';
import {
  portalLowStockItems,
  portalReportSnapshots,
  portalWeeklySales,
} from '../data/portalContent';

export interface FranchiseReportSummary {
  revenue: number;
  orders: number;
  avgOrderValue: number;
  label: string;
  source: 'live' | 'fallback';
}

export interface DailySalesPoint {
  label: string;
  amount: number;
}

export interface InventoryReportRow {
  name: string;
  onHand: string;
  threshold: string;
  value: number;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  return 0;
}

function manilaDateKeyOffset(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getManilaIsoDateKey(d);
}

function rangeIso(startKey: string, endKey: string) {
  return {
    start: `${startKey}T00:00:00+08:00`,
    end: `${endKey}T23:59:59+08:00`,
  };
}

async function fetchOrdersInRange(
  brandId: string,
  startKey: string,
  endKey: string,
  branchId?: string
) {
  if (!isSupabaseConfigured()) return [];

  const columns = await resolvePosOrderColumns();
  const { start, end } = rangeIso(startKey, endKey);

  let query = supabase
    .from('pos_order')
    .select('*')
    .eq('brand_id', brandId)
    .gte(columns.date ?? 'created_at', start)
    .lte(columns.date ?? 'created_at', end);

  if (branchId && columns.branch) query = query.eq(columns.branch, branchId);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as Record<string, unknown>[]).filter((row) => {
    const status = columns.status ? String(row[columns.status]) : null;
    const pay = columns.paymentStatus ? String(row[columns.paymentStatus]) : null;
    return isCountablePaidSale(status, pay);
  });
}

export async function fetchFranchiseSummary(
  brandId: string,
  range: 'today' | '7d' | '30d',
  branchId?: string
): Promise<FranchiseReportSummary> {
  let startKey: string;
  const endKey = manilaDateKeyOffset(0);
  let label: string;

  if (range === 'today') {
    startKey = endKey;
    label = 'Today';
  } else if (range === '7d') {
    startKey = manilaDateKeyOffset(6);
    label = 'Last 7 days';
  } else {
    startKey = manilaDateKeyOffset(29);
    label = 'Last 30 days';
  }

  const orders = await fetchOrdersInRange(brandId, startKey, endKey, branchId);
  if (!orders.length && !isSupabaseConfigured()) {
    const snap = portalReportSnapshots[0];
    return {
      revenue: Number(snap.value.replace(/[^\d]/g, '')) || 0,
      orders: 124,
      avgOrderValue: 148,
      label: `${label} · sample`,
      source: 'fallback',
    };
  }

  const columns = await resolvePosOrderColumns();
  const revenue = orders.reduce((s, o) => s + toNum(columns.total ? o[columns.total] : 0), 0);
  const count = orders.length;
  return {
    revenue,
    orders: count,
    avgOrderValue: count > 0 ? revenue / count : 0,
    label,
    source: orders.length ? 'live' : 'fallback',
  };
}

export async function fetchDailySalesTrend(
  brandId: string,
  days: number,
  branchId?: string
): Promise<DailySalesPoint[]> {
  if (!isSupabaseConfigured()) {
    return portalWeeklySales.map((d) => ({ label: d.day, amount: d.amount }));
  }

  const columns = await resolvePosOrderColumns();
  const points: DailySalesPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const key = manilaDateKeyOffset(i);
    const orders = await fetchOrdersInRange(brandId, key, key, branchId);
    const amount = orders.reduce((s, o) => s + toNum(columns.total ? o[columns.total] : 0), 0);
    const d = new Date(`${key}T00:00:00Z`);
    points.push({
      label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
      amount,
    });
  }

  return points;
}

const SAMPLE_TOP_SELLER = {
  productName: 'Brown Sugar Milk Tea',
  quantity: 42,
  revenue: 6216,
};

/** Pure helper — sample fallback only for offline/demo; live empty stays empty. */
export function resolveProductPerformance(
  rows: Awaited<ReturnType<typeof fetchProductSales>>,
  configured: boolean
): { rows: Awaited<ReturnType<typeof fetchProductSales>>; source: 'live' | 'fallback' } {
  if (rows.length) return { rows, source: 'live' };
  if (configured) return { rows: [], source: 'live' };
  return { rows: [SAMPLE_TOP_SELLER], source: 'fallback' };
}

export async function fetchProductPerformance(
  brandId: string,
  range: '7d' | '30d',
  branchId?: string
) {
  const endKey = manilaDateKeyOffset(0);
  const startKey = manilaDateKeyOffset(range === '7d' ? 6 : 29);
  const { start, end } = rangeIso(startKey, endKey);
  const rows = await fetchProductSales(brandId, start, end, branchId);
  return resolveProductPerformance(rows, isSupabaseConfigured());
}

export async function fetchInventoryReport(
  brandDbId: string,
  branchId: string
): Promise<{ rows: InventoryReportRow[]; source: 'live' | 'fallback' }> {
  const items = await fetchBranchInventory(brandDbId, branchId);
  if (items?.length) {
    return {
      source: 'live',
      rows: items.map((i) => ({
        name: i.name,
        onHand: `${i.onHandQty} ${i.unit}`,
        threshold: `${i.lowStockQty} ${i.unit}`,
        value: i.onHandQty * i.price,
      })),
    };
  }

  return {
    source: 'fallback',
    rows: portalLowStockItems.map((i) => ({
      name: i.name,
      onHand: i.qty,
      threshold: i.threshold,
      value: 0,
    })),
  };
}

export async function fetchLowStockItems(
  brandDbId: string,
  branchId: string
): Promise<BranchInventoryItem[]> {
  const items = await fetchBranchInventory(brandDbId, branchId);
  if (!items) return [];
  return items.filter((i) => i.onHandQty <= i.lowStockQty);
}

export { fetchStockMovements };

export function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
