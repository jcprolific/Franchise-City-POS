import { supabase } from '../../lib/supabase';
import { deleteFranchiseeFromBackend } from './franchiseOwnerService';

export type OnboardingStatus =
  | 'signed_contract'
  | 'under_construction'
  | 'for_training_schedule'
  | 'onboarding'
  | 'active'
  | 'suspended';

/** Human-readable labels for every onboarding / operational status. */
export const ONBOARDING_LABELS: Record<OnboardingStatus, string> = {
  signed_contract: 'Signed Contract',
  under_construction: 'Under Construction',
  for_training_schedule: 'For Training Schedule',
  onboarding: 'Onboarding',
  active: 'Operating',
  suspended: 'Suspended',
};

/** Pre-opening pipeline stages shown first in the dropdown. */
export const ONBOARDING_PIPELINE_STAGES: OnboardingStatus[] = [
  'signed_contract',
  'under_construction',
  'for_training_schedule',
  'onboarding',
];

/** Post-launch operational statuses. */
export const ONBOARDING_OPERATIONAL_STATUSES: OnboardingStatus[] = ['active', 'suspended'];

export function getOnboardingLabel(status: string | null | undefined): string {
  if (!status) return '—';
  if (status in ONBOARDING_LABELS) {
    return ONBOARDING_LABELS[status as OnboardingStatus];
  }
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isOnboardingPipelineStatus(status: string | null | undefined): boolean {
  return ONBOARDING_PIPELINE_STAGES.includes(status as OnboardingStatus);
}

export interface FranchiseeRow {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  branch_code?: string | null;
  franchisee_name?: string | null;
  franchisee_phone?: string | null;
  franchisee_email?: string | null;
  business_name?: string | null;
  city?: string | null;
  opening_date?: string | null;
  contract_start_date?: string | null;
  franchise_package?: string | null;
  onboarding_status?: string | null;
  owner_user_id?: string | null;
  _local?: boolean;
}

export interface RegisterFranchiseeInput {
  brandId: string;
  branchCode: string;
  branchName: string;
  address: string;
  city: string;
  openingDate: string;
  franchiseeName: string;
  franchiseePhone: string;
  franchiseeEmail: string;
  businessName: string;
  franchisePackage: string;
  contractStartDate: string;
  onboardingStatus: OnboardingStatus;
  isActive: boolean;
}

export interface RegisterFranchiseeResult {
  ok: boolean;
  error?: string;
  usedFallback?: boolean;
  savedLocally?: boolean;
  branch?: FranchiseeRow;
}

const BASE_SELECT = 'id,name,address,is_active,created_at';

const EXTENDED_SELECT =
  `${BASE_SELECT},branch_code,franchisee_name,franchisee_phone,franchisee_email,business_name,city,opening_date,contract_start_date,franchise_package,onboarding_status,owner_user_id`;

function localStorageKey(brandId: string) {
  return `coftea-franchisees:v2:${brandId}`;
}

function readLocalFranchisees(brandId: string): FranchiseeRow[] {
  try {
    const raw = localStorage.getItem(localStorageKey(brandId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FranchiseeRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
      ...row,
      _local: row._local ?? isLocalFranchiseeId(row.id),
    }));
  } catch {
    return [];
  }
}

function writeLocalFranchisees(brandId: string, rows: FranchiseeRow[]) {
  try {
    localStorage.setItem(localStorageKey(brandId), JSON.stringify(rows));
  } catch {
    /* storage full or blocked */
  }
}

function isLocalFranchiseeId(id: string) {
  return id.startsWith('local-');
}

function isLocalFranchisee(row: FranchiseeRow) {
  return row._local === true || isLocalFranchiseeId(row.id);
}

function rowsMatchForDelete(a: FranchiseeRow, b: FranchiseeRow) {
  if (a.id === b.id) return true;
  const sameName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
  const sameOwner =
    (a.franchisee_name ?? '').trim().toLowerCase() ===
    (b.franchisee_name ?? '').trim().toLowerCase();
  const sameContact =
    (a.franchisee_phone ?? '').trim() === (b.franchisee_phone ?? '').trim() ||
    (a.franchisee_email ?? '').trim().toLowerCase() ===
      (b.franchisee_email ?? '').trim().toLowerCase();
  return sameName && sameOwner && (sameContact || (!a.franchisee_phone && !a.franchisee_email));
}

