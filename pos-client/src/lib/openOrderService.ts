import type { CartItem, DiscountType, OrderType, PaymentMethod } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { getInsertPayloadForPosOrder, resolvePosOrderColumns } from './dashboardRealtime';
import { getCurrentBranch, isSeedBranchId } from './branchContext';
import { getActiveShiftLocal } from './shiftService';
import { getTerminalId } from './terminalContext';
import { createLocalOrderId } from './offline/offlineOrderQueue';
import { replacePosOrderItems } from './posOrderItemService';
import { deductInventoryForOrder } from './recipeDeductionService';

export interface OpenOrderDraft {
  orderNumber: number;
  orderType: OrderType;
  discountType: DiscountType;
  promoPercent?: number;
  customerName: string;
  orderNote: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  cartItems: CartItem[];
}

export interface OpenOrderSession {
  orderId: string;
  clientOrderId: string;
  orderNumber: number;
}

function canSyncToCloud(branchId: string) {
  return isSupabaseConfigured() && branchId && !isSeedBranchId(branchId) && navigator.onLine;
}

export async function createOpenPosOrder(input: {
  brandId: string;
  brandName: string;
  cashierId?: string;
  cashierName: string;
  orderNumber: number;
  orderType: OrderType;
}): Promise<{ session: OpenOrderSession | null; error: string | null }> {
  const branch = getCurrentBranch();
  if (!canSyncToCloud(branch.id)) {
    return {
      session: null,
      error: null,
    };
  }

  const columns = await resolvePosOrderColumns();
  const shift = getActiveShiftLocal();
  const clientOrderId = createLocalOrderId();

  const payload = getInsertPayloadForPosOrder(columns, {
    orderNumber: input.orderNumber,
    paymentMethod: 'CASH',
    subtotal: 0,
    discountAmount: 0,
    discountType: 'NONE',
    total: 0,
    itemCount: 0,
    branchValue: branch.id,
    brandId: input.brandId,
    brandName: input.brandName,
    cashierId: input.cashierId,
    cashierName: input.cashierName,
    shiftId: shift?.id,
    status: 'NEW',
    paymentStatus: 'UNPAID',
    orderType: input.orderType,
  });

  payload.client_order_id = clientOrderId;
  payload.terminal_id = getTerminalId();
  payload.started_by_name = input.cashierName;

  const { data, error } = await supabase.from('pos_order').insert(payload).select('id').single();
  if (error || !data) {
    return { session: null, error: error?.message ?? 'open-order-insert-failed' };
  }

  return {
    session: {
      orderId: String((data as { id: string }).id),
      clientOrderId,
      orderNumber: input.orderNumber,
    },
    error: null,
  };
}

export async function syncOpenPosOrder(
  session: OpenOrderSession,
  draft: OpenOrderDraft,
  paymentMethod: PaymentMethod
): Promise<{ error: string | null }> {
  const branch = getCurrentBranch();
  if (!canSyncToCloud(branch.id)) return { error: null };

  const columns = await resolvePosOrderColumns();
  if (!columns.primaryKey) return { error: 'schema-missing-primary-key' };

  const patch: Record<string, unknown> = {
    subtotal: draft.subtotal,
    discount_amount: draft.discountAmount,
    discount_type: draft.discountType,
    total_amount: draft.total,
    item_count: draft.itemCount,
    customer_name: draft.customerName || null,
    order_note: draft.orderNote || null,
    order_type: draft.orderType,
    payment_method: paymentMethod,
    promo_percent: draft.discountType === 'PROMO' ? draft.promoPercent ?? 0 : null,
  };
  if (columns.total) patch[columns.total] = draft.total;
  if (columns.itemCount) patch[columns.itemCount] = draft.itemCount;

  const { error } = await supabase
    .from('pos_order')
    .update(patch)
    .eq(columns.primaryKey, session.orderId)
    .eq('status', 'NEW');

  if (error) return { error: error.message };

  return replacePosOrderItems(session.orderId, draft.cartItems);
}

export async function completeOpenPosOrder(input: {
  session: OpenOrderSession;
  draft: OpenOrderDraft;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  cashierId?: string;
  cashierName: string;
  brandId: string;
  branchId: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };

  const columns = await resolvePosOrderColumns();
  if (!columns.primaryKey) return { error: 'schema-missing-primary-key' };

  const syncResult = await syncOpenPosOrder(
    input.session,
    input.draft,
    input.paymentMethod
  );
  if (syncResult.error) return syncResult;

  const patch: Record<string, unknown> = {
    status: 'COMPLETED',
    payment_status: 'PAID',
    payment_method: input.paymentMethod,
    subtotal: input.draft.subtotal,
    discount_amount: input.draft.discountAmount,
    discount_type: input.draft.discountType,
    total_amount: input.draft.total,
    item_count: input.draft.itemCount,
    customer_name: input.draft.customerName || null,
    order_note: input.draft.orderNote || null,
    charged_by: input.cashierId ?? null,
    charged_by_name: input.cashierName,
    completed_at: new Date().toISOString(),
  };
  if (columns.paymentReference && input.paymentReference) {
    patch[columns.paymentReference] = input.paymentReference;
  }

  const { error } = await supabase
    .from('pos_order')
    .update(patch)
    .eq(columns.primaryKey, input.session.orderId);

  if (error) return { error: error.message };

  void deductInventoryForOrder({
    brandId: input.brandId,
    branchId: input.branchId,
    cartItems: input.draft.cartItems,
    orderId: input.session.orderId,
    createdBy: input.cashierId ?? input.cashierName,
  });

  return { error: null };
}

export async function completeOpenPosOrderFromQueue(
  openOrderId: string,
  header: Record<string, unknown>,
  cartItems: CartItem[]
): Promise<{ error: string | null }> {
  const draft: OpenOrderDraft = {
    orderNumber: Number(header.order_number ?? header.order_no ?? 0),
    orderType: (header.order_type as OrderType) ?? 'DINE_IN',
    discountType: (header.discount_type as DiscountType) ?? 'NONE',
    promoPercent: header.promo_percent != null ? Number(header.promo_percent) : undefined,
    customerName: String(header.customer_name ?? ''),
    orderNote: String(header.order_note ?? ''),
    subtotal: Number(header.subtotal ?? 0),
    discountAmount: Number(header.discount_amount ?? 0),
    total: Number(header.total_amount ?? header.total ?? 0),
    itemCount: Number(header.item_count ?? 0),
    cartItems,
  };

  const session: OpenOrderSession = {
    orderId: openOrderId,
    clientOrderId: String(header.client_order_id ?? createLocalOrderId()),
    orderNumber: draft.orderNumber,
  };

  const syncResult = await syncOpenPosOrder(
    session,
    draft,
    (header.payment_method as PaymentMethod) ?? 'CASH'
  );
  if (syncResult.error) return syncResult;

  return completeOpenPosOrder({
    session,
    draft,
    paymentMethod: (header.payment_method as PaymentMethod) ?? 'CASH',
    paymentReference: header.payment_reference ? String(header.payment_reference) : undefined,
    cashierId: header.cashier_id ? String(header.cashier_id) : undefined,
    cashierName: String(header.charged_by_name ?? header.cashier_name ?? 'Staff'),
    brandId: String(header.brand_id ?? ''),
    branchId: String(header.branch_id ?? ''),
  });
}
