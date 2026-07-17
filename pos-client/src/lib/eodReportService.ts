import { supabase, isSupabaseConfigured } from './supabase';
import { resolvePosOrderColumns } from './dashboardRealtime';
import { isCountablePaidSale } from './saleEligibility';
import { getManilaIsoDateKey } from './timezone';
import type { BrandConfig } from '../brands/types';

export type EodReportStatus = 'draft' | 'submitted';

export interface EodLineRow {
  key: string;
  label: string;
  price: number;
  qty: number;
  total: number;
}

export interface EodExpenseRow {
  id: string;
  description: string;
  amount: number;
}

export interface EodReportData {
  mainSizes: EodLineRow[];
  specialFlavors: EodLineRow[];
  frappe: EodLineRow[];
  freeUpsize: number;
  freeAddon: number;
  freeDrink: number;
  missing: number;
  reject: number;
  addons: EodLineRow[];
  expenses: EodExpenseRow[];
}

export interface EodReport {
  id: string;
  branchId: string;
  brandId: string;
  reportDate: string;
  status: EodReportStatus;
  reportData: EodReportData;
  drinksSubtotal: number;
  addonsTotal: number;
  expensesTotal: number;
  totalSales: number;
  totalNetSales: number;
  gcashPayment: number;
  cashOnHand: number;
  yesterdayBalance: number;
  totalCashOnHand: number;
  totalCupsSold: number;
  posTotalSales: number | null;
  submittedBy: string | null;
  submittedAt: string | null;
  notes: string | null;
}

export interface EodReportSummary {
  id: string;
  branchId: string;
  branchName: string;
  reportDate: string;
  status: EodReportStatus;
  totalSales: number;
  totalNetSales: number;
  totalCupsSold: number;
  gcashPayment: number;
  cashOnHand: number;
  posTotalSales: number | null;
  submittedAt: string | null;
  submittedBy: string | null;
}

export const EOD_MAIN_SIZES = [
  { key: 'main-12oz', label: '12oz', price: 33 },
  { key: 'main-16oz', label: '16oz', price: 49 },
  { key: 'main-22oz', label: '22oz', price: 59 },
  { key: 'main-hct', label: 'HCTDRINKS', price: 39 },
] as const;

export const EOD_SPECIAL_SIZES = [
  { key: 'special-12oz', label: '12oz', price: 49 },
  { key: 'special-16oz', label: '16oz', price: 59 },
  { key: 'special-22oz', label: '22oz', price: 69 },
] as const;

export const EOD_FRAPPE_SIZES = [
  { key: 'frappe-12oz', label: '12oz', price: 59 },
  { key: 'frappe-16oz', label: '16oz', price: 69 },
  { key: 'frappe-22oz', label: '22oz', price: 79 },
] as const;

export const EOD_ADDONS = [
  { key: 'addon-pearl', label: 'PEARL/NATA/FB', price: 10 },
  { key: 'addon-cream', label: 'CREAM CHEESE', price: 10 },
  { key: 'addon-espresso', label: 'ESPRESSO SHOT', price: 5 },
  { key: 'addon-jelly', label: 'Coffee Jelly', price: 10 },
  { key: 'addon-whip', label: 'Whipped Cream', price: 10 },
  { key: 'addon-yakult', label: 'Yakult', price: 10 },
] as const;

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  return 0;
}

function emptyLineRows(
  defs: readonly { key: string; label: string; price: number }[]
): EodLineRow[] {
  return defs.map((d) => ({ key: d.key, label: d.label, price: d.price, qty: 0, total: 0 }));
}

export function createEmptyEodReportData(): EodReportData {
  return {
    mainSizes: emptyLineRows(EOD_MAIN_SIZES),
    specialFlavors: emptyLineRows(EOD_SPECIAL_SIZES),
    frappe: emptyLineRows(EOD_FRAPPE_SIZES),
    freeUpsize: 0,
    freeAddon: 0,
    freeDrink: 0,
    missing: 0,
    reject: 0,
    addons: emptyLineRows(EOD_ADDONS),
    expenses: [],
  };
}

