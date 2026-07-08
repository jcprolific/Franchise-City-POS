import { supabase, isSupabaseConfigured } from './supabase';

export type StockMovementType = 'receive' | 'issue' | 'adjustment' | 'sale';

export interface StockMovement {
  id: string;
  branchId: string;
  rawMaterialId: string;
  materialName: string;
  movementType: StockMovementType;
  qtyBefore: number;
  qtyDelta: number;
  qtyAfter: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface LogMovementInput {
  brandId: string;
  branchId: string;
  rawMaterialId: string;
  materialName: string;
  movementType: StockMovementType;
  qtyBefore: number;
  qtyAfter: number;
  reason: string;
  createdBy: string;
}

function toNum(v: number | string | null | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  return 0;
}

function mapRow(row: Record<string, unknown>): StockMovement {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    rawMaterialId: String(row.raw_material_id),
    materialName: String(row.material_name),
    movementType: row.movement_type as StockMovementType,
    qtyBefore: toNum(row.qty_before as number | string | null),
    qtyDelta: toNum(row.qty_delta as number | string | null),
    qtyAfter: toNum(row.qty_after as number | string | null),
    reason: String(row.reason ?? ''),
    createdBy: String(row.created_by ?? ''),
    createdAt: String(row.created_at),
  };
}

export async function logStockMovement(
  input: LogMovementInput
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };

  const qtyDelta = input.qtyAfter - input.qtyBefore;
  const { error } = await supabase.from('stock_movement').insert({
    brand_id: input.brandId,
    branch_id: input.branchId,
    raw_material_id: input.rawMaterialId,
    material_name: input.materialName,
    movement_type: input.movementType,
    qty_before: input.qtyBefore,
    qty_delta: qtyDelta,
    qty_after: input.qtyAfter,
    reason: input.reason,
    created_by: input.createdBy,
  });

  return { error: error?.message ?? null };
}

export async function fetchStockMovements(
  branchId: string,
  limit = 50
): Promise<StockMovement[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('stock_movement')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapRow);
}
