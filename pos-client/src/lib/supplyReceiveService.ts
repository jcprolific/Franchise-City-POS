import { supabase, isSupabaseConfigured } from './supabase';
import { logStockMovement } from './stockMovementService';
import { updateBranchStock } from './inventoryService';

interface SupplyOrderItemRow {
  raw_material_id: string | null;
  name: string;
  quantity: number | string | null;
}

export async function receiveSupplyOrderToInventory(
  orderId: string,
  brandId?: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };

  const { data: order, error: orderError } = await supabase
    .from('supply_order')
    .select('id, branch_id, brand_id, reference_no, supply_order_item(raw_material_id, name, quantity)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { error: orderError?.message ?? 'order-not-found' };
  }

  const branchId = String((order as { branch_id: string }).branch_id);
  const resolvedBrandId = brandId ?? String((order as { brand_id?: string }).brand_id ?? '');
  const referenceNo = String((order as { reference_no?: string }).reference_no ?? orderId);
  const items = ((order as { supply_order_item?: SupplyOrderItemRow[] }).supply_order_item ?? []);

  for (const item of items) {
    if (!item.raw_material_id) continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    const { data: inventoryRow, error: inventoryError } = await supabase
      .from('branch_inventory')
      .select('id, on_hand_qty')
      .eq('branch_id', branchId)
      .eq('raw_material_id', item.raw_material_id)
      .maybeSingle();

    if (inventoryError || !inventoryRow) {
      return { error: inventoryError?.message ?? `missing-inventory-${item.name}` };
    }

    const qtyBefore = Number((inventoryRow as { on_hand_qty: number }).on_hand_qty) || 0;
    const qtyAfter = qtyBefore + qty;
    const branchInventoryId = String((inventoryRow as { id: string }).id);

    const stockResult = await updateBranchStock(branchInventoryId, qtyAfter);
    if (stockResult.error) {
      return { error: stockResult.error };
    }

    await logStockMovement({
      brandId: resolvedBrandId,
      branchId,
      rawMaterialId: item.raw_material_id,
      materialName: item.name,
      movementType: 'receive',
      qtyBefore,
      qtyAfter,
      reason: `WH delivery ${referenceNo}`,
      createdBy: 'HQ Warehouse',
    });
  }

  return { error: null };
}
