import { supabase } from './supabase';
import { withTimeout, SUPABASE_TIMEOUT_MS } from './withTimeout';
import { getManilaIsoDateKey, isSameManilaDate, toManilaTimeLabel } from './timezone';
import { isCountablePaidSale } from './saleEligibility';

export interface DashboardTransaction {
  id: string;
  time: string;
  items: number;
  total: number;
  payment: string;
}

export interface LiveDashboardData {
  todaySales: number;
  todaySalesChange: number;
  totalOrders: number;
  ordersChange: number;
  avgOrderValue: number;
  avgOrderChange: number;
  recentTransactions: DashboardTransaction[];
}

type RowRecord = Record<string, unknown>;

const DATE_COLUMNS = ['created_at', 'ordered_at', 'order_date', 'timestamp', 'createdon'];
const TOTAL_COLUMNS = ['total_amount', 'total', 'grand_total', 'amount_due', 'amount'];
const PAYMENT_COLUMNS = ['payment_method', 'payment_type', 'payment'];
const ORDER_NUMBER_COLUMNS = ['order_number', 'receipt_number', 'reference_no'];
const PRIMARY_KEY_COLUMNS = ['id'];
const ITEM_COUNT_COLUMNS = ['item_count', 'items_count', 'total_items', 'quantity'];
const BRANCH_COLUMNS = ['branch_id', 'branch_name', 'store_id', 'location_id'];
const BRAND_COLUMNS = ['brand_id', 'brand_name'];

interface ColumnMap {
  primaryKey?: string;
  date?: string;
  total?: string;
  payment?: string;
  orderNo?: string;
  itemCount?: string;
  branch?: string;
  brand?: string;
  brandName?: string;
  subtotal?: string;
  discountAmount?: string;
  discountType?: string;
  voidReason?: string;
  refundAmount?: string;
  status?: string;
  paymentStatus?: string;
  cashierId?: string;
  paymentReference?: string;
  orderType?: string;
}

const DEFAULT_POS_ORDER_COLUMNS: ColumnMap = {
  primaryKey: 'id',
  date: 'created_at',
  total: 'total_amount',
  payment: 'payment_method',
  orderNo: 'order_number',
  itemCount: 'item_count',
  branch: 'branch_id',
  brand: 'brand_id',
  brandName: 'brand_name',
  subtotal: 'subtotal',
  discountAmount: 'discount_amount',
  discountType: 'discount_type',
  voidReason: 'void_reason',
  refundAmount: 'refund_amount',
  status: 'status',
  paymentStatus: 'payment_status',
  cashierId: 'cashier_id',
  paymentReference: 'payment_reference',
  orderType: 'order_type',
};

let cachedColumns: ColumnMap | null = null;

function pickColumn(keys: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => keys.has(candidate));
}

function buildColumnMapFromRow(row: RowRecord): ColumnMap {
  const keys = new Set(Object.keys(row));
  return {
    primaryKey: pickColumn(keys, PRIMARY_KEY_COLUMNS),
    date: pickColumn(keys, DATE_COLUMNS),
    total: pickColumn(keys, TOTAL_COLUMNS),
    payment: pickColumn(keys, PAYMENT_COLUMNS),
    orderNo: pickColumn(keys, ORDER_NUMBER_COLUMNS),
    itemCount: pickColumn(keys, ITEM_COUNT_COLUMNS),
    branch: pickColumn(keys, BRANCH_COLUMNS),
    brand: pickColumn(keys, BRAND_COLUMNS),
    brandName: pickColumn(keys, ['brand_name']),
    subtotal: pickColumn(keys, ['subtotal']),
    discountAmount: pickColumn(keys, ['discount_amount']),
    discountType: pickColumn(keys, ['discount_type']),
    voidReason: pickColumn(keys, ['void_reason']),
    refundAmount: pickColumn(keys, ['refund_amount']),
    status: pickColumn(keys, ['status']),
    paymentStatus: pickColumn(keys, ['payment_status']),
    cashierId: pickColumn(keys, ['cashier_id']),
    paymentReference: pickColumn(keys, ['payment_reference', 'reference_no', 'gcash_reference_no', 'transaction_reference']),
    orderType: pickColumn(keys, ['order_type', 'service_type']),
  };
}

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

export async function resolvePosOrderColumns(): Promise<ColumnMap> {
  if (cachedColumns) {
    return cachedColumns;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.from('pos_order').select('*').limit(1),
      SUPABASE_TIMEOUT_MS,
      'pos_order column probe timed out'
    );
    if (!error && data?.[0]) {
      cachedColumns = buildColumnMapFromRow(data[0] as RowRecord);
      return cachedColumns;
    }
  } catch {
    /* use defaults below */
  }

  cachedColumns = { ...DEFAULT_POS_ORDER_COLUMNS };
  return cachedColumns;
}

export function preloadPosOrderColumns() {
  void resolvePosOrderColumns();
}

function toTransaction(row: RowRecord, columns: ColumnMap): DashboardTransaction {
  const dateValue = columns.date ? row[columns.date] : null;
  const totalValue = columns.total ? row[columns.total] : 0;
  const paymentValue = columns.payment ? row[columns.payment] : 'Unknown';
  const itemCountValue = columns.itemCount ? row[columns.itemCount] : 1;
  const orderNoValue = columns.orderNo
    ? row[columns.orderNo]
    : columns.primaryKey
      ? row[columns.primaryKey]
      : row.id;

  return {
    id: `#${asString(orderNoValue, '---')}`,
    time: dateValue ? toManilaTimeLabel(asString(dateValue)) : '--',
    items: Math.max(1, Math.round(toNumber(itemCountValue))),
    total: toNumber(totalValue),
    payment: asString(paymentValue, 'Unknown'),
  };
}

