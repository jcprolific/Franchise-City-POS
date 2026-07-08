import type { CartItem } from '../../types';
import { idbDelete, idbGetAll, idbPut, QUEUE_STORE } from './idb';

export type QueuedOrderStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedOrderPayload {
  header: Record<string, unknown>;
  cartItems: CartItem[];
}

export interface QueuedOrder {
  localId: string;
  clientOrderId: string;
  status: QueuedOrderStatus;
  createdAt: string;
  updatedAt: string;
  payload: QueuedOrderPayload;
  retryCount: number;
  lastError?: string;
  remoteOrderId?: string;
}

export interface QueueStats {
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
  total: number;
}

function nowIso() {
  return new Date().toISOString();
}

export function createLocalOrderId(): string {
  return crypto.randomUUID();
}

export async function enqueueOrder(
  clientOrderId: string,
  payload: QueuedOrderPayload
): Promise<QueuedOrder> {
  const entry: QueuedOrder = {
    localId: clientOrderId,
    clientOrderId,
    status: 'pending',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    payload,
    retryCount: 0,
  };
  await idbPut(QUEUE_STORE, entry);
  return entry;
}

export async function listQueuedOrders(): Promise<QueuedOrder[]> {
  const rows = await idbGetAll<QueuedOrder>(QUEUE_STORE);
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listPendingOrders(): Promise<QueuedOrder[]> {
  const rows = await listQueuedOrders();
  return rows.filter((row) => row.status === 'pending' || row.status === 'failed');
}

export async function updateQueuedOrder(
  localId: string,
  patch: Partial<Pick<QueuedOrder, 'status' | 'retryCount' | 'lastError' | 'remoteOrderId'>>
): Promise<QueuedOrder | null> {
  const rows = await idbGetAll<QueuedOrder>(QUEUE_STORE);
  const existing = rows.find((row) => row.localId === localId);
  if (!existing) return null;

  const updated: QueuedOrder = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };
  await idbPut(QUEUE_STORE, updated);
  return updated;
}

export async function removeSyncedOrders(olderThanHours = 24): Promise<number> {
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
  const rows = await listQueuedOrders();
  let removed = 0;

  for (const row of rows) {
    if (row.status !== 'synced') continue;
    if (new Date(row.updatedAt).getTime() < cutoff) {
      await idbDelete(QUEUE_STORE, row.localId);
      removed += 1;
    }
  }

  return removed;
}

export async function getQueueStats(): Promise<QueueStats> {
  const rows = await listQueuedOrders();
  return {
    pending: rows.filter((r) => r.status === 'pending').length,
    syncing: rows.filter((r) => r.status === 'syncing').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    synced: rows.filter((r) => r.status === 'synced').length,
    total: rows.length,
  };
}
