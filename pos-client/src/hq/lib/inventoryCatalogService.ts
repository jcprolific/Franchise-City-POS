import { supabase } from '../../lib/supabase';

export interface HqCatalogMaterialRow {
  id: string;
  sku: string | null;
  category: string;
  name: string;
  unit: string;
  packaging: string;
  price: number;
  low_stock_qty: number;
  is_active: boolean;
  sort_order: number;
}

export interface HqBranchStockRow {
  raw_material_id: string;
  on_hand_qty: number;
  low_stock_qty: number;
  name: string;
  category: string;
}

export interface HqUsageDayRow {
  usage_date: string;
  total_qty: number;
}

const MATERIAL_SELECT =
  'id,sku,category,name,unit,packaging,price,low_stock_qty,is_active,sort_order';

function toNum(v: number | string | null | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  return 0;
}

export async function fetchCatalogMaterials(
  brandId: string
): Promise<HqCatalogMaterialRow[]> {
  const { data, error } = await supabase
    .from('raw_material')
    .select(MATERIAL_SELECT)
    .eq('brand_id', brandId)
    .order('sort_order');

  if (error) throw new Error(error.message);
  return ((data as HqCatalogMaterialRow[] | null) ?? []).map((row) => ({
    ...row,
    price: toNum(row.price),
    low_stock_qty: toNum(row.low_stock_qty),
  }));
}

export async function fetchBranchStockForHq(
  brandId: string,
  branchId: string
): Promise<HqBranchStockRow[]> {
  const { data, error } = await supabase
    .from('branch_inventory')
    .select(
      'raw_material_id,on_hand_qty,low_stock_qty,raw_material(name,category)'
    )
    .eq('brand_id', brandId)
    .eq('branch_id', branchId);

  if (error) throw new Error(error.message);

  type Row = {
    raw_material_id: string;
    on_hand_qty: number | string;
    low_stock_qty: number | string;
    raw_material:
      | { name: string; category: string }
      | { name: string; category: string }[]
      | null;
  };

  return ((data as Row[] | null) ?? []).map((row) => {
    const rel = Array.isArray(row.raw_material)
      ? row.raw_material[0]
      : row.raw_material;
    return {
      raw_material_id: row.raw_material_id,
      on_hand_qty: toNum(row.on_hand_qty),
      low_stock_qty: toNum(row.low_stock_qty),
      name: rel?.name ?? 'Unknown',
      category: rel?.category ?? '',
    };
  });
}

export async function fetchUsageByDay(
  brandId: string,
  branchId: string,
  limitDays = 14
): Promise<HqUsageDayRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - limitDays);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('inventory_usage_daily')
    .select('usage_date,qty')
    .eq('brand_id', brandId)
    .eq('branch_id', branchId)
    .gte('usage_date', sinceIso);

  if (error) throw new Error(error.message);

  const byDate = new Map<string, number>();
  for (const row of (data as { usage_date: string; qty: number | string }[] | null) ??
    []) {
    const d = row.usage_date;
    byDate.set(d, (byDate.get(d) ?? 0) + toNum(row.qty));
  }

  return [...byDate.entries()]
    .map(([usage_date, total_qty]) => ({ usage_date, total_qty }))
    .sort((a, b) => a.usage_date.localeCompare(b.usage_date));
}
