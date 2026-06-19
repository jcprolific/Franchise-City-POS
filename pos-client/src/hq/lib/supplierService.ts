import { supabase } from '../../lib/supabase';
import type { HqSupplierRow } from '../data/getHqDemoData';

export interface CreateSupplierInput {
  brandId: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

export interface CreateSupplierResult {
  ok: boolean;
  error?: string;
  savedLocally?: boolean;
  supplier?: HqSupplierRow;
}

export interface DemoSupplierSeed {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  category?: string | null;
  is_active?: boolean | null;
}

const SELECT =
  'id,name,contact_person,phone,email,address,category,is_active,created_at';

function localStorageKey(brandId: string) {
  return `coftea-suppliers:${brandId}`;
}

function readLocalSuppliers(brandId: string): HqSupplierRow[] {
  try {
    const raw = localStorage.getItem(localStorageKey(brandId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HqSupplierRow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => ({
      ...row,
      _local: row._local ?? isLocalSupplierId(row.id),
    }));
  } catch {
    return [];
  }
}

function writeLocalSuppliers(brandId: string, rows: HqSupplierRow[]) {
  try {
    localStorage.setItem(localStorageKey(brandId), JSON.stringify(rows));
  } catch {
    /* storage full or blocked */
  }
}

function isLocalSupplierId(id: string) {
  return id.startsWith('local-');
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

function shouldSaveLocally(message: string) {
  const lower = message.toLowerCase();
  return (
    isNetworkError(message) ||
    (lower.includes('relation') && lower.includes('does not exist'))
  );
}

function mapSupabaseError(message: string) {
  if (isNetworkError(message)) {
    return 'Could not reach Supabase. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.';
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'Supplier create blocked by Supabase RLS policy. Run supabase-supplier-setup.sql first.';
  }
  if (message.toLowerCase().includes('relation') && message.toLowerCase().includes('does not exist')) {
    return 'Supplier table not found. Run supabase-supplier-setup.sql in Supabase SQL Editor.';
  }
  return message;
}

function buildInsert(input: CreateSupplierInput) {
  return {
    brand_id: input.brandId,
    name: input.name.trim(),
    category: input.category.trim() || null,
    contact_person: input.contactPerson.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    address: input.address.trim() || null,
    is_active: input.isActive,
  };
}

function buildLocalRow(input: CreateSupplierInput): HqSupplierRow {
  return {
    id: createLocalId(),
    name: input.name.trim(),
    category: input.category.trim() || null,
    contact_person: input.contactPerson.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    address: input.address.trim() || null,
    is_active: input.isActive,
    created_at: new Date().toISOString(),
    _local: true,
  };
}

function saveLocalSupplier(input: CreateSupplierInput): HqSupplierRow {
  const row = buildLocalRow(input);
  const existing = readLocalSuppliers(input.brandId);
  writeLocalSuppliers(input.brandId, [...existing, row]);
  return row;
}

function samplesToRows(samples: DemoSupplierSeed[]): HqSupplierRow[] {
  return samples.map((sample) => ({
    id: createLocalId(),
    name: sample.name,
    contact_person: sample.contact_person ?? null,
    phone: sample.phone ?? null,
    email: sample.email ?? null,
    address: sample.address ?? null,
    category: sample.category ?? null,
    is_active: sample.is_active ?? true,
    created_at: new Date().toISOString(),
    _local: true,
  }));
}

/** Load local suppliers, seeding sample rows when empty. Always returns an array. */
export function ensureSampleSuppliers(
  brandId: string,
  samples: DemoSupplierSeed[]
): HqSupplierRow[] {
  const existing = readLocalSuppliers(brandId);
  if (existing.length > 0) {
    return existing;
  }

  const rows = samplesToRows(samples);
  writeLocalSuppliers(brandId, rows);
  return rows;
}

export async function fetchSuppliers(
  brandId: string
): Promise<{ rows: HqSupplierRow[] | null; error?: string; fromLocal?: boolean }> {
  const localRows = readLocalSuppliers(brandId);

  try {
    const { data, error } = await supabase
      .from('supplier')
      .select(SELECT)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      if (shouldSaveLocally(error.message) && localRows.length > 0) {
        return { rows: localRows, fromLocal: true };
      }
      return { rows: null, error: mapSupabaseError(error.message) };
    }

    const remoteRows = (data as HqSupplierRow[]) ?? [];
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
    const message = err instanceof Error ? err.message : 'Failed to load suppliers.';
    if (shouldSaveLocally(message) && localRows.length > 0) {
      return { rows: localRows, fromLocal: true };
    }
    return { rows: null, error: mapSupabaseError(message) };
  }
}

export async function createSupplier(
  input: CreateSupplierInput
): Promise<CreateSupplierResult> {
  try {
    const { data, error } = await supabase
      .from('supplier')
      .insert(buildInsert(input))
      .select(SELECT)
      .single();

    if (error) {
      if (shouldSaveLocally(error.message)) {
        const supplier = saveLocalSupplier(input);
        return { ok: true, savedLocally: true, supplier };
      }
      return { ok: false, error: mapSupabaseError(error.message) };
    }

    return { ok: true, supplier: data as HqSupplierRow };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create supplier.';
    if (shouldSaveLocally(message)) {
      const supplier = saveLocalSupplier(input);
      return { ok: true, savedLocally: true, supplier };
    }
    return { ok: false, error: mapSupabaseError(message) };
  }
}
