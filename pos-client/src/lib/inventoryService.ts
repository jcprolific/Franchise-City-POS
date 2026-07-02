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

interface RawMaterialJoin {
  id: string;
  name: string;
  category: string | null;
  packaging: string | null;
  unit: string | null;
  price: number | string | null;
  icon: string | null;
  sort_order: number | null;
}

interface BranchInventoryRow {
  id: string;
  raw_material_id: string;
  on_hand_qty: number | string | null;
  low_stock_qty: number | string | null;
  raw_material: RawMaterialJoin | RawMaterialJoin[] | null;
}

function toNum(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function firstJoin(rel: RawMaterialJoin | RawMaterialJoin[] | null): RawMaterialJoin | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

/**
 * Load a branch's inventory joined with the raw-material catalog. Returns null
 * when Supabase is unconfigured, errors, or has no rows for this branch, so the
 * page can fall back to the local catalog (mirrors the app's other data pages).
 */
export async function fetchBranchInventory(
  brandDbId: string,
  branchId: string
): Promise<BranchInventoryItem[] | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('branch_inventory')
    .select(
      'id,raw_material_id,on_hand_qty,low_stock_qty,raw_material(id,name,category,packaging,unit,price,icon,sort_order)'
    )
    .eq('brand_id', brandDbId)
    .eq('branch_id', branchId);

  if (error) return null;

  const rows = (data as BranchInventoryRow[] | null) ?? [];
  if (rows.length === 0) return null;

  const items: BranchInventoryItem[] = rows.map((row) => {
    const rm = firstJoin(row.raw_material);
    return {
      branchInventoryId: row.id,
      rawMaterialId: row.raw_material_id,
      name: rm?.name ?? 'Unknown item',
      category: rm?.category ?? '',
      packaging: rm?.packaging ?? '',
      unit: rm?.unit ?? 'unit',
      price: toNum(rm?.price),
      icon: rm?.icon ?? '',
      onHandQty: toNum(row.on_hand_qty),
      lowStockQty: toNum(row.low_stock_qty),
      sortOrder: rm?.sort_order ?? 0,
    };
  });

  items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return items;
}

/** Persist a new on-hand count for a branch_inventory row. */
export async function updateBranchStock(
  branchInventoryId: string,
  onHandQty: number
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };
  const { error } = await supabase
    .from('branch_inventory')
    .update({ on_hand_qty: Math.max(0, onHandQty) })
    .eq('id', branchInventoryId);
  return { error: error ? error.message : null };
}
