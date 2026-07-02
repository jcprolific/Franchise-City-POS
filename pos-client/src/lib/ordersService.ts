import { supabase, isSupabaseConfigured } from './supabase';
import { resolvePosOrderColumns } from './dashboardRealtime';
import { getManilaIsoDateKey, isSameManilaDate, toManilaTimeLabel, toRelativeTimeLabel } from './timezone';

export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'VOIDED';

export interface PosOrderRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  payment: string;
  paymentStatus: string;
  orderType: string;
  placedAt: string;
  timeLabel: string;
  relativeTime: string;
  paymentReference: string;
}

type RowRecord = Record<string, unknown>;

const STATUS_VALUES: OrderStatus[] = ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'VOIDED'];

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function asString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function normalizeStatus(value: unknown): OrderStatus {
  const raw = asString(value, 'NEW').toUpperCase();
  if (raw === 'VOID' || raw === 'VOIDED' || raw === 'CANCELLED' || raw === 'CANCELED') {
    return 'VOIDED';
  }
  if (STATUS_VALUES.includes(raw as OrderStatus)) {
    return raw as OrderStatus;
  }
  return 'COMPLETED';
}

function formatPaymentLabel(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'CASH') return 'Cash';
  if (normalized === 'GCASH') return 'GCash';
  if (normalized === 'CARD') return 'Card';
  return value || 'Unknown';
}

function formatOrderType(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'DINE_IN' || normalized === 'DINE-IN') return 'Dine-in';
  if (normalized === 'TAKE_OUT' || normalized === 'TAKEOUT' || normalized === 'TAKE-OUT') return 'Takeout';
  return value || 'Walk-in';
}

function rowToOrder(row: RowRecord, columns: Awaited<ReturnType<typeof resolvePosOrderColumns>>): PosOrderRecord {
  const id = asString(columns.primaryKey ? row[columns.primaryKey] : row.id);
  const orderNo = columns.orderNo ? row[columns.orderNo] : id;
  const dateValue = columns.date ? asString(row[columns.date]) : '';
  const payment = formatPaymentLabel(asString(columns.payment ? row[columns.payment] : 'Unknown'));
  const orderTypeRaw = columns.orderType ? asString(row[columns.orderType]) : '';

  return {
    id,
    orderNumber: `#${asString(orderNo, '---')}`,
    status: normalizeStatus(columns.status ? row[columns.status] : 'NEW'),
    itemCount: Math.max(1, Math.round(toNumber(columns.itemCount ? row[columns.itemCount] : 1))),
    subtotal: toNumber(columns.subtotal ? row[columns.subtotal] : 0),
    discountAmount: toNumber(columns.discountAmount ? row[columns.discountAmount] : 0),
    total: toNumber(columns.total ? row[columns.total] : 0),
    payment,
    paymentStatus: asString(columns.paymentStatus ? row[columns.paymentStatus] : 'PAID', 'PAID'),
    orderType: formatOrderType(orderTypeRaw),
    placedAt: dateValue,
    timeLabel: dateValue ? toManilaTimeLabel(dateValue) : '--',
    relativeTime: dateValue ? toRelativeTimeLabel(dateValue) : '--',
    paymentReference: columns.paymentReference ? asString(row[columns.paymentReference]) : '',
  };
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: 'New',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  VOIDED: 'Voided',
};

export const nextOrderStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  NEW: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COMPLETED',
};

export const orderActionLabels: Partial<Record<OrderStatus, string>> = {
  NEW: 'Start Prep',
  PREPARING: 'Mark Ready',
  READY: 'Complete',
  COMPLETED: 'View Receipt',
};

function formatOrdersError(error: unknown): string {
  if (!isSupabaseConfigured()) {
    return 'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.';
  }

  if (error instanceof TypeError && /fetch failed/i.test(error.message)) {
    return 'Cannot reach Supabase. The project URL may be wrong or the project is paused. Check pos-client/.env.local and restart the dev server.';
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = String(error.message);
    if (message.includes('Could not find the table')) {
      return 'pos_order table is missing in Supabase. Run supabase-pos-order-setup.sql in the SQL Editor.';
    }
    if (message.toLowerCase().includes('row-level security')) {
      return 'Supabase blocked access to pos_order. Run supabase-pos-order-policy.sql to enable read/update policies.';
    }
    return message;
  }

  return 'Unable to load orders from Supabase.';
}

export async function fetchTodayOrders(brandId?: string): Promise<PosOrderRecord[]> {
  if (!isSupabaseConfigured()) {
    throw new Error(formatOrdersError(null));
  }

  const columns = await resolvePosOrderColumns();
  const manilaToday = getManilaIsoDateKey(new Date());

  const { data, error } = await supabase.from('pos_order').select('*').limit(500);
  if (error) throw new Error(formatOrdersError(error));

  return ((data as RowRecord[] | null) ?? [])
    .filter((row) => {
      const dateValue = columns.date ? row[columns.date] : null;
      if (!dateValue || !isSameManilaDate(asString(dateValue), manilaToday)) {
        return false;
      }
      if (brandId && columns.brand) {
        return asString(row[columns.brand]) === brandId;
      }
      return true;
    })
    .map((row) => rowToOrder(row, columns))
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const columns = await resolvePosOrderColumns();
  if (!columns.primaryKey || !columns.status) {
    throw new Error('Order status updates are not supported by the current database schema.');
  }

  const payload: Record<string, unknown> = {
    [columns.status]: status,
  };
  if (status === 'COMPLETED' && columns.paymentStatus) {
    payload[columns.paymentStatus] = 'PAID';
  }
  if (status === 'VOIDED' && columns.paymentStatus) {
    payload[columns.paymentStatus] = 'VOIDED';
  }

  const { error } = await supabase
    .from('pos_order')
    .update(payload)
    .eq(columns.primaryKey, orderId);

  if (error) throw error;
}

export async function voidOrder(orderId: string): Promise<void> {
  return updateOrderStatus(orderId, 'VOIDED');
}

export function countOrdersByStatus(orders: PosOrderRecord[], status: OrderStatus) {
  return orders.filter((order) => order.status === status).length;
}
