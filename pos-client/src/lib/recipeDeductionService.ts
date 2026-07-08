import type { CartItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { logStockMovement } from './stockMovementService';
import { logAuditEvent } from './auditLogService';

interface RecipeRow {
  product_id: string;
  variant_id: string | null;
  raw_material_id: string;
  quantity_per_cup: number | string | null;
}

interface InventoryRow {
  id: string;
  raw_material_id: string;
  on_hand_qty: number | string | null;
  raw_material: { name: string } | { name: string }[] | null;
}

function toNum(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function materialName(row: InventoryRow): string {
  const rel = row.raw_material;
  if (!rel) return 'Unknown';
  if (Array.isArray(rel)) return rel[0]?.name ?? 'Unknown';
  return rel.name;
}

function recipeLinesForItem(
  recipes: RecipeRow[],
  productId: string,
  variantId: string | null
): RecipeRow[] {
  const forProduct = recipes.filter((r) => r.product_id === productId);
  if (forProduct.length === 0) return [];

  const variantSpecific = forProduct.filter(
    (r) => variantId && r.variant_id === variantId
  );
  if (variantSpecific.length > 0) return variantSpecific;

  return forProduct.filter((r) => !r.variant_id);
}

export function aggregateRecipeUsage(
  cartItems: CartItem[],
  recipes: RecipeRow[]
): Map<string, number> {
  const usage = new Map<string, number>();

  for (const item of cartItems) {
    const lines = recipeLinesForItem(
      recipes,
      item.product.id,
      item.variant?.id ?? null
    );
    for (const line of lines) {
      const perCup = toNum(line.quantity_per_cup);
      const total = perCup * item.quantity;
      usage.set(line.raw_material_id, (usage.get(line.raw_material_id) ?? 0) + total);
    }
  }

  return usage;
}

export async function deductInventoryForOrder(params: {
  brandId: string;
  branchId: string;
  cartItems: CartItem[];
  orderId: string;
  createdBy?: string;
}): Promise<{ deducted: number; skipped: boolean; errors: string[] }> {
  if (!isSupabaseConfigured() || params.cartItems.length === 0) {
    return { deducted: 0, skipped: true, errors: [] };
  }

  const productIds = [...new Set(params.cartItems.map((i) => i.product.id))];
  const { data: recipeData, error: recipeError } = await supabase
    .from('menu_recipe')
    .select('product_id, variant_id, raw_material_id, quantity_per_cup')
    .in('product_id', productIds);

  if (recipeError) {
    return { deducted: 0, skipped: false, errors: [recipeError.message] };
  }

  const recipes = (recipeData as RecipeRow[] | null) ?? [];
  const usage = aggregateRecipeUsage(params.cartItems, recipes);
  if (usage.size === 0) {
    return { deducted: 0, skipped: true, errors: [] };
  }

  const materialIds = [...usage.keys()];
  const { data: inventoryData, error: inventoryError } = await supabase
    .from('branch_inventory')
    .select('id, raw_material_id, on_hand_qty, raw_material(name)')
    .eq('brand_id', params.brandId)
    .eq('branch_id', params.branchId)
    .in('raw_material_id', materialIds);

  if (inventoryError) {
    return { deducted: 0, skipped: false, errors: [inventoryError.message] };
  }

  const inventoryByMaterial = new Map<string, InventoryRow>();
  for (const row of (inventoryData as InventoryRow[] | null) ?? []) {
    inventoryByMaterial.set(row.raw_material_id, row);
  }

  const errors: string[] = [];
  let deducted = 0;

  for (const [materialId, qtyUsed] of usage) {
    const inv = inventoryByMaterial.get(materialId);
    if (!inv) {
      errors.push(`No branch inventory for material ${materialId}`);
      continue;
    }

    const qtyBefore = toNum(inv.on_hand_qty);
    const qtyAfter = Math.max(0, qtyBefore - qtyUsed);

    const { error: updateError } = await supabase
      .from('branch_inventory')
      .update({ on_hand_qty: qtyAfter })
      .eq('id', inv.id);

    if (updateError) {
      errors.push(updateError.message);
      continue;
    }

    const movement = await logStockMovement({
      brandId: params.brandId,
      branchId: params.branchId,
      rawMaterialId: materialId,
      materialName: materialName(inv),
      movementType: 'sale',
      qtyBefore,
      qtyAfter,
      reason: `POS order ${params.orderId}`,
      createdBy: params.createdBy ?? 'pos',
    });

    if (movement.error) {
      errors.push(movement.error);
      continue;
    }

    deducted += 1;
  }

  if (deducted > 0) {
    void logAuditEvent({
      action: 'stock_adjusted',
      entityType: 'pos_order',
      entityId: params.orderId,
      brandId: params.brandId,
      branchId: params.branchId,
      afterData: { materialsDeducted: deducted, orderId: params.orderId },
      metadata: { source: 'recipe_auto_deduct' },
    });
  }

  return { deducted, skipped: false, errors };
}