function isColumnError(message: string) {
  return message.toLowerCase().includes('column');
}

function isNetworkError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('fetch failed')
  );
}

function mapSupabaseError(message: string) {
  if (isNetworkError(message)) {
    return 'Could not reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.';
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'Cannot save franchisee: HQ must sign in with Email Login (hq@coftea.com), not Staff PIN demo. Log out, sign in with HQ email, then register again.';
  }
  if (isColumnError(message)) {
    return 'Franchisee fields are missing on the branch table. Run supabase-franchisee-fields.sql in Supabase SQL Editor.';
  }
  return message;
}

async function ensureHqWriteAccess(): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      ok: false,
      error:
        'HQ demo PIN cannot register franchisees. Log out, then sign in with Email Login using hq@coftea.com.',
    };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: mapSupabaseError(error.message) };
  }

  if (profile?.role !== 'hq_admin') {
    return {
      ok: false,
      error: 'Only HQ admin accounts can register franchisees. Sign in with hq@coftea.com.',
    };
  }

  return { ok: true };
}

function buildExtendedInsert(input: RegisterFranchiseeInput) {
  return {
    name: input.branchName.trim(),
    address: input.address.trim(),
    is_active: input.isActive,
    brand_id: input.brandId,
    branch_code: input.branchCode.trim() || null,
    franchisee_name: input.franchiseeName.trim(),
    franchisee_phone: input.franchiseePhone.trim() || null,
    franchisee_email: input.franchiseeEmail.trim() || null,
    business_name: input.businessName.trim() || null,
    city: input.city.trim() || null,
    opening_date: input.openingDate || null,
    contract_start_date: input.contractStartDate || null,
    franchise_package: input.franchisePackage || null,
    onboarding_status: input.onboardingStatus,
  };
}

function buildCoreInsert(input: RegisterFranchiseeInput) {
  const citySuffix = input.city.trim() ? ` · ${input.city.trim()}` : '';
  const ownerNote = input.franchiseeName.trim()
    ? ` · Franchisee: ${input.franchiseeName.trim()}`
    : '';
  const contactNote =
    input.franchiseePhone.trim() || input.franchiseeEmail.trim()
      ? ` (${input.franchiseePhone.trim() || input.franchiseeEmail.trim()})`
      : '';

  return {
    name: input.branchName.trim(),
    address: `${input.address.trim()}${citySuffix}${ownerNote}${contactNote}`,
    is_active: input.isActive,
    brand_id: input.brandId,
  };
}

function buildLocalRow(input: RegisterFranchiseeInput): FranchiseeRow {
  const id = createLocalId();
  return {
    id,
    name: input.branchName.trim(),
    address: input.address.trim(),
    is_active: input.isActive,
    created_at: new Date().toISOString(),
    branch_code: input.branchCode.trim() || null,
    franchisee_name: input.franchiseeName.trim(),
    franchisee_phone: input.franchiseePhone.trim() || null,
    franchisee_email: input.franchiseeEmail.trim() || null,
    business_name: input.businessName.trim() || null,
    city: input.city.trim() || null,
    opening_date: input.openingDate || null,
    contract_start_date: input.contractStartDate || null,
    franchise_package: input.franchisePackage || null,
    onboarding_status: input.onboardingStatus,
    _local: true,
  };
}

function saveLocalFranchisee(input: RegisterFranchiseeInput): FranchiseeRow {
  const row = buildLocalRow(input);
  const existing = readLocalFranchisees(input.brandId);
  writeLocalFranchisees(input.brandId, [...existing, row]);
  return row;
}

function updateLocalFranchisee(
  brandId: string,
  id: string,
  input: RegisterFranchiseeInput
): FranchiseeRow | null {
  const rows = readLocalFranchisees(brandId);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return null;

  const updated: FranchiseeRow = {
    ...rows[index],
    name: input.branchName.trim(),
    address: input.address.trim(),
    is_active: input.isActive,
    branch_code: input.branchCode.trim() || null,
    franchisee_name: input.franchiseeName.trim(),
    franchisee_phone: input.franchiseePhone.trim() || null,
    franchisee_email: input.franchiseeEmail.trim() || null,
    business_name: input.businessName.trim() || null,
    city: input.city.trim() || null,
    opening_date: input.openingDate || null,
    contract_start_date: input.contractStartDate || null,
    franchise_package: input.franchisePackage || null,
    onboarding_status: input.onboardingStatus,
    _local: true,
  };

  rows[index] = updated;
  writeLocalFranchisees(brandId, rows);
  return updated;
}

