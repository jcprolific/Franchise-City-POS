export type SyncConnectionState = 'online' | 'offline' | 'syncing';

export interface SyncState {
  connection: SyncConnectionState;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

const listeners = new Set<SyncListener>();

let currentState: SyncState = {
  connection: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  lastError: null,
};

export function getSyncState(): SyncState {
  return { ...currentState };
}

export function publishSyncState(patch: Partial<SyncState>) {
  currentState = { ...currentState, ...patch };
  for (const listener of listeners) {
    listener(currentState);
  }
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => listeners.delete(listener);
}

export function getSyncBadgeLabel(state: SyncState): string {
  if (state.connection === 'offline') {
    if (state.pendingCount > 0) {
      return `Offline · ${state.pendingCount} queued`;
    }
    return 'Offline';
  }
  if (state.connection === 'syncing') {
    return 'Syncing…';
  }
  if (state.failedCount > 0) {
    return `Online · ${state.failedCount} failed`;
  }
  if (state.pendingCount > 0) {
    return `Online · ${state.pendingCount} pending`;
  }
  return 'Online · Synced';
}

export function getSyncDotClass(state: SyncState): string {
  if (state.connection === 'offline') return 'sync-dot sync-dot--offline';
  if (state.connection === 'syncing') return 'sync-dot sync-dot--syncing';
  if (state.failedCount > 0) return 'sync-dot sync-dot--failed';
  if (state.pendingCount > 0) return 'sync-dot sync-dot--pending';
  return 'sync-dot';
}