function normalizeSize(variantName: string | null): '12oz' | '16oz' | '22oz' | null {
  if (!variantName) return null;
  const v = variantName.toLowerCase();
  if (v.includes('12')) return '12oz';
  if (v.includes('16')) return '16oz';
  if (v.includes('22')) return '22oz';
  return null;
}

function classifyDrinkSection(
  brand: BrandConfig,
  productId: string | null,
  unitPrice: number
): 'main' | 'special' | 'frappe' {
  const product = brand.menu.products.find((p) => p.id === productId);
  if (product?.category_id === 'cat-c3') return 'frappe';
  if (product && product.base_price >= 49) return 'special';
  if (unitPrice >= 69) return 'frappe';
  if (unitPrice >= 49 && unitPrice < 59) return 'special';
  if (unitPrice <= 39) return 'main';
  return 'main';
}

function findRowKey(section: 'main' | 'special' | 'frappe', size: '12oz' | '16oz' | '22oz' | null, unitPrice: number): string | null {
  if (section === 'frappe') {
    if (size) return `frappe-${size}`;
    if (unitPrice >= 79) return 'frappe-22oz';
    if (unitPrice >= 69) return 'frappe-16oz';
    return 'frappe-12oz';
  }
  if (section === 'special') {
    if (size) return `special-${size}`;
    if (unitPrice >= 69) return 'special-22oz';
    if (unitPrice >= 59) return 'special-16oz';
    return 'special-12oz';
  }
  if (size) return `main-${size}`;
  if (unitPrice >= 55) return 'main-22oz';
  if (unitPrice >= 45) return 'main-16oz';
  if (Math.abs(unitPrice - 39) <= 2) return 'main-hct';
  return 'main-12oz';
}

function bumpRow(rows: EodLineRow[], key: string, qty: number, total: number) {
  const row = rows.find((r) => r.key === key);
  if (!row) return;
  row.qty += qty;
  row.total += total;
}

function parseReportData(raw: unknown): EodReportData {
  const base = createEmptyEodReportData();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Record<string, unknown>;

  const mergeLines = (target: EodLineRow[], source: unknown) => {
    if (!Array.isArray(source)) return;
    for (const item of source) {
      const row = item as Record<string, unknown>;
      const key = String(row.key ?? '');
      const existing = target.find((r) => r.key === key);
      if (!existing) continue;
      existing.qty = toNum(row.qty);
      existing.total = toNum(row.total);
    }
  };

  mergeLines(base.mainSizes, data.mainSizes);
  mergeLines(base.specialFlavors, data.specialFlavors);
  mergeLines(base.frappe, data.frappe);
  mergeLines(base.addons, data.addons);

  base.freeUpsize = toNum(data.freeUpsize);
  base.freeAddon = toNum(data.freeAddon);
  base.freeDrink = toNum(data.freeDrink);
  base.missing = toNum(data.missing);
  base.reject = toNum(data.reject);

  if (Array.isArray(data.expenses)) {
    base.expenses = data.expenses.map((e, i) => {
      const row = e as Record<string, unknown>;
      return {
        id: String(row.id ?? `exp-${i}`),
        description: String(row.description ?? ''),
        amount: toNum(row.amount),
      };
    });
  }

  return base;
}

function mapDbRow(row: Record<string, unknown>): EodReport {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    brandId: String(row.brand_id),
    reportDate: String(row.report_date),
    status: (row.status as EodReportStatus) ?? 'draft',
    reportData: parseReportData(row.report_data),
    drinksSubtotal: toNum(row.drinks_subtotal),
    addonsTotal: toNum(row.addons_total),
    expensesTotal: toNum(row.expenses_total),
    totalSales: toNum(row.total_sales),
    totalNetSales: toNum(row.total_net_sales),
    gcashPayment: toNum(row.gcash_payment),
    cashOnHand: toNum(row.cash_on_hand),
    yesterdayBalance: toNum(row.yesterday_balance),
    totalCashOnHand: toNum(row.total_cash_on_hand),
    totalCupsSold: toNum(row.total_cups_sold),
    posTotalSales: row.pos_total_sales != null ? toNum(row.pos_total_sales) : null,
    submittedBy: row.submitted_by != null ? String(row.submitted_by) : null,
    submittedAt: row.submitted_at != null ? String(row.submitted_at) : null,
    notes: row.notes != null ? String(row.notes) : null,
  };
}

