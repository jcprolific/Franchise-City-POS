import { supabase, isSupabaseConfigured } from './supabase';
import { getCurrentBranch } from './branchContext';
import { getTerminalId } from './terminalContext';

const LOCAL_COUNTER_KEY = 'coftea.pos.localOrderCounter';

function readLocalCounter(branchId: string, terminalId: string): number {
  try {
    const raw = localStorage.getItem(LOCAL_COUNTER_KEY);
    if (!raw) return 4999;
    const map = JSON.parse(raw) as Record<string, number>;
    const key = `${branchId}:${terminalId}`;
    return typeof map[key] === 'number' ? map[key] : 4999;
  } catch {
    return 4999;
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
  return `${shortTerminal}-${orderNumber}`;
}

export async function getNextOrderNumber(): Promise<number> {
  const branch = getCurrentBranch();
  const terminalId = getTerminalId();

  if (!isSupabaseConfigured()) {
    const next = readLocalCounter(branch.id, terminalId) + 1;
    writeLocalCounter(branch.id, terminalId, next);
    return next;
  }

  const { data, error } = await supabase.rpc('get_next_pos_order_number', {
    p_branch_id: branch.id,
    p_terminal_id: terminalId,
  });

  if (error || data == null) {
    const next = readLocalCounter(branch.id, terminalId) + 1;
    writeLocalCounter(branch.id, terminalId, next);
    return next;
  }

  const next = Number(data);
  writeLocalCounter(branch.id, terminalId, next);
  return next;
}
