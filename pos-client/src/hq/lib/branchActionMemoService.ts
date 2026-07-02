import { supabase } from '../../lib/supabase';
import {
  renderMemo,
  type ActionPlanType,
  type MemoTemplateFields,
} from './memoTemplates';

export type MemoStatus = 'draft' | 'issued';

export interface BranchActionMemo {
  id: string;
  brand_id: string;
  branch_id: string | null;
  branch_name: string;
  franchisee_name: string | null;
  action_plan_type: ActionPlanType;
  issue_summary: string;
  violation_details: string | null;
  incident_date: string | null;
  corrective_action: string | null;
  deadline: string | null;
  memo_body: string;
  issued_by: string;
  status: MemoStatus;
  created_at: string;
  _local?: boolean;
}

export interface CreateBranchActionMemoInput {
  brandId: string;
  branchId?: string | null;
  branchName: string;
  franchiseeName?: string | null;
  actionPlanType: ActionPlanType;
  issueSummary: string;
  violationDetails?: string | null;
  incidentDate?: string | null;
  correctiveAction?: string | null;
  deadline?: string | null;
  issuedBy: string;
  status?: MemoStatus;
}

export interface CreateBranchActionMemoResult {
  ok: boolean;
  error?: string;
  memo?: BranchActionMemo;
  savedLocally?: boolean;
}

export interface FetchBranchActionMemosResult {
  memos: BranchActionMemo[];
  error?: string;
  fromLocal?: boolean;
}

const MEMO_SELECT =
  'id,brand_id,branch_id,branch_name,franchisee_name,action_plan_type,issue_summary,violation_details,incident_date,corrective_action,deadline,memo_body,issued_by,status,created_at';

function localStorageKey(brandId: string) {
  return `coftea-branch-action-memos:${brandId}`;
}

