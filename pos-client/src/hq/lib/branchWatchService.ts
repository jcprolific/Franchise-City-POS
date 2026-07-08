import { supabase } from '../../lib/supabase';
import type { HqBranchAlert } from '../data/getHqDemoData';

export type WatchFlag = 'offline' | 'needs_attention';
export type WorkflowStatus = 'open' | 'in_progress' | 'resolved';

export interface BranchWatchItem {
  id: string;
  brand_id: string;
  branch_id: string | null;
  branch_name: string;
  issue: string;
  flag: WatchFlag;
  workflow_status: WorkflowStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  _local?: boolean;
}

export interface CreateWatchItemInput {
  brandId: string;
  branchId?: string | null;
  branchName: string;
  issue: string;
  flag: WatchFlag;
  createdBy?: string | null;
}

export interface WatchServiceResult {
  ok: boolean;
  error?: string;
  item?: BranchWatchItem;
  savedLocally?: boolean;
}

export interface FetchWatchItemsResult {
  items: BranchWatchItem[];
  error?: string;
  fromLocal?: boolean;
}

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const FLAG_LABELS: Record<WatchFlag, string> = {
  offline: 'Offline',
  needs_attention: 'Needs Attention',
};

const WATCH_SELECT =
  'id,brand_id,branch_id,branch_name,issue,flag,workflow_status,created_by,created_at,updated_at,resolved_at';

function localStorageKey(brandId: string) {
  return `coftea-branch-watch-items:${brandId}`;
}

function readLocal(brandId: string): BranchWatchItem[] {
  try {
    const raw = localStorage.getItem(localStorageKey(brandId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BranchWatchItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({ ...row, _local: true }));
  } catch {
    return [];
  }
}

function writeLocal(brandId: string, items: BranchWatchItem[]) {
  try {
    localStorage.setItem(localStorageKey(brandId), JSON.stringify(items));
  } catch {
    /* storage full or blocked */
  }
}

function createLocalId() {
  try {
    return `local-${crypto.randomUUID()}`;
  } catch {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function isLocalId(id: string) {
  return id.startsWith('local-');
}

function isNetworkError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('fetch failed')
  );
}

function isMissingTableError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('relation') && lower.includes('does not exist')) return true;
  if (lower.includes('could not find the table')) return true;
  return false;
}

function mapError(message: string) {
  if (isNetworkError(message)) {
    return 'Could not reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.';
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'Watch item blocked by Supabase RLS policy. Run supabase-branch-watch-items.sql first.';
  }
  if (isMissingTableError(message)) {
    return 'branch_watch_items table is missing. Run supabase-branch-watch-items.sql in Supabase SQL Editor.';
  }
  return message;
}

function shouldFallbackToLocal(message: string) {
  return isNetworkError(message) || isMissingTableError(message);
}

function nowIso() {
  return new Date().toISOString();
}

function buildLocalItem(input: CreateWatchItemInput): BranchWatchItem {
  const timestamp = nowIso();
  return {
    id: createLocalId(),
    brand_id: input.brandId,
    branch_id: input.branchId ?? null,
    branch_name: input.branchName.trim(),
    issue: input.issue.trim(),
    flag: input.flag,
    workflow_status: 'open',
    created_by: input.createdBy?.trim() || null,
    created_at: timestamp,
    updated_at: timestamp,
    resolved_at: null,
    _local: true,
  };
}

function saveLocalItem(input: CreateWatchItemInput): BranchWatchItem {
  const item = buildLocalItem(input);
  const existing = readLocal(input.brandId);
  writeLocal(input.brandId, [item, ...existing]);
  return item;
}

function updateLocalItem(
  brandId: string,
  id: string,
  patch: Partial<BranchWatchItem>
): BranchWatchItem | null {
  const items = readLocal(brandId);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const timestamp = nowIso();
  let resolvedAt = items[index].resolved_at;
  if (patch.workflow_status === 'resolved') {
    resolvedAt = timestamp;
  } else if (patch.workflow_status) {
    resolvedAt = null;
  }
  const next: BranchWatchItem = {
    ...items[index],
    ...patch,
    updated_at: timestamp,
    resolved_at: resolvedAt,
    _local: true,
  };
  items[index] = next;
  writeLocal(brandId, items);
  return next;
}

function deleteLocalItem(brandId: string, id: string): boolean {
  const items = readLocal(brandId);
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return false;
  writeLocal(brandId, next);
  return true;
}