function deleteLocalFranchisee(brandId: string, id: string): boolean {
  const rows = readLocalFranchisees(brandId);
  const next = rows.filter((row) => row.id !== id);
  if (next.length === rows.length) return false;
  writeLocalFranchisees(brandId, next);
  return true;
}

function deleteLocalFranchiseeByRow(brandId: string, target: FranchiseeRow): boolean {
  const rows = readLocalFranchisees(brandId);
  const next = rows.filter((row) => !rowsMatchForDelete(row, target));
  if (next.length === rows.length) return false;
  writeLocalFranchisees(brandId, next);
  return true;
}

function createLocalId() {
  try {
    return `local-${crypto.randomUUID()}`;
  } catch {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export interface DemoBranchSeed {
  code: string;
  name: string;
  address: string;
  is_active: boolean;
  franchisee_name?: string | null;
  franchisee_phone?: string | null;
  franchisee_email?: string | null;
  opening_date?: string | null;
  onboarding_status?: string | null;
}

function samplesToRows(samples: DemoBranchSeed[]): FranchiseeRow[] {
  return samples.map((sample) => ({
    id: createLocalId(),
    name: sample.name,
    address: sample.address,
    is_active: sample.is_active,
    created_at: new Date().toISOString(),
    branch_code: sample.code,
    franchisee_name: sample.franchisee_name ?? null,
    franchisee_phone: sample.franchisee_phone ?? null,
    franchisee_email: sample.franchisee_email ?? null,
    opening_date: sample.opening_date ?? null,
    onboarding_status: sample.onboarding_status ?? 'active',
    _local: true,
  }));
}

/** Load local franchisees, seeding sample rows when empty. Always returns an array. */
export function ensureSampleFranchisees(
  brandId: string,
  samples: DemoBranchSeed[]
): FranchiseeRow[] {
  const existing = readLocalFranchisees(brandId);
  if (existing.length > 0) {
    return existing;
  }

  const rows = samplesToRows(samples);
  writeLocalFranchisees(brandId, rows);
  return rows;
}

/** @deprecated Use ensureSampleFranchisees */
export function seedDemoFranchiseesIfEmpty(
  brandId: string,
  samples: DemoBranchSeed[]
): FranchiseeRow[] | null {
  const rows = ensureSampleFranchisees(brandId, samples);
  return rows.length > 0 ? rows : null;
}

export async function fetchFranchisees(
  brandId: string
): Promise<{ rows: FranchiseeRow[] | null; error?: string; fromLocal?: boolean }> {
  const localRows = readLocalFranchisees(brandId);

  try {
    const primaryResponse = await supabase
      .from('branch')
      .select(EXTENDED_SELECT)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true });

    let data = primaryResponse.data as FranchiseeRow[] | null;
    let error = primaryResponse.error;

    if (error && isColumnError(error.message)) {
      const fallbackResponse = await supabase
        .from('branch')
        .select(BASE_SELECT)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: true });
      data = fallbackResponse.data as FranchiseeRow[] | null;
      error = fallbackResponse.error;
    }

    if (error) {
      if (isNetworkError(error.message)) {
        if (localRows.length > 0) {
          return { rows: localRows, fromLocal: true };
        }
        return { rows: null, error: mapSupabaseError(error.message) };
      }
      return { rows: null, error: mapSupabaseError(error.message) };
    }

    const remoteRows = (data as FranchiseeRow[]) ?? [];
    if (localRows.length === 0) {
      return { rows: remoteRows.length > 0 ? remoteRows : null };
    }

    const remoteIds = new Set(remoteRows.map((row) => row.id));
    const merged = [
      ...remoteRows,
      ...localRows.filter((row) => !remoteIds.has(row.id)),
    ];
    return { rows: merged, fromLocal: localRows.length > 0 && remoteRows.length === 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load franchisees.';
    if (isNetworkError(message) && localRows.length > 0) {
      return { rows: localRows, fromLocal: true };
    }
    return { rows: null, error: mapSupabaseError(message) };
  }
}