export function computeEodTotals(data: EodReportData, yesterdayBalance = 0, gcashPayment = 0) {
  const drinkRows = [...data.mainSizes, ...data.specialFlavors, ...data.frappe];
  const drinksSubtotal = drinkRows.reduce((sum, r) => sum + r.qty * r.price, 0);
  const addonsTotal = data.addons.reduce((sum, r) => sum + r.qty * r.price, 0);
  const totalSales = drinksSubtotal + addonsTotal;
  const expensesTotal = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalNetSales = totalSales - expensesTotal;
  const cashOnHand = totalNetSales - gcashPayment;
  const totalCashOnHand = cashOnHand + yesterdayBalance;
  const totalCupsSold =
    drinkRows.reduce((sum, r) => sum + r.qty, 0) +
    data.freeUpsize +
    data.freeAddon +
    data.freeDrink;

  return {
    drinksSubtotal,
    addonsTotal,
    totalSales,
    expensesTotal,
    totalNetSales,
    cashOnHand,
    totalCashOnHand,
    totalCupsSold,
  };
}

export function updateLineQty(rows: EodLineRow[], key: string, qty: number): EodLineRow[] {
  return rows.map((r) =>
    r.key === key ? { ...r, qty: Math.max(0, qty), total: Math.max(0, qty) * r.price } : r
  );
}

async function fetchPosDayData(
  brandId: string,
  branchId: string,
  reportDate: string,
  brand: BrandConfig
): Promise<{ reportData: EodReportData; posTotalSales: number; gcashPayment: number }> {
  const reportData = createEmptyEodReportData();
  let posTotalSales = 0;
  let gcashPayment = 0;

  if (!isSupabaseConfigured()) {
    return { reportData, posTotalSales, gcashPayment };
  }

  const columns = await resolvePosOrderColumns();
  const start = `${reportDate}T00:00:00+08:00`;
  const end = `${reportDate}T23:59:59+08:00`;

  let orderQuery = supabase
    .from('pos_order')
    .select('*')
    .eq('brand_id', brandId)
    .gte(columns.date ?? 'created_at', start)
    .lte(columns.date ?? 'created_at', end);

  if (columns.branch) orderQuery = orderQuery.eq(columns.branch, branchId);

  const { data: orders, error } = await orderQuery;
  if (error || !orders?.length) {
    return { reportData, posTotalSales, gcashPayment };
  }

  const paidOrders = orders.filter((o) => {
    const row = o as Record<string, unknown>;
    return isCountablePaidSale(
      row[columns.status ?? 'status'] != null ? String(row[columns.status ?? 'status']) : null,
      row[columns.paymentStatus ?? 'payment_status'] != null
        ? String(row[columns.paymentStatus ?? 'payment_status'])
        : null
    );
  });

  for (const order of paidOrders) {
    const row = order as Record<string, unknown>;
    posTotalSales += toNum(row[columns.total ?? 'total_amount']);
    const payment = String(row[columns.payment ?? 'payment_method'] ?? '').toLowerCase();
    if (payment.includes('gcash') || payment.includes('g-cash')) {
      gcashPayment += toNum(row[columns.total ?? 'total_amount']);
    }
  }

  const orderIds = paidOrders.map((o) => (o as { id: string }).id);
  if (orderIds.length === 0) {
    return { reportData, posTotalSales, gcashPayment };
  }

  const { data: items } = await supabase
    .from('pos_order_item')
    .select('product_id, product_name, variant_name, quantity, unit_price, line_total')
    .in('pos_order_id', orderIds);

  for (const raw of items ?? []) {
    const item = raw as Record<string, unknown>;
    const qty = toNum(item.quantity);
    const lineTotal = toNum(item.line_total);
    const unitPrice = toNum(item.unit_price);
    const productId = item.product_id != null ? String(item.product_id) : null;
    const productName = String(item.product_name ?? '').toLowerCase();
    const size = normalizeSize(item.variant_name != null ? String(item.variant_name) : null);

    const addonMatch = EOD_ADDONS.find((a) => productName.includes(a.label.split('/')[0].toLowerCase()) || productName.includes(a.label.toLowerCase()));
    if (addonMatch || productName.includes('pearl') || productName.includes('espresso') || productName.includes('cream cheese')) {
      const key = addonMatch?.key ?? (productName.includes('espresso') ? 'addon-espresso' : productName.includes('cream') ? 'addon-cream' : 'addon-pearl');
      bumpRow(reportData.addons, key, qty, lineTotal);
      continue;
    }

    const section = classifyDrinkSection(brand, productId, unitPrice);
    const rowKey = findRowKey(section, size, unitPrice);
    if (!rowKey) continue;

    if (section === 'main') bumpRow(reportData.mainSizes, rowKey, qty, lineTotal);
    else if (section === 'special') bumpRow(reportData.specialFlavors, rowKey, qty, lineTotal);
    else bumpRow(reportData.frappe, rowKey, qty, lineTotal);
  }

  return { reportData, posTotalSales, gcashPayment };
}