function readLocalMemos(brandId: string): BranchActionMemo[] {
  try {
    const raw = localStorage.getItem(localStorageKey(brandId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BranchActionMemo[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({ ...row, _local: true }));
  } catch {
    return [];
  }
}

function writeLocalMemos(brandId: string, memos: BranchActionMemo[]) {
  try {
    localStorage.setItem(localStorageKey(brandId), JSON.stringify(memos));
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

function mapSupabaseError(message: string) {
  if (isNetworkError(message)) {
    return 'Could not reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.';
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'Memo save blocked by Supabase RLS policy. Run supabase-branch-action-memos.sql first.';
  }
  if (isMissingTableError(message)) {
    return 'branch_action_memos table is missing. Run supabase-branch-action-memos.sql in Supabase SQL Editor.';
  }
  return message;
}

function normalizeDate(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatIssuedDate(date: Date): string {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildTemplateFields(
  input: CreateBranchActionMemoInput,
  issuedDate: Date
): MemoTemplateFields {
  return {
    branch_name: input.branchName,
    franchisee_name: input.franchiseeName ?? '',
    issue_summary: input.issueSummary,
    violation_details: input.violationDetails ?? '',
    incident_date: input.incidentDate ?? '',
    corrective_action: input.correctiveAction ?? '',
    deadline: input.deadline ?? '',
    issued_date: formatIssuedDate(issuedDate),
    issued_by: input.issuedBy,
  };
}

function buildInsertPayload(input: CreateBranchActionMemoInput, memoBody: string) {
  return {
    brand_id: input.brandId,
    branch_id: input.branchId ?? null,
    branch_name: input.branchName.trim(),
    franchisee_name: normalizeText(input.franchiseeName),
    action_plan_type: input.actionPlanType,
    issue_summary: input.issueSummary.trim(),
    violation_details: normalizeText(input.violationDetails),
    incident_date: normalizeDate(input.incidentDate),
    corrective_action: normalizeText(input.correctiveAction),
    deadline: normalizeDate(input.deadline),
    memo_body: memoBody,
    issued_by: input.issuedBy.trim(),
    status: input.status ?? 'issued',
  };
}

function buildLocalMemo(input: CreateBranchActionMemoInput, memoBody: string): BranchActionMemo {
  return {
    id: createLocalId(),
    brand_id: input.brandId,
    branch_id: input.branchId ?? null,
    branch_name: input.branchName.trim(),
    franchisee_name: normalizeText(input.franchiseeName),
    action_plan_type: input.actionPlanType,
    issue_summary: input.issueSummary.trim(),
    violation_details: normalizeText(input.violationDetails),
    incident_date: normalizeDate(input.incidentDate),
    corrective_action: normalizeText(input.correctiveAction),
    deadline: normalizeDate(input.deadline),
    memo_body: memoBody,
    issued_by: input.issuedBy.trim(),
    status: input.status ?? 'issued',
    created_at: new Date().toISOString(),
    _local: true,
  };
}

function saveLocalMemo(input: CreateBranchActionMemoInput, memoBody: string): BranchActionMemo {
  const memo = buildLocalMemo(input, memoBody);
  const existing = readLocalMemos(input.brandId);
  writeLocalMemos(input.brandId, [memo, ...existing]);
  return memo;
}

/** Build the memo body from templates + fields without persisting anything. */
export function previewMemoBody(input: CreateBranchActionMemoInput, issuedDate: Date = new Date()): string {
  const fields = buildTemplateFields(input, issuedDate);
  return renderMemo(input.actionPlanType, fields);
}

/** Insert a new memo. Falls back to localStorage if Supabase is unreachable. */
export async function createBranchActionMemo(
  input: CreateBranchActionMemoInput
): Promise<CreateBranchActionMemoResult> {
  const issuedDate = new Date();
  const memoBody = renderMemo(input.actionPlanType, buildTemplateFields(input, issuedDate));

  try {
    const { data, error } = await supabase
      .from('branch_action_memos')
      .insert(buildInsertPayload(input, memoBody))
      .select(MEMO_SELECT)
      .single();

    if (error) {
      if (isNetworkError(error.message)) {
        const memo = saveLocalMemo(input, memoBody);
        return { ok: true, savedLocally: true, memo };
      }
      return { ok: false, error: mapSupabaseError(error.message) };
    }

    return { ok: true, memo: data as BranchActionMemo };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save memo.';
    if (isNetworkError(message)) {
      const memo = saveLocalMemo(input, memoBody);
      return { ok: true, savedLocally: true, memo };
    }
    return { ok: false, error: mapSupabaseError(message) };
  }
}

/** Load memo history for a branch (matched by name within the brand). */
export async function fetchMemosForBranch(
  brandId: string,
  branchName: string
): Promise<FetchBranchActionMemosResult> {
  const trimmedName = branchName.trim();
  const localMemos = readLocalMemos(brandId).filter(
    (memo) => memo.branch_name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  try {
    const { data, error } = await supabase
      .from('branch_action_memos')
      .select(MEMO_SELECT)
      .eq('brand_id', brandId)
      .eq('branch_name', trimmedName)
      .order('created_at', { ascending: false });

    if (error) {
      if (isNetworkError(error.message)) {
        return { memos: localMemos, fromLocal: true };
      }
      return { memos: localMemos, error: mapSupabaseError(error.message) };
    }

    const remote = (data as BranchActionMemo[]) ?? [];
    if (localMemos.length === 0) {
      return { memos: remote };
    }

    const remoteIds = new Set(remote.map((memo) => memo.id));
    const merged = [
      ...remote,
      ...localMemos.filter((memo) => !remoteIds.has(memo.id)),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return { memos: merged, fromLocal: remote.length === 0 && localMemos.length > 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load memos.';
    if (isNetworkError(message)) {
      return { memos: localMemos, fromLocal: true };
    }
    return { memos: localMemos, error: mapSupabaseError(message) };
  }
}
