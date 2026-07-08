import { supabase } from '../../lib/supabase';
import type { BranchStaffRole } from '../../lib/permissions';

export type StaffStatus = 'active' | 'inactive';

export interface BranchStaffMember {
  id: string;
  auth_user_id: string | null;
  brand_id: string;
  branch_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: BranchStaffRole;
  status: StaffStatus;
  created_by: string | null;
  account_level: string;
  last_login_at: string | null;
  created_at: string;
}

export interface CreateBranchStaffInput {
  email: string;
  password: string;
  fullName: string;
  role: BranchStaffRole;
  phone: string | null;
}

export interface CreateBranchStaffResult {
  ok: boolean;
  error?: string;
  staff?: BranchStaffMember;
}

interface StaffRow {
  id: string;
  auth_user_id: string | null;
  brand_id: string;
  branch_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: BranchStaffRole;
  status: StaffStatus;
  created_by: string | null;
  account_level: string;
  last_login_at: string | null;
  created_at: string;
}

export async function fetchBranchStaff(branchId: string): Promise<BranchStaffMember[] | null> {
  const { data, error } = await supabase
    .from('staff_access')
    .select(
      'id,auth_user_id,brand_id,branch_id,full_name,email,phone,role,status,created_by,account_level,last_login_at,created_at'
    )
    .eq('branch_id', branchId)
    .eq('account_level', 'staff')
    .order('created_at', { ascending: false });

  if (error) return null;
  return (data as StaffRow[]) ?? [];
}

export async function createBranchStaff(
  input: CreateBranchStaffInput
): Promise<CreateBranchStaffResult> {
  try {
    const { data, error } = await supabase.functions.invoke('create-branch-staff', {
      body: {
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        role: input.role,
        phone: input.phone,
      },
    });

    if (error) {
      let message = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) message = body.error;
        }
      } catch {
        /* keep default */
      }
      return { ok: false, error: message };
    }

    if (data?.error) {
      return { ok: false, error: data.error as string };
    }

    return { ok: true, staff: data?.staff as BranchStaffMember | undefined };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach staff creation service.',
    };
  }
}

export async function setBranchStaffStatus(staffId: string, status: StaffStatus) {
  return supabase.from('staff_access').update({ status }).eq('id', staffId);
}

export interface OwnerBranchInfo {
  id: string;
  name: string;
  business_name: string | null;
  franchisee_name: string | null;
  franchisee_phone: string | null;
  franchisee_email: string | null;
  address: string | null;
  city: string | null;
  owner_user_id: string | null;
}

export async function fetchOwnerBranch(userId: string): Promise<OwnerBranchInfo | null> {
  const { data, error } = await supabase
    .from('branch')
    .select(
      'id,name,business_name,franchisee_name,franchisee_phone,franchisee_email,address,city,owner_user_id'
    )
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as OwnerBranchInfo;
}

export async function updateOwnerBranchInfo(
  branchId: string,
  updates: {
    business_name?: string;
    franchisee_phone?: string;
    address?: string;
    city?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('branch').update(updates).eq('id', branchId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
