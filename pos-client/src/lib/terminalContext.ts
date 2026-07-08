const TERMINAL_STORAGE_KEY = 'coftea.pos.terminalId';
const DEFAULT_TERMINAL_ID = 'T-01';

type TerminalListener = (terminalId: string) => void;
const terminalListeners = new Set<TerminalListener>();

export function subscribeTerminal(listener: TerminalListener): () => void {
  terminalListeners.add(listener);
  listener(getTerminalId());
  return () => terminalListeners.delete(listener);
}

function notifyTerminalChange(terminalId: string) {
  for (const listener of terminalListeners) listener(terminalId);
}

export function getTerminalId(): string {
  try {
    const stored = localStorage.getItem(TERMINAL_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(TERMINAL_STORAGE_KEY, DEFAULT_TERMINAL_ID);
  } catch {
    /* ignore */
  }
  return DEFAULT_TERMINAL_ID;
}

export function setTerminalId(terminalId: string): void {
  const normalized = terminalId.trim().toUpperCase();
  if (!normalized) return;
  localStorage.setItem(TERMINAL_STORAGE_KEY, normalized);
  notifyTerminalChange(normalized);
}

export function getTerminalLabel(): string {
  return `Branch Terminal · ${getTerminalId()}`;
}
