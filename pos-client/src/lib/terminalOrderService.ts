import { supabase, isSupabaseConfigured } from './supabase';
import { getCurrentBranch } from './branchContext';
import { getTerminalId } from './terminalContext';
import { getActiveShiftLocal, updateShiftOrderCounterLocal } from './shiftService';

const LOCAL_COUNTER_KEY = 'coftea.pos.localOrderCounter';

function readLocalCounter(branchId: string, terminalId: string): number {
  try {
    const raw = localStorage.getItem(LOCAL_COUNTER_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    const key = `${branchId}:${terminalId}`;
    return typeof map[key] === 'number' ? map[key] : 0;
  } catch {
    return 0;
  }
}

function writeLocalCounter(branchId: string, terminalId: string, value: number) {
  try {
    const raw = localStorage.getItem(LOCAL_COUNTER_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, number>;
    map[`${branchId}:${terminalId}`] = value;
    localStorage.setItem(LOCAL_COUNTER_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function formatOrderNumber(terminalId: string, orderNumber: number): string {
  const shortTerminal = terminalId.replace(/^T-?/i, '').slice(0, 4).toUpperCase();
  return `${shortTerminal}-${String(orderNumber).padStart(4, '0')}`;
}

export function formatShiftOrderNumber(orderNumber: number): string {
  return String(orderNumber).padStart(4, '0');
}

/** Per-shift counter starting at 0001. Requires an open shift. */
export async function getNextShiftOrderNumber(): Promise<number> {
  const branch = getCurrentBranch();
  const terminalId = getTerminalId();
  const shift = getActiveShiftLocal();

  if (!shift) {
    throw new Error('Open a shift before starting orders.');
  }

  if (isSupabaseConfigured() && !shift.id.startsWith('local-')) {
    const { data, error } = await supabase.rpc('get_next_shift_order_number', {
      p_shift_id: shift.id,
    });

    if (!error && data != null) {
      const next = Number(data);
      updateShiftOrderCounterLocal(next);
      return next;
    }
  }

  const next = (shift.lastOrderNumber ?? readLocalCounter(branch.id, terminalId)) + 1;
  writeLocalCounter(branch.id, terminalId, next);
  updateShiftOrderCounterLocal(next);
  return next;
}

/** @deprecated Use getNextShiftOrderNumber during barista shift flow. */
export async function getNextOrderNumber(): Promise<number> {
  try {
    return await getNextShiftOrderNumber();
  } catch {
    const branch = getCurrentBranch();
    const terminalId = getTerminalId();
    const next = readLocalCounter(branch.id, terminalId) + 1;
    writeLocalCounter(branch.id, terminalId, next);
    return next;
  }
}
