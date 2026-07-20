import { describe, expect, it } from 'vitest';
import {
  getSyncBadgeLabel,
  getSyncDotClass,
  type SyncState,
} from './syncState';

const baseState: SyncState = {
  connection: 'online',
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  lastError: null,
};

describe('syncState labels', () => {
  it('shows synced when online with no queue', () => {
    expect(getSyncBadgeLabel(baseState)).toBe('Mobile Sync · Online');
    expect(getSyncDotClass(baseState)).toBe('sync-dot');
  });

  it('shows offline with queued count', () => {
    const state: SyncState = { ...baseState, connection: 'offline', pendingCount: 2 };
    expect(getSyncBadgeLabel(state)).toBe('Mobile Sync · Offline · 2 queued');
    expect(getSyncDotClass(state)).toBe('sync-dot sync-dot--offline');
  });

  it('shows failed count when online', () => {
    const state: SyncState = { ...baseState, failedCount: 1 };
    expect(getSyncBadgeLabel(state)).toBe('Mobile Sync · 1 failed');
    expect(getSyncDotClass(state)).toBe('sync-dot sync-dot--failed');
  });
});