async function fetchYesterdayBalance(
  branchId: string,
  reportDate: string
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const d = new Date(`${reportDate}T12:00:00`);
  d.setDate(d.getDate() - 1);
  const prevDate = getManilaIsoDateKey(d);

  const { data } = await supabase
    .from('branch_daily_report')
    .select('total_cash_on_hand')
    .eq('branch_id', branchId)
    .eq('report_date', prevDate)
    .maybeSingle();

  return data ? toNum((data as { total_cash_on_hand: number }).total_cash_on_hand) : 0;
}

export async function loadEodReport(input: {
  brandId: string;
  branchId: string;
  branchName: string;
  brand: BrandConfig;
  reportDate?: string;
  submittedBy?: string;
}): Promise<EodReport> {
  const reportDate = input.reportDate ?? getManilaIsoDateKey();

  if (isSupabaseConfigured()) {
    const { data: existing } = await supabase
      .from('branch_daily_report')
      .select('*')
      .eq('branch_id', input.branchId)
      .eq('report_date', reportDate)
      .maybeSingle();

    if (existing) {
      return mapDbRow(existing as Record<string, unknown>);
    }
  }

  const [{ reportData, posTotalSales, gcashPayment }, yesterdayBalance] = await Promise.all([
    fetchPosDayData(input.brandId, input.branchId, reportDate, input.brand),
    fetchYesterdayBalance(input.branchId, reportDate),
  ]);

  const totals = computeEodTotals(reportData, yesterdayBalance, gcashPayment);

  return {
    id: '',
    branchId: input.branchId,
    brandId: input.brandId,
    reportDate,
    status: 'draft',
    reportData,
    drinksSubtotal: totals.drinksSubtotal,
    addonsTotal: totals.addonsTotal,
    expensesTotal: totals.expensesTotal,
    totalSales: totals.totalSales,
    totalNetSales: totals.totalNetSales,
    gcashPayment,
    cashOnHand: totals.cashOnHand,
    yesterdayBalance,
    totalCashOnHand: totals.totalCashOnHand,
    totalCupsSold: totals.totalCupsSold,
    posTotalSales,
    submittedBy: null,
    submittedAt: null,
    notes: null,
  };
}

export async function saveEodReport(input: {
  report: EodReport;
  status: EodReportStatus;
  submittedBy?: string;
}): Promise<{ report: EodReport | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { report: null, error: 'Supabase not configured' };
  }

  const totals = computeEodTotals(
    input.report.reportData,
    input.report.yesterdayBalance,
    input.report.gcashPayment
  );

  const payload = {
    branch_id: input.report.branchId,
    brand_id: input.report.brandId,
    report_date: input.report.reportDate,
    status: input.status,
    report_data: input.report.reportData,
    drinks_subtotal: totals.drinksSubtotal,
    addons_total: totals.addonsTotal,
    expenses_total: totals.expensesTotal,
    total_sales: totals.totalSales,
    total_net_sales: totals.totalNetSales,
    gcash_payment: input.report.gcashPayment,
    cash_on_hand: totals.cashOnHand,
    yesterday_balance: input.report.yesterdayBalance,
    total_cash_on_hand: totals.totalCashOnHand,
    total_cups_sold: totals.totalCupsSold,
    pos_total_sales: input.report.posTotalSales,
    notes: input.report.notes,
    submitted_by: input.status === 'submitted' ? (input.submittedBy ?? input.report.submittedBy) : input.report.submittedBy,
    submitted_at: input.status === 'submitted' ? new Date().toISOString() : input.report.submittedAt,
  };

  const { data, error } = await supabase
    .from('branch_daily_report')
    .upsert(payload, { onConflict: 'branch_id,report_date' })
    .select('*')
    .single();

  if (error || !data) {
    return { report: null, error: error?.message ?? 'save-failed' };
  }

  return { report: mapDbRow(data as Record<string, unknown>), error: null };
}

