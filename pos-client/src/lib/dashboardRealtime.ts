import { supabase } from './supabase';
import { getManilaIsoDateKey, isSameManilaDate, toManilaTimeLabel } from './timezone';

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

interface ColumnMap {
  primaryKey?: string;
  date?: string;
  total?: string;
  payment?: string;
  orderNo?: string;
  itemCount?: string;
  branch?: string;
  subtotal?: string;
  discountAmount?: string;
  status?: string;
  paymentStatus?: string;
  cashierId?: string;
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

async function columnExists(column: string) {
  const { error } = await supabase.from('pos_order').select(column).limit(1);
  return !error;
}

async function pickFirstExistingColumn(candidates: string[]) {
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

export async function resolvePosOrderColumns(): Promise<ColumnMap> {
  const [primaryKey, date, total, payment, orderNo, itemCount, branch, subtotal, discountAmount, status, paymentStatus, cashierId] = await Promise.all([
    pickFirstExistingColumn(PRIMARY_KEY_COLUMNS),
    pickFirstExistingColumn(DATE_COLUMNS),
    pickFirstExistingColumn(TOTAL_COLUMNS),
    pickFirstExistingColumn(PAYMENT_COLUMNS),
    pickFirstExistingColumn(ORDER_NUMBER_COLUMNS),
    pickFirstExistingColumn(ITEM_COUNT_COLUMNS),
    pickFirstExistingColumn(BRANCH_COLUMNS),
    pickFirstExistingColumn(['subtotal']),
    pickFirstExistingColumn(['discount_amount']),
    pickFirstExistingColumn(['status']),
    pickFirstExistingColumn(['payment_status']),
    pickFirstExistingColumn(['cashier_id']),
  ]);

  return { primaryKey, date, total, payment, orderNo, itemCount, branch, subtotal, discountAmount, status, paymentStatus, cashierId };
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
    .slice(0, 8)
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
    subtotal: number;
    discountAmount: number;
    total: number;
    itemCount: number;
    branchValue?: string;
    cashierId?: string;
  }
) {
  const data: Record<string, unknown> = {};
  if (columns.orderNo) data[columns.orderNo] = payload.orderNumber;
  if (columns.payment) data[columns.payment] = payload.paymentMethod;
  if (columns.total) data[columns.total] = payload.total;
  if (columns.itemCount) data[columns.itemCount] = payload.itemCount;
  if (columns.date) data[columns.date] = new Date().toISOString();
  if (columns.branch && payload.branchValue) data[columns.branch] = payload.branchValue;
  if (columns.subtotal) data[columns.subtotal] = payload.subtotal;
  if (columns.discountAmount) data[columns.discountAmount] = payload.discountAmount;
  if (columns.status) data[columns.status] = 'COMPLETED';
  if (columns.paymentStatus) data[columns.paymentStatus] = 'PAID';
  if (columns.cashierId && payload.cashierId) data[columns.cashierId] = payload.cashierId;

  return data;
}