export async function registerFranchisee(
  input: RegisterFranchiseeInput
): Promise<RegisterFranchiseeResult> {
  const access = await ensureHqWriteAccess();
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  try {
    let usedFallback = false;

    let { data, error } = await supabase
      .from('branch')
      .insert(buildExtendedInsert(input))
      .select(BASE_SELECT)
      .single();

    if (error && isColumnError(error.message)) {
      usedFallback = true;
      ({ data, error } = await supabase
        .from('branch')
        .insert(buildCoreInsert(input))
        .select(BASE_SELECT)
        .single());
    }

    if (error) {
      if (isNetworkError(error.message)) {
        const branch = saveLocalFranchisee(input);
        return {
          ok: true,
          savedLocally: true,
          branch,
        };
      }
      return { ok: false, error: mapSupabaseError(error.message) };
    }

    return {
      ok: true,
      usedFallback,
      branch: data as FranchiseeRow,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to register franchisee.';
    if (isNetworkError(message)) {
      const branch = saveLocalFranchisee(input);
      return {
        ok: true,
        savedLocally: true,
        branch,
      };
    }
    return { ok: false, error: mapSupabaseError(message) };
  }
}

export async function updateFranchisee(
  id: string,
  input: RegisterFranchiseeInput
): Promise<RegisterFranchiseeResult> {
  if (isLocalFranchiseeId(id)) {
    const branch = updateLocalFranchisee(input.brandId, id, input);
    if (!branch) {
      return { ok: false, error: 'Franchisee not found.' };
    }
    return { ok: true, savedLocally: true, branch };
  }

  const access = await ensureHqWriteAccess();
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  try {
    let usedFallback = false;

    let { data, error } = await supabase
      .from('branch')
      .update(buildExtendedInsert(input))
      .eq('id', id)
      .eq('brand_id', input.brandId)
      .select(BASE_SELECT)
      .single();

    if (error && isColumnError(error.message)) {
      usedFallback = true;
      ({ data, error } = await supabase
        .from('branch')
        .update(buildCoreInsert(input))
        .eq('id', id)
        .eq('brand_id', input.brandId)
        .select(BASE_SELECT)
        .single());
    }

    if (error) {
      return { ok: false, error: mapSupabaseError(error.message) };
    }

    return {
      ok: true,
      usedFallback,
      branch: data as FranchiseeRow,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update franchisee.';
    return { ok: false, error: mapSupabaseError(message) };
  }
}

export async function deleteFranchisee(
  id: string,
  brandId: string,
  row?: FranchiseeRow
): Promise<{ ok: boolean; error?: string; deletedLocally?: boolean }> {
  const removedFromLocal =
    deleteLocalFranchisee(brandId, id) ||
    (row ? deleteLocalFranchiseeByRow(brandId, row) : false);

  const isLocalOnly = isLocalFranchiseeId(id) || (row != null && isLocalFranchisee(row));

  if (isLocalOnly) {
    return { ok: true, deletedLocally: true };
  }

  const access = await ensureHqWriteAccess();
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const backendResult = await deleteFranchiseeFromBackend({ branchId: id, brandId });
  if (backendResult.ok) {
    return { ok: true };
  }

  if (
    backendResult.error &&
    !backendResult.error.toLowerCase().includes('could not reach') &&
    !backendResult.error.toLowerCase().includes('function')
  ) {
    return { ok: false, error: backendResult.error };
  }

  try {
    const { error } = await supabase
      .from('branch')
      .delete()
      .eq('id', id)
      .eq('brand_id', brandId);

    if (error) {
      if (isNetworkError(error.message)) {
        return { ok: true, deletedLocally: removedFromLocal || Boolean(row) };
      }
      return { ok: false, error: mapSupabaseError(error.message) };
    }

    return {
      ok: false,
      error:
        'Branch removed from list but owner login may still exist. Deploy delete-franchisee edge function, then delete again.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete franchisee.';
    if (isNetworkError(message)) {
      return { ok: true, deletedLocally: removedFromLocal || Boolean(row) };
    }
    return { ok: false, error: mapSupabaseError(message) };
  }
}