export async function fetchEodReportSummaries(
  brandId: string,
  options?: { branchId?: string; startDate?: string; endDate?: string; status?: EodReportStatus }
): Promise<EodReportSummary[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('branch_daily_report')
    .select(
      'id, branch_id, report_date, status, total_sales, total_net_sales, total_cups_sold, gcash_payment, cash_on_hand, pos_total_sales, submitted_at, submitted_by, branch(name)'
    )
    .eq('brand_id', brandId)
    .order('report_date', { ascending: false });

  if (options?.branchId) query = query.eq('branch_id', options.branchId);
  if (options?.startDate) query = query.gte('report_date', options.startDate);
  if (options?.endDate) query = query.lte('report_date', options.endDate);
  if (options?.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((raw) => {
    const row = raw as Record<string, unknown>;
    const branch = row.branch as { name?: string } | null;
    return {
      id: String(row.id),
      branchId: String(row.branch_id),
      branchName: branch?.name ?? 'Unknown branch',
      reportDate: String(row.report_date),
      status: (row.status as EodReportStatus) ?? 'draft',
      totalSales: toNum(row.total_sales),
      totalNetSales: toNum(row.total_net_sales),
      totalCupsSold: toNum(row.total_cups_sold),
      gcashPayment: toNum(row.gcash_payment),
      cashOnHand: toNum(row.cash_on_hand),
      posTotalSales: row.pos_total_sales != null ? toNum(row.pos_total_sales) : null,
      submittedAt: row.submitted_at != null ? String(row.submitted_at) : null,
      submittedBy: row.submitted_by != null ? String(row.submitted_by) : null,
    };
  });
}

export async function fetchEodReportById(reportId: string): Promise<EodReport | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('branch_daily_report')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbRow(data as Record<string, unknown>);
}

export async function refreshEodFromPos(input: {
  brandId: string;
  branchId: string;
  brand: BrandConfig;
  reportDate: string;
  existing: EodReport;
}): Promise<EodReport> {
  const [{ reportData, posTotalSales, gcashPayment }, yesterdayBalance] = await Promise.all([
    fetchPosDayData(input.brandId, input.branchId, input.reportDate, input.brand),
    input.existing.yesterdayBalance > 0
      ? Promise.resolve(input.existing.yesterdayBalance)
      : fetchYesterdayBalance(input.branchId, input.reportDate),
  ]);

  const merged: EodReport = {
    ...input.existing,
    reportData: {
      ...reportData,
      expenses: input.existing.reportData.expenses,
      freeUpsize: input.existing.reportData.freeUpsize,
      freeAddon: input.existing.reportData.freeAddon,
      freeDrink: input.existing.reportData.freeDrink,
      missing: input.existing.reportData.missing,
      reject: input.existing.reportData.reject,
    },
    gcashPayment,
    posTotalSales,
    yesterdayBalance,
  };

  const totals = computeEodTotals(merged.reportData, merged.yesterdayBalance, merged.gcashPayment);
  return {
    ...merged,
    drinksSubtotal: totals.drinksSubtotal,
    addonsTotal: totals.addonsTotal,
    expensesTotal: totals.expensesTotal,
    totalSales: totals.totalSales,
    totalNetSales: totals.totalNetSales,
    cashOnHand: totals.cashOnHand,
    totalCashOnHand: totals.totalCashOnHand,
    totalCupsSold: totals.totalCupsSold,
  };
}
