import { supabase, isSupabaseConfigured } from './supabase';
import type { CartItem } from '../types';

export interface PosOrderItemRow {
  id: string;
  pos_order_id: string;
  product_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface ProductSalesRow {
  productName: string;
  quantity: number;
  revenue: number;
}

function toNum(v: number | string | null | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  return 0;
}

export function cartItemsToRows(cartItems: CartItem[]) {
  return cartItems.map((item) => ({
    product_id: item.product.id,
    product_name: item.product.name,
    variant_name: item.variant?.name ?? null,
    quantity: item.quantity,
    unit_price: item.line_total / Math.max(item.quantity, 1),
    line_total: item.line_total,
  }));
}

export async function insertPosOrderItems(
  orderId: string,
  cartItems: CartItem[]
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured() || cartItems.length === 0) {
    return { error: null };
  }

  const rows = cartItemsToRows(cartItems).map((row) => ({
    pos_order_id: orderId,
    ...row,
  }));

  const { error } = await supabase.from('pos_order_item').insert(rows);
  return { error: error?.message ?? null };
}

interface InsertOrderOptions {
  clientOrderId?: string;
}

/** Insert order header then line items; returns order id. */
export async function insertPosOrderWithItems(
  headerPayload: Record<string, unknown>,
  cartItems: CartItem[],
  options?: InsertOrderOptions
): Promise<{ orderId: string | null; error: string | null }> {
  if (options?.clientOrderId) {
    const { data: existing, error: lookupError } = await supabase
      .from('pos_order')
      .select('id')
      .eq('client_order_id', options.clientOrderId)
      .maybeSingle();

    if (lookupError) {
      return { orderId: null, error: lookupError.message };
    }
    if (existing?.id) {
      return { orderId: existing.id as string, error: null };
    }
  }

  const { data, error } = await supabase
    .from('pos_order')
    .insert(headerPayload)
    .select('id')
    .single();

  if (error || !data) {
    return { orderId: null, error: error?.message ?? 'insert-failed' };
  }

  const orderId = (data as { id: string }).id;
  const itemsResult = await insertPosOrderItems(orderId, cartItems);
  if (itemsResult.error) {
    await supabase.from('pos_order').delete().eq('id', orderId);
    return { orderId: null, error: itemsResult.error };
  }

  return { orderId, error: null };
}

export async function fetchProductSales(
  brandId: string,
  startIso: string,
  endIso: string,
  branchId?: string
): Promise<ProductSalesRow[]> {
  if (!isSupabaseConfigured()) return [];

  let orderQuery = supabase
    .from('pos_order')
    .select('id, created_at, branch_id, brand_id, status, payment_status')
    .eq('brand_id', brandId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (branchId) orderQuery = orderQuery.eq('branch_id', branchId);

  const { data: orders, error: orderError } = await orderQuery;
  if (orderError || !orders?.length) return [];

  const validIds = orders
    .filter((o) => {
      const row = o as Record<string, unknown>;
      const status = String(row.status ?? 'COMPLETED').toUpperCase();
      const pay = String(row.payment_status ?? 'PAID').toUpperCase();
      return status === 'COMPLETED' && pay === 'PAID';
    })
    .map((o) => (o as { id: string }).id);

  if (validIds.length === 0) return [];

  const { data: items, error: itemError } = await supabase
    .from('pos_order_item')
    .select('product_name, quantity, line_total')
    .in('pos_order_id', validIds);

  if (itemError || !items) return [];

  const map = new Map<string, ProductSalesRow>();
  for (const raw of items) {
    const row = raw as { product_name: string; quantity: number | string; line_total: number | string };
    const name = row.product_name;
    const existing = map.get(name) ?? { productName: name, quantity: 0, revenue: 0 };
    existing.quantity += toNum(row.quantity);
    existing.revenue += toNum(row.line_total);
    map.set(name, existing);
  }

  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}
