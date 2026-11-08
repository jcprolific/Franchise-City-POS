import { supabase } from '../../lib/supabase';
import { toRelativeTimeLabel } from '../../lib/timezone';
import type { HqInventoryAlert, HqLiveOrder } from '../data/cofteaHqDemoData';
import { fetchHqKpiData, type HqKpiSnapshot, type HqWeeklyRevenueItem } from './hqKpiService';

export interface HqBranchOption {
  id: string;
  name: string;
}

export interface HqDashboardFeed {
  snapshot: HqKpiSnapshot;
  weeklyRevenue: HqWeeklyRevenueItem[];
  source: 'rpc' | 'fallback';
  totalBranches: number;
  branches: HqBranchOption[];
  inventoryAlerts: HqInventoryAlert[];
  liveOrders: HqLiveOrder[];
}

interface NamedRelation {
  name: string | null;
}

interface InventoryDbRow {
  branch_id: string | null;
  on_hand_qty: number | string | null;
  low_stock_qty: number | string | null;
  branch: NamedRelation | NamedRelation[] | null;
  raw_material: (NamedRelation & { unit?: string | null }) | (NamedRelation & { unit?: string | null })[] | null;
}

interface OrderItemRel {
  product_name: string | null;
  variant_name: string | null;
  quantity: number | string | null;
}

interface LiveOrderDbRow {
  id: string;
  created_at: string | null;
  total_amount: number | string | null;
  status: string | null;
  branch: NamedRelation | NamedRelation[] | null;
  pos_order_item: OrderItemRel[] | null;
}

function asNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatOrderItems(items: OrderItemRel[] | null): string {
  if (!items || items.length === 0) return '—';
  return items
    .map((item) => {
      const name = item.product_name?.trim() || 'Item';
      const variant = item.variant_name?.trim();
      const qty = asNumber(item.quantity);
      const label = variant ? `${name} ${variant}` : name;
      return qty > 1 ? `${label} x${qty}` : label;
    })
    .join(', ');
}

export function mapInventoryAlerts(rows: InventoryDbRow[]): HqInventoryAlert[] {
  const alerts: HqInventoryAlert[] = [];

  for (const row of rows) {
    const onHand = asNumber(row.on_hand_qty);
    const low = asNumber(row.low_stock_qty);
    const isLow = onHand <= 0 || (low > 0 && onHand <= low);
    if (!isLow) continue;

    const branch = firstRel(row.branch);
    const material = firstRel(row.raw_material);
    alerts.push({
      id: `${row.branch_id ?? 'branch'}-${material?.name ?? 'item'}`,
      name: material?.name?.trim() || 'Material',
      branch: branch?.name?.trim() || 'Unknown branch',
      qty: onHand,
      level: onHand <= 0 ? 'critical' : 'warn',
    });
  }

  const rank = { critical: 0, warn: 1 };
  return alerts.sort(
    (a, b) => rank[a.level] - rank[b.level] || a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name)
  );
}

export function mapLiveOrders(rows: LiveOrderDbRow[]): HqLiveOrder[] {
  return rows.map((row) => ({
    id: row.id,
    branch: firstRel(row.branch)?.name?.trim() || 'Unknown branch',
    items: formatOrderItems(row.pos_order_item),
    total: asNumber(row.total_amount),
    status: (row.status ?? 'NEW').toUpperCase(),
    time: row.created_at ? toRelativeTimeLabel(row.created_at) : '—',
  }));
}

async function fetchHqBranches(brandId: string): Promise<HqBranchOption[]> {
  const { data, error } = await supabase
    .from('branch')
    .select('id,name')
    .eq('brand_id', brandId)
    .order('name', { ascending: true })
    .limit(2000);

  if (error) throw error;

  return ((data as { id: string; name: string | null }[] | null) ?? [])
    .filter((row) => Boolean(row.name?.trim()))
    .map((row) => ({ id: row.id, name: row.name!.trim() }));
}

async function fetchHqInventoryAlerts(brandId: string): Promise<HqInventoryAlert[]> {
  const { data, error } = await supabase
    .from('branch_inventory')
    .select('branch_id,on_hand_qty,low_stock_qty,branch(name),raw_material(name,unit)')
    .eq('brand_id', brandId);

  if (error) throw error;
  return mapInventoryAlerts((data as InventoryDbRow[] | null) ?? []);
}

async function fetchHqLiveOrders(brandId: string): Promise<HqLiveOrder[]> {
  const { data, error } = await supabase
    .from('pos_order')
    .select('id,created_at,total_amount,status,branch(name),pos_order_item(product_name,variant_name,quantity)')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return mapLiveOrders((data as LiveOrderDbRow[] | null) ?? []);
}

export async function fetchHqDashboardFeed(brandId: string): Promise<HqDashboardFeed> {
  const [kpi, branches, inventoryAlerts, liveOrders] = await Promise.all([
    fetchHqKpiData(brandId),
    fetchHqBranches(brandId).catch(() => [] as HqBranchOption[]),
    fetchHqInventoryAlerts(brandId).catch(() => [] as HqInventoryAlert[]),
    fetchHqLiveOrders(brandId).catch(() => [] as HqLiveOrder[]),
  ]);

  return {
    snapshot: kpi.snapshot,
    weeklyRevenue: kpi.weeklyRevenue,
    source: kpi.source,
    totalBranches: branches.length,
    branches,
    inventoryAlerts,
    liveOrders,
  };
}
