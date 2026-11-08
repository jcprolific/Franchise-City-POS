import { supabase, isSupabaseConfigured } from './supabase';

// A branch-scoped inventory row: the raw material joined with this branch's
// current stock (branch_inventory). `branchInventoryId` is null when the row
// only exists in the local fallback catalog (Supabase unconfigured/empty).
export interface BranchInventoryItem {
  branchInventoryId: string | null;
  rawMaterialId: string;
  name: string;
  category: string;
  packaging: string;
  unit: string;
  price: number;
  icon: string;
  onHandQty: number;
  lowStockQty: number;
  sortOrder: number;
}

interface BranchInventoryRow {
  id: string;
  raw_material_id: string;
  on_hand_qty: number | string | null;
  low_stock_qty: number | string | null;
}

function toNum(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

/**
 * Load a branch's inventory joined with the raw-material catalog. Returns null
 * when Supabase is unconfigured, errors, or has no rows for this branch, so the
 * page can fall back to the local catalog (mirrors the app's other data pages).
 */
interface RawMaterialRow {
  id: string;
  name: string;
  category: string | null;
  packaging: string | null;
  unit: string | null;
  price: number | string | null;
  icon: string | null;
  sort_order: number | null;
  low_stock_qty: number | string | null;
  is_active: boolean | null;
}

export async function fetchBranchInventory(
  brandDbId: string,
  branchId: string
): Promise<BranchInventoryItem[] | null> {
  if (!isSupabaseConfigured()) return null;

  const [catalogRes, stockRes] = await Promise.all([
    supabase
      .from('raw_material')
      .select(
        'id,name,category,packaging,unit,price,icon,sort_order,low_stock_qty,is_active'
      )
      .eq('brand_id', brandDbId)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('branch_inventory')
      .select('id,raw_material_id,on_hand_qty,low_stock_qty')
      .eq('brand_id', brandDbId)
      .eq('branch_id', branchId),
  ]);

  if (catalogRes.error || stockRes.error) return null;

  const catalog = (catalogRes.data as RawMaterialRow[] | null) ?? [];
  if (catalog.length === 0) return null;

  const stockByMaterial = new Map<string, BranchInventoryRow>();
  for (const row of (stockRes.data as BranchInventoryRow[] | null) ?? []) {
    stockByMaterial.set(row.raw_material_id, row);
  }

  const items: BranchInventoryItem[] = catalog.map((rm) => {
    const stock = stockByMaterial.get(rm.id);
    return {
      branchInventoryId: stock?.id ?? null,
      rawMaterialId: rm.id,
      name: rm.name,
      category: rm.category ?? '',
      packaging: rm.packaging ?? '',
      unit: rm.unit ?? 'unit',
      price: toNum(rm.price),
      icon: rm.icon ?? '',
      onHandQty: toNum(stock?.on_hand_qty),
      lowStockQty: toNum(stock?.low_stock_qty ?? rm.low_stock_qty),
      sortOrder: rm.sort_order ?? 0,
    };
  });

  items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return items;
}

/** Persist on-hand count; creates branch_inventory when missing. */
export async function updateBranchStock(
  branchInventoryId: string | null,
  onHandQty: number,
  opts?: { brandDbId: string; branchId: string; rawMaterialId: string; lowStockQty?: number }
): Promise<{ error: string | null; branchInventoryId?: string }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };
  const qty = Math.max(0, onHandQty);

  if (branchInventoryId) {
    const { error } = await supabase
      .from('branch_inventory')
      .update({ on_hand_qty: qty })
      .eq('id', branchInventoryId);
    return { error: error ? error.message : null, branchInventoryId };
  }

  if (!opts) return { error: 'missing-row' };

  const { data, error } = await supabase
    .from('branch_inventory')
    .upsert(
      {
        brand_id: opts.brandDbId,
        branch_id: opts.branchId,
        raw_material_id: opts.rawMaterialId,
        on_hand_qty: qty,
        low_stock_qty: opts.lowStockQty ?? 0,
      },
      { onConflict: 'branch_id,raw_material_id' }
    )
    .select('id')
    .single();

  return {
    error: error ? error.message : null,
    branchInventoryId: data?.id,
  };
}
