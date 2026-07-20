import { isSupabaseConfigured } from '../supabase';
import { logAuditEvent } from '../auditLogService';
import { deductInventoryForOrder } from '../recipeDeductionService';
import { insertPosOrderWithItems } from '../posOrderItemService';
import { completeOpenPosOrderFromQueue } from '../openOrderService';
import {
  enqueueOrder,
  listPendingOrders,
  listQueuedOrders,
  removeSyncedOrders,
  updateQueuedOrder,
  type QueuedOrder,
} from './offlineOrderQueue';
import { publishSyncState } from './syncState';
import { getQueueStats } from './offlineOrderQueue';

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 15_000;

let syncInFlight = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

async function refreshPublishedState(connection: 'online' | 'offline' | 'syncing' = 'online') {
  const stats = await getQueueStats();
  publishSyncState({
    connection,
    pendingCount: stats.pending,
    failedCount: stats.failed,
  });
}

async function syncSingleOrder(order: QueuedOrder): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    await updateQueuedOrder(order.localId, {
      status: 'failed',
      lastError: 'Supabase not configured',
      retryCount: order.retryCount + 1,
    });
    return false;
  }

  await updateQueuedOrder(order.localId, { status: 'syncing' });

  const header: Record<string, unknown> = {
    ...order.payload.header,
    client_order_id: order.clientOrderId,
    synced_at: new Date().toISOString(),
  };

  const openOrderId = header.open_order_id ? String(header.open_order_id) : null;

  if (openOrderId) {
    const { error } = await completeOpenPosOrderFromQueue(
      openOrderId,
      header,
      order.payload.cartItems
    );
    if (error) {
      const retryCount = order.retryCount + 1;
      await updateQueuedOrder(order.localId, {
        status: retryCount >= MAX_RETRIES ? 'failed' : 'pending',
        retryCount,
        lastError: error,
      });
      return false;
    }

    await updateQueuedOrder(order.localId, {
      status: 'synced',
      remoteOrderId: openOrderId,
      lastError: undefined,
    });

    void logAuditEvent({
      action: 'order_synced',
      entityType: 'pos_order',
      entityId: openOrderId,
      afterData: { clientOrderId: order.clientOrderId, localId: order.localId, mode: 'complete_open' },
      metadata: { source: 'offline_queue' },
    });

    return true;
  }

  const { orderId, error } = await insertPosOrderWithItems(header, order.payload.cartItems, {
    clientOrderId: order.clientOrderId,
  });

  if (error || !orderId) {
    const retryCount = order.retryCount + 1;
    await updateQueuedOrder(order.localId, {
      status: retryCount >= MAX_RETRIES ? 'failed' : 'pending',
      retryCount,
      lastError: error ?? 'sync-failed',
    });
    return false;
  }

  await updateQueuedOrder(order.localId, {
    status: 'synced',
    remoteOrderId: orderId,
    lastError: undefined,
  });

  const brandId = String(order.payload.header.brand_id ?? '');
  const branchId = String(order.payload.header.branch_id ?? '');
  if (brandId && branchId) {
    void deductInventoryForOrder({
      brandId,
      branchId,
      cartItems: order.payload.cartItems,
      orderId,
      createdBy: String(order.payload.header.cashier_id ?? 'pos'),
    });
  }

  void logAuditEvent({
    action: 'order_synced',
    entityType: 'pos_order',
    entityId: orderId,
    afterData: { clientOrderId: order.clientOrderId, localId: order.localId },
    metadata: { source: 'offline_queue' },
  });

  return true;
}

export async function flushOrderQueue(): Promise<{ synced: number; failed: number }> {
  if (syncInFlight) return { synced: 0, failed: 0 };
  if (!navigator.onLine) {
    await refreshPublishedState('offline');
    return { synced: 0, failed: 0 };
  }

  syncInFlight = true;
  publishSyncState({ connection: 'syncing' });

  let synced = 0;
  let failed = 0;

  try {
    const pending = await listPendingOrders();
    for (const order of pending) {
      const ok = await syncSingleOrder(order);
      if (ok) synced += 1;
      else failed += 1;
    }
    await removeSyncedOrders();
    publishSyncState({
      connection: 'online',
      lastSyncAt: new Date().toISOString(),
      lastError: failed > 0 ? `${failed} order(s) failed to sync` : null,
    });
    await refreshPublishedState('online');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'sync-error';
    publishSyncState({ connection: 'online', lastError: message });
    await refreshPublishedState('online');
  } finally {
    syncInFlight = false;
  }

  return { synced, failed };
}

export async function queueAndSyncOrder(
  clientOrderId: string,
  header: Record<string, unknown>,
  cartItems: QueuedOrder['payload']['cartItems']
): Promise<{ synced: boolean; remoteOrderId?: string; error?: string }> {
  await enqueueOrder(clientOrderId, { header, cartItems });

  if (!navigator.onLine) {
    await refreshPublishedState('offline');
    return { synced: false, error: 'offline' };
  }

  const pending = await listPendingOrders();
  const entry = pending.find((row) => row.clientOrderId === clientOrderId);
  if (!entry) {
    return { synced: false, error: 'queue-missing' };
  }

  const ok = await syncSingleOrder(entry);
  await refreshPublishedState('online');

  if (!ok) {
    const updated = await listPendingOrders();
    const failed = updated.find((row) => row.clientOrderId === clientOrderId);
    return { synced: false, error: failed?.lastError ?? 'sync-failed' };
  }

  const all = await listQueuedOrders();
  const syncedRow = all.find((row) => row.clientOrderId === clientOrderId);
  return { synced: true, remoteOrderId: syncedRow?.remoteOrderId };
}

export function startOrderSyncWorker() {
  if (intervalId) return;

  const handleOnline = () => {
    publishSyncState({ connection: 'online' });
    void flushOrderQueue();
  };

  const handleOffline = () => {
    void refreshPublishedState('offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  intervalId = setInterval(() => {
    if (navigator.onLine) void flushOrderQueue();
    else void refreshPublishedState('offline');
  }, SYNC_INTERVAL_MS);

  void refreshPublishedState(navigator.onLine ? 'online' : 'offline');
  if (navigator.onLine) void flushOrderQueue();

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
