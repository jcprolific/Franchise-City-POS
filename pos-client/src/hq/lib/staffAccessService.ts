import { supabase } from '../../lib/supabase';

export type StaffRole =
  | 'cashier'
  | 'manager'
  | 'supervisor'
  | 'inventory_staff'
  | 'hq_admin';
export type StaffStatus = 'active' | 'inactive';

export interface StaffMember {
  id: string;
  auth_user_id: string | null;
  brand_id: string;
  branch_id: string | null;
  branch_name: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  created_by: string | null;
  account_level: string;
  last_login_at: string | null;
  created_at: string;
}

export interface StaffBranchOption {
  id: string;
  name: string;
}

interface StaffRow {
  id: string;
  auth_user_id: string | null;
  brand_id: string;
  branch_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  created_by: string | null;
  account_level: string;
  last_login_at: string | null;
  created_at: string;
  branch?: { name?: string | null } | { name?: string | null }[] | null;
}

export interface CreateStaffInput {
  email: string;
  password: string;
  fullName: string;
  brandId: string;
  branchId: string | null;
  role: StaffRole;
  phone: string | null;
}

export interface CreateStaffResult {
  ok: boolean;
  error?: string;
  staff?: StaffMember;
}

function resolveBranchName(branch: StaffRow['branch']): string | null {
  if (!branch) return null;
  if (Array.isArray(branch)) return branch[0]?.name ?? null;
  return branch.name ?? null;
}

/**
 * Fetch the brand-scoped staff roster. Returns null when the table is missing
 * or unreachable so callers can fall back to sample data.
 */
export async function fetchStaff(brandDbId: string): Promise<StaffMember[] | null> {
  const { data, error } = await supabase
    .from('staff_access')
    .select(
      'id,auth_user_id,brand_id,branch_id,full_name,email,phone,role,status,created_by,account_level,last_login_at,created_at,branch:branch_id(name)'
    )
    .eq('brand_id', brandDbId)
    .order('created_at', { ascending: false });

  if (error) return null;

  return ((data as StaffRow[] | null) ?? []).map((row) => ({
    id: row.id,
    auth_user_id: row.auth_user_id,
    brand_id: row.brand_id,
    branch_id: row.branch_id,
    branch_name: resolveBranchName(row.branch),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    created_by: row.created_by ?? null,
    account_level: row.account_level ?? 'staff',
    last_login_at: row.last_login_at,
    created_at: row.created_at,
  }));
}

export async function fetchActiveBranches(brandDbId: string): Promise<StaffBranchOption[]> {
  const { data, error } = await supabase
    .from('branch')
    .select('id,name,is_active')
    .eq('brand_id', brandDbId)
    .order('name', { ascending: true });

  if (error) return [];
  return ((data as { id: string; name: string; is_active: boolean }[] | null) ?? [])
    .filter((b) => b.is_active !== false)
    .map((b) => ({ id: b.id, name: b.name }));
}

/**
 * Create a real Supabase Auth staff user via the create-staff-user Edge
 * Function. Service-role work happens server-side; the browser only sends the
 * authenticated request.
 */
export async function createStaffUser(input: CreateStaffInput): Promise<CreateStaffResult> {
  try {
    const { data, error } = await supabase.functions.invoke('create-staff-user', {
      body: {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        brandId: input.brandId,
        branchId: input.branchId,
        role: input.role,
        phone: input.phone,
      },
    });

    if (error) {
      // Edge Function errors carry the response body in error.context.
      let message = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        }
      } catch {
        /* keep default message */
      }
      return { ok: false, error: message };
    }

    if (data?.error) {
      return { ok: false, error: data.error as string };
    }

    return { ok: true, staff: data?.staff as StaffMember | undefined };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Could not reach the staff creation service.';
    return { ok: false, error: message };
  }
}

export async function setStaffStatus(staffId: string, status: StaffStatus) {
  return supabase.from('staff_access').update({ status }).eq('id', staffId);
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  cashier: 'Cashier',
  manager: 'Manager',
  supervisor: 'Supervisor',
  inventory_staff: 'Inventory Staff',
  hq_admin: 'HQ Admin',
};