export function buildLiveDashboardData(
  rows: RowRecord[],
  columns: ColumnMap,
  previousRows: RowRecord[]
): LiveDashboardData {
  const todaySales = rows.reduce((sum, row) => sum + toNumber(columns.total ? row[columns.total] : 0), 0);
  const totalOrders = rows.length;
  const avgOrderValue = totalOrders > 0 ? todaySales / totalOrders : 0;

  const prevSales = previousRows.reduce(
    (sum, row) => sum + toNumber(columns.total ? row[columns.total] : 0),
    0
  );
  const prevOrders = previousRows.length;
  const prevAvg = prevOrders > 0 ? prevSales / prevOrders : 0;

  const todaySalesChange = prevSales > 0 ? ((todaySales - prevSales) / prevSales) * 100 : 0;
  const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;
  const avgOrderChange = prevAvg > 0 ? ((avgOrderValue - prevAvg) / prevAvg) * 100 : 0;

  const recentTransactions = [...rows]
    .sort((a, b) => {
      const aTime = columns.date ? new Date(asString(a[columns.date])).getTime() : 0;
      const bTime = columns.date ? new Date(asString(b[columns.date])).getTime() : 0;
      return bTime - aTime;
    })
    .map((row) => toTransaction(row, columns));

  return {
    todaySales,
    todaySalesChange,
    totalOrders,
    ordersChange,
    avgOrderValue,
    avgOrderChange,
    recentTransactions,
  };
}

function isCountableSale(row: RowRecord, columns: ColumnMap) {
  const status = columns.status ? asString(row[columns.status], 'NEW') : null;
  const paymentStatus = columns.paymentStatus
    ? asString(row[columns.paymentStatus], 'PAID')
    : null;
  return isCountablePaidSale(status, paymentStatus);
}

export async function fetchLiveDashboardData(branchValue?: string) {
  const columns = await resolvePosOrderColumns();
  const manilaToday = getManilaIsoDateKey(new Date());

  const { data, error } = await supabase.from('pos_order').select('*').limit(500);
  if (error) throw error;

  const rows = ((data as RowRecord[] | null) ?? []).filter((row) => {
    const dateValue = columns.date ? row[columns.date] : null;
    if (!dateValue) return false;
    const sameDay = isSameManilaDate(asString(dateValue), manilaToday);
    if (!sameDay) return false;
    if (!isCountableSale(row, columns)) return false;
    if (columns.branch && branchValue) {
      return asString(row[columns.branch]) === branchValue;
    }
    return true;
  });

  const prevRows = ((data as RowRecord[] | null) ?? []).filter((row) => {
    const dateValue = columns.date ? row[columns.date] : null;
    if (!dateValue) return false;
    const sameDay = isSameManilaDate(asString(dateValue), manilaToday);
    if (sameDay) return false;
    if (!isCountableSale(row, columns)) return false;
    if (columns.branch && branchValue) {
      return asString(row[columns.branch]) === branchValue;
    }
    return true;
  });

  return {
    columns,
    dashboard: buildLiveDashboardData(rows, columns, prevRows),
  };
}

export function getInsertPayloadForPosOrder(
  columns: ColumnMap,
  payload: {
    orderNumber: number;
    paymentMethod: string;
    paymentReference?: string;
    subtotal: number;
    discountAmount: number;
    discountType?: string;
    total: number;
    itemCount: number;
    branchValue?: string;
    brandId?: string;
    brandName?: string;
    cashierId?: string;
    status?: string;
    orderType?: string;
  }
) {
  const data: Record<string, unknown> = {};
  if (columns.orderNo) data[columns.orderNo] = payload.orderNumber;
  if (columns.payment) data[columns.payment] = payload.paymentMethod;
  if (columns.total) data[columns.total] = payload.total;
  if (columns.itemCount) data[columns.itemCount] = payload.itemCount;
  if (columns.date) data[columns.date] = new Date().toISOString();
  if (columns.branch && payload.branchValue) data[columns.branch] = payload.branchValue;
  if (columns.brand && payload.brandId) data[columns.brand] = payload.brandId;
  if (columns.brandName && payload.brandName) data[columns.brandName] = payload.brandName;
  if (columns.subtotal) data[columns.subtotal] = payload.subtotal;
  if (columns.discountAmount) data[columns.discountAmount] = payload.discountAmount;
  if (columns.discountType && payload.discountType) data[columns.discountType] = payload.discountType;
  if (columns.status) data[columns.status] = payload.status ?? 'NEW';
  if (columns.paymentStatus) data[columns.paymentStatus] = 'PAID';
  if (columns.cashierId && payload.cashierId) data[columns.cashierId] = payload.cashierId;
  if (columns.paymentReference && payload.paymentReference) {
    data[columns.paymentReference] = payload.paymentReference;
  }
  if (columns.orderType && payload.orderType) {
    data[columns.orderType] = payload.orderType;
  }

  return data;
}

