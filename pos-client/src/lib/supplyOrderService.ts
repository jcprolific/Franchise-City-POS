import { receiveSupplyOrderToInventory } from './supplyReceiveService';
import { supabase, isSupabaseConfigured } from './supabase';

export type SupplyOrderStatus =
  | 'pending'
  | 'approved'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const SUPPLY_ORDER_FLOW: SupplyOrderStatus[] = [
  'pending',
  'approved',
  'preparing',
  'out_for_delivery',
  'delivered',
];

export const SUPPLY_ORDER_STATUS_LABELS: Record<SupplyOrderStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Next status in the fulfillment flow, or null if terminal. */
export function nextSupplyStatus(status: SupplyOrderStatus): SupplyOrderStatus | null {
  const idx = SUPPLY_ORDER_FLOW.indexOf(status);
  if (idx < 0 || idx >= SUPPLY_ORDER_FLOW.length - 1) return null;
  return SUPPLY_ORDER_FLOW[idx + 1];
}

export interface SupplyOrderLineInput {
  rawMaterialId: string;
  name: string;
  packaging: string;
  unit: string;
  unitPrice: number;
  quantity: number;
}

export interface PlaceSupplyOrderInput {
  brandId: string;
  branchId: string;
  branchName: string;
  placedBy: string;
  notes: string;
  paymentMethod: 'gcash' | 'bank_transfer';
  lines: SupplyOrderLineInput[];
}

export interface SupplyOrderItem {
  id: string;
  rawMaterialId: string | null;
  name: string;
  packaging: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface SupplyOrder {
  id: string;
  referenceNo: string;
  branchId: string;
  branchName: string;
  status: SupplyOrderStatus;
  itemCount: number;
  totalAmount: number;
  notes: string;
  placedBy: string;
  paymentMethod: 'gcash' | 'bank_transfer';
  createdAt: string;
  items: SupplyOrderItem[];
}

function toNum(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function makeReferenceNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SO-${y}-${rand}`;
}

/**
 * Persist a supply order (header + line items). Returns the new reference no on
 * success. Placing an order does not modify branch_inventory.
 */
export async function placeSupplyOrder(
  input: PlaceSupplyOrderInput
): Promise<{ referenceNo: string | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { referenceNo: null, error: 'not-configured' };
  if (input.lines.length === 0) return { referenceNo: null, error: 'empty-order' };

  const referenceNo = makeReferenceNo();
  const itemCount = input.lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalAmount = input.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const { data: orderRow, error: orderError } = await supabase
    .from('supply_order')
    .insert({
      brand_id: input.brandId,
      branch_id: input.branchId,
      reference_no: referenceNo,
      status: 'pending',
      item_count: itemCount,
      total_amount: totalAmount,
      notes: input.notes,
      placed_by: input.placedBy,
      payment_method: input.paymentMethod,
    })
    .select('id')
    .single();

  if (orderError || !orderRow) {
    return { referenceNo: null, error: orderError?.message ?? 'order-insert-failed' };
  }

  const orderId = (orderRow as { id: string }).id;
  const itemRows = input.lines.map((l) => ({
    supply_order_id: orderId,
    raw_material_id: l.rawMaterialId,
    name: l.name,
    packaging: l.packaging,
    unit: l.unit,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    line_total: l.quantity * l.unitPrice,
  }));

  const { error: itemsError } = await supabase.from('supply_order_item').insert(itemRows);
  if (itemsError) {
    await supabase.from('supply_order').delete().eq('id', orderId);
    return { referenceNo: null, error: itemsError.message };
  }

  return { referenceNo, error: null };
}

interface SupplyOrderRow {
  id: string;
  reference_no: string;
  branch_id: string;
  status: SupplyOrderStatus;
  item_count: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  placed_by: string | null;
  payment_method: 'gcash' | 'bank_transfer' | null;
  created_at: string;
  branch: { name?: string } | { name?: string }[] | null;
  supply_order_item: SupplyOrderItemRow[] | null;
}

interface SupplyOrderItemRow {
  id: string;
  raw_material_id: string | null;
  name: string;
  packaging: string | null;
  unit: string | null;
  unit_price: number | string | null;
  quantity: number | string | null;
  line_total: number | string | null;
}

function branchName(rel: SupplyOrderRow['branch']): string {
  if (!rel) return 'Unknown branch';
  const obj = Array.isArray(rel) ? rel[0] : rel;
  return obj?.name ?? 'Unknown branch';
}

function mapOrder(row: SupplyOrderRow): SupplyOrder {
  return {
    id: row.id,
    referenceNo: row.reference_no,
    branchId: row.branch_id,
    branchName: branchName(row.branch),
    status: row.status,
    itemCount: toNum(row.item_count),
    totalAmount: toNum(row.total_amount),
    notes: row.notes ?? '',
    placedBy: row.placed_by ?? '',
    paymentMethod: row.payment_method ?? 'gcash',
    createdAt: row.created_at,
    items: (row.supply_order_item ?? []).map((i) => ({
      id: i.id,
      rawMaterialId: i.raw_material_id,
      name: i.name,
      packaging: i.packaging ?? '',
      unit: i.unit ?? 'unit',
      unitPrice: toNum(i.unit_price),
      quantity: toNum(i.quantity),
      lineTotal: toNum(i.line_total),
    })),
  };
}

/** Fetch supply orders for a brand (HQ view). Optionally scope to one branch. */
export async function fetchSupplyOrders(
  brandId: string,
  branchId?: string
): Promise<SupplyOrder[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('supply_order')
    .select(
      'id,reference_no,branch_id,status,item_count,total_amount,notes,placed_by,payment_method,created_at,branch(name),supply_order_item(id,raw_material_id,name,packaging,unit,unit_price,quantity,line_total)'
    )
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (branchId) query = query.eq('branch_id', branchId);

  const { data, error } = await query;
  if (error) return [];
  return ((data as SupplyOrderRow[] | null) ?? []).map(mapOrder);
}

export async function updateSupplyOrderStatus(
  orderId: string,
  status: SupplyOrderStatus,
  brandId?: string
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };
  const { error } = await supabase
    .from('supply_order')
    .update({ status })
    .eq('id', orderId);

  if (error) return { error: error.message };

  if (status === 'delivered') {
    const receive = await receiveSupplyOrderToInventory(orderId, brandId);
    if (receive.error) return { error: receive.error };
  }

  return { error: null };
}