function mergeItems(remote: BranchWatchItem[], local: BranchWatchItem[]): BranchWatchItem[] {
  const remoteIds = new Set(remote.map((item) => item.id));
  const merged = [...remote, ...local.filter((item) => !remoteIds.has(item.id))];
  return merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/** Convert a demo alert into a watch-item seed input. */
export function alertToWatchInput(alert: HqBranchAlert, brandId: string): CreateWatchItemInput {
  return {
    brandId,
    branchName: alert.name,
    issue: alert.meta,
    flag: alert.status === 'Offline' ? 'offline' : 'needs_attention',
    createdBy: 'HQ Demo Seed',
  };
}

/** Map a watch item back to the HqBranchAlert shape used by the Action Plan modal. */
export function watchItemToAlert(item: BranchWatchItem): HqBranchAlert {
  return {
    id: item.id,
    name: item.branch_name,
    meta: item.issue,
    status: item.flag === 'offline' ? 'Offline' : 'Needs Attention',
  };
}

/** Synchronously seed/read local watch items so the UI can render immediately. */
export function ensureLocalWatchItems(
  brandId: string,
  seeds: CreateWatchItemInput[] = []
): BranchWatchItem[] {
  const existing = readLocal(brandId);
  if (existing.length > 0) return existing;
  if (seeds.length === 0) return [];
  const seeded = seeds.map((seed) => buildLocalItem(seed));
  writeLocal(brandId, seeded);
  return seeded;
}

/** Load watch items. Seeds from demo alerts on first run when the list is empty. */
export async function fetchWatchItems(
  brandId: string,
  seeds: CreateWatchItemInput[] = []
): Promise<FetchWatchItemsResult> {
  const localItems = readLocal(brandId);

  try {
    const { data, error } = await supabase
      .from('branch_watch_items')
      .select(WATCH_SELECT)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      if (shouldFallbackToLocal(error.message)) {
        return await ensureLocalSeeded(brandId, localItems, seeds, true);
      }
      return { items: localItems, error: mapError(error.message) };
    }

    const remote = (data as BranchWatchItem[]) ?? [];

    if (remote.length === 0 && localItems.length === 0 && seeds.length > 0) {
      const seeded = await seedRemote(brandId, seeds);
      if (seeded) return { items: seeded };
      // Remote seeding failed silently; fall back to local seeding.
      return await ensureLocalSeeded(brandId, localItems, seeds, true);
    }

    if (localItems.length === 0) {
      return { items: remote };
    }

    return { items: mergeItems(remote, localItems), fromLocal: remote.length === 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load watch items.';
    if (shouldFallbackToLocal(message)) {
      return await ensureLocalSeeded(brandId, localItems, seeds, true);
    }
    return { items: localItems, error: mapError(message) };
  }
}

async function ensureLocalSeeded(
  brandId: string,
  localItems: BranchWatchItem[],
  seeds: CreateWatchItemInput[],
  fromLocal: boolean
): Promise<FetchWatchItemsResult> {
  if (localItems.length > 0 || seeds.length === 0) {
    return { items: localItems, fromLocal };
  }
  const seeded = seeds.map((seed) => buildLocalItem(seed));
  writeLocal(brandId, seeded);
  return { items: seeded, fromLocal: true };
}

async function seedRemote(
  brandId: string,
  seeds: CreateWatchItemInput[]
): Promise<BranchWatchItem[] | null> {
  const payload = seeds.map((seed) => ({
    brand_id: brandId,
    branch_id: seed.branchId ?? null,
    branch_name: seed.branchName.trim(),
    issue: seed.issue.trim(),
    flag: seed.flag,
    workflow_status: 'open' as WorkflowStatus,
    created_by: seed.createdBy?.trim() || null,
  }));

  const { data, error } = await supabase
    .from('branch_watch_items')
    .insert(payload)
    .select(WATCH_SELECT);

  if (error || !data) return null;
  return (data as BranchWatchItem[]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function createWatchItem(input: CreateWatchItemInput): Promise<WatchServiceResult> {
  try {
    const { data, error } = await supabase
      .from('branch_watch_items')
      .insert({
        brand_id: input.brandId,
        branch_id: input.branchId ?? null,
        branch_name: input.branchName.trim(),
        issue: input.issue.trim(),
        flag: input.flag,
        workflow_status: 'open',
        created_by: input.createdBy?.trim() || null,
      })
      .select(WATCH_SELECT)
      .single();

    if (error) {
      if (shouldFallbackToLocal(error.message)) {
        return { ok: true, savedLocally: true, item: saveLocalItem(input) };
      }
      return { ok: false, error: mapError(error.message) };
    }

    return { ok: true, item: data as BranchWatchItem };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add watch item.';
    if (shouldFallbackToLocal(message)) {
      return { ok: true, savedLocally: true, item: saveLocalItem(input) };
    }
    return { ok: false, error: mapError(message) };
  }
}

export async function updateWatchItemStatus(
  brandId: string,
  id: string,
  status: WorkflowStatus
): Promise<WatchServiceResult> {
  if (isLocalId(id)) {
    const item = updateLocalItem(brandId, id, { workflow_status: status });
    if (!item) return { ok: false, error: 'Watch item not found.' };
    return { ok: true, savedLocally: true, item };
  }

  try {
    const { data, error } = await supabase
      .from('branch_watch_items')
      .update({ workflow_status: status })
      .eq('id', id)
      .eq('brand_id', brandId)
      .select(WATCH_SELECT)
      .single();

    if (error) {
      if (shouldFallbackToLocal(error.message)) {
        const item = updateLocalItem(brandId, id, { workflow_status: status });
        if (item) return { ok: true, savedLocally: true, item };
      }
      return { ok: false, error: mapError(error.message) };
    }

    return { ok: true, item: data as BranchWatchItem };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update status.';
    return { ok: false, error: mapError(message) };
  }
}

export async function deleteWatchItem(
  brandId: string,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const removedLocal = deleteLocalItem(brandId, id);

  if (isLocalId(id)) {
    return { ok: removedLocal };
  }

  try {
    const { error } = await supabase
      .from('branch_watch_items')
      .delete()
      .eq('id', id)
      .eq('brand_id', brandId);

    if (error) {
      if (shouldFallbackToLocal(error.message)) {
        return { ok: true };
      }
      return { ok: false, error: mapError(error.message) };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete watch item.';
    return { ok: false, error: mapError(message) };
  }
}
