import { supabase, isSupabaseConfigured } from './supabase';
import { logAuditEvent } from './auditLogService';
import { getCurrentBranch } from './branchContext';
import { getTerminalId } from './terminalContext';
import { getManilaIsoDateKey } from './timezone';

export interface PosShift {
  id: string;
  branchId: string;
  terminalId: string;
  cashierId: string | null;
  cashierName: string;
  status: 'open' | 'closed';
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  cashVariance: number | null;
  totalSales: number;
  totalOrders: number;
  cashSales: number;
  openedAt: string;
  closedAt: string | null;
}

export interface ShiftReport {
  shift: PosShift;
  reportType: 'X' | 'Z';
  generatedAt: string;
}

const ACTIVE_SHIFT_KEY = 'coftea.pos.activeShift';

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  return 0;
}

function mapShift(row: Record<string, unknown>): PosShift {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    terminalId: String(row.terminal_id),
    cashierId: row.cashier_id ? String(row.cashier_id) : null,
    cashierName: String(row.cashier_name ?? 'Cashier'),
    status: row.status === 'closed' ? 'closed' : 'open',
    openingCash: toNum(row.opening_cash),
    closingCash: row.closing_cash == null ? null : toNum(row.closing_cash),
    expectedCash: row.expected_cash == null ? null : toNum(row.expected_cash),
    cashVariance: row.cash_variance == null ? null : toNum(row.cash_variance),
    totalSales: toNum(row.total_sales),
    totalOrders: toNum(row.total_orders),
    cashSales: toNum(row.cash_sales),
    openedAt: String(row.opened_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

export function getActiveShiftLocal(): PosShift | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PosShift;
    if (parsed?.status === 'open') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveActiveShiftLocal(shift: PosShift | null) {
  if (!shift) {
    localStorage.removeItem(ACTIVE_SHIFT_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
}

async function fetchShiftSalesTotals(
  branchId: string,
  terminalId: string,
  openedAt: string
): Promise<{ totalSales: number; totalOrders: number; cashSales: number }> {
  if (!isSupabaseConfigured()) {
    return { totalSales: 0, totalOrders: 0, cashSales: 0 };
  }

  const { data, error } = await supabase
    .from('pos_order')
    .select('total_amount, payment_method, status, payment_status, created_at, terminal_id')
    .eq('branch_id', branchId)
    .gte('created_at', openedAt);

  if (error || !data) {
    return { totalSales: 0, totalOrders: 0, cashSales: 0 };
  }

  let totalSales = 0;
  let totalOrders = 0;
  let cashSales = 0;

  for (const row of data as Record<string, unknown>[]) {
    const terminal = String(row.terminal_id ?? '');
    if (terminal && terminal !== terminalId) continue;

    const status = String(row.status ?? 'COMPLETED').toUpperCase();
    const payStatus = String(row.payment_status ?? 'PAID').toUpperCase();
    if (status === 'VOIDED' || status === 'REFUNDED' || payStatus === 'VOIDED') continue;

    const total = toNum(row.total_amount);
    totalSales += total;
    totalOrders += 1;

    const payment = String(row.payment_method ?? '').toUpperCase();
    if (payment === 'CASH') cashSales += total;
  }

  return { totalSales, totalOrders, cashSales };
}

export async function openShift(input: {
  cashierName: string;
  cashierId?: string;
  openingCash: number;
}): Promise<{ shift: PosShift | null; error: string | null }> {
  const branch = getCurrentBranch();
  const terminalId = getTerminalId();
  const existing = getActiveShiftLocal();
  if (existing) {
    return { shift: existing, error: null };
  }

  const row = {
    branch_id: branch.id,
    terminal_id: terminalId,
    cashier_id: input.cashierId ?? null,
    cashier_name: input.cashierName,
    status: 'open',
    opening_cash: input.openingCash,
    total_sales: 0,
    total_orders: 0,
    cash_sales: 0,
  };

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('pos_shift')
      .insert(row)
      .select('*')
      .single();

    if (error) {
      const localShift: PosShift = {
        id: `local-shift-${Date.now()}`,
        branchId: branch.id,
        terminalId,
        cashierId: input.cashierId ?? null,
        cashierName: input.cashierName,
        status: 'open',
        openingCash: input.openingCash,
        closingCash: null,
        expectedCash: null,
        cashVariance: null,
        totalSales: 0,
        totalOrders: 0,
        cashSales: 0,
        openedAt: new Date().toISOString(),
        closedAt: null,
      };
      saveActiveShiftLocal(localShift);
      return { shift: localShift, error: error.message };
    }

    const shift = mapShift(data as Record<string, unknown>);
    saveActiveShiftLocal(shift);
    void logAuditEvent({
      action: 'shift_opened',
      entityType: 'pos_shift',
      entityId: shift.id,
      branchId: branch.id,
      userId: input.cashierId,
      userName: input.cashierName,
      afterData: { openingCash: input.openingCash, terminalId },
    });
    return { shift, error: null };
  }

  const localShift: PosShift = {
    id: `local-shift-${Date.now()}`,
    branchId: branch.id,
    terminalId,
    cashierId: input.cashierId ?? null,
    cashierName: input.cashierName,
    status: 'open',
    openingCash: input.openingCash,
    closingCash: null,
    expectedCash: null,
    cashVariance: null,
    totalSales: 0,
    totalOrders: 0,
    cashSales: 0,
    openedAt: new Date().toISOString(),
    closedAt: null,
  };
  saveActiveShiftLocal(localShift);
  return { shift: localShift, error: null };
}

export async function buildShiftReport(reportType: 'X' | 'Z'): Promise<ShiftReport | null> {
  const shift = getActiveShiftLocal();
  if (!shift) return null;

  const totals = await fetchShiftSalesTotals(shift.branchId, shift.terminalId, shift.openedAt);
  const enriched: PosShift = {
    ...shift,
    totalSales: totals.totalSales,
    totalOrders: totals.totalOrders,
    cashSales: totals.cashSales,
  };

  return {
    shift: enriched,
    reportType,
    generatedAt: new Date().toISOString(),
  };
}

export async function closeShift(input: {
  closingCash: number;
  cashierId?: string;
}): Promise<{ shift: PosShift | null; error: string | null }> {
  const active = getActiveShiftLocal();
  if (!active) {
    return { shift: null, error: 'no-active-shift' };
  }

  const totals = await fetchShiftSalesTotals(active.branchId, active.terminalId, active.openedAt);
  const expectedCash = active.openingCash + totals.cashSales;
  const cashVariance = input.closingCash - expectedCash;
  const closedAt = new Date().toISOString();

  const patch = {
    status: 'closed',
    closing_cash: input.closingCash,
    expected_cash: expectedCash,
    cash_variance: cashVariance,
    total_sales: totals.totalSales,
    total_orders: totals.totalOrders,
    cash_sales: totals.cashSales,
    closed_at: closedAt,
  };

  if (isSupabaseConfigured() && !active.id.startsWith('local-')) {
    const { error } = await supabase.from('pos_shift').update(patch).eq('id', active.id);
    if (error) {
      return { shift: null, error: error.message };
    }
  }

  const closed: PosShift = {
    ...active,
    status: 'closed',
    closingCash: input.closingCash,
    expectedCash,
    cashVariance,
    totalSales: totals.totalSales,
    totalOrders: totals.totalOrders,
    cashSales: totals.cashSales,
    closedAt,
  };

  saveActiveShiftLocal(null);
  void logAuditEvent({
    action: 'shift_closed',
    entityType: 'pos_shift',
    entityId: closed.id,
    branchId: closed.branchId,
    userId: input.cashierId,
    userName: closed.cashierName,
    afterData: {
      closingCash: input.closingCash,
      expectedCash,
      cashVariance,
      totalSales: totals.totalSales,
      totalOrders: totals.totalOrders,
    },
  });

  return { shift: closed, error: null };
}

export function printShiftReport(report: ShiftReport) {
  const { shift, reportType } = report;
  const w = window.open('', '_blank');
  if (!w) return;

  const dateKey = getManilaIsoDateKey(new Date(shift.openedAt));
  w.document.write(`
    <html><head><title>${reportType}-Report</title></head>
    <body style="font-family:sans-serif;padding:24px;max-width:480px">
      <h1>${reportType}-Report — ${shift.terminalId}</h1>
      <p>Date: ${dateKey}</p>
      <p>Cashier: ${shift.cashierName}</p>
      <p>Opened: ${new Date(shift.openedAt).toLocaleString('en-PH')}</p>
      ${shift.closedAt ? `<p>Closed: ${new Date(shift.closedAt).toLocaleString('en-PH')}</p>` : ''}
      <hr />
      <ul>
        <li>Opening Cash: ₱${shift.openingCash.toFixed(2)}</li>
        <li>Total Sales: ₱${shift.totalSales.toFixed(2)}</li>
        <li>Cash Sales: ₱${shift.cashSales.toFixed(2)}</li>
        <li>Orders: ${shift.totalOrders}</li>
        ${shift.expectedCash != null ? `<li>Expected Cash: ₱${shift.expectedCash.toFixed(2)}</li>` : ''}
        ${shift.closingCash != null ? `<li>Actual Cash: ₱${shift.closingCash.toFixed(2)}</li>` : ''}
        ${shift.cashVariance != null ? `<li>Variance: ₱${shift.cashVariance.toFixed(2)}</li>` : ''}
      </ul>
    </body></html>
  `);
  w.document.close();
  w.print();
}
