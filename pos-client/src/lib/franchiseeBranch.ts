import { supabase } from './supabase';
import { withTimeout, SUPABASE_TIMEOUT_MS } from './withTimeout';

export interface FranchiseeBranchRow {
  id: string | null;
  name: string | null;
  business_name: string | null;
}

export interface FranchiseeWelcome {
  branchId: string | null;
  welcomeName: string;
  isLinked: boolean;
}

export function buildWelcome(
  row: FranchiseeBranchRow | null,
  email: string
): FranchiseeWelcome {
  if (row?.name) {
    return { branchId: row.id, welcomeName: row.name, isLinked: true };
  }
  if (row?.business_name) {
    return { branchId: row.id, welcomeName: row.business_name, isLinked: true };
  }
  const fallback = email.split('@')[0]?.trim();
  return {
    branchId: null,
    welcomeName: fallback || 'Franchisee',
    isLinked: false,
  };
}

export async function resolveFranchiseeBranch(
  email: string,
  userId?: string
): Promise<FranchiseeWelcome> {
  if (userId) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('branch')
          .select('id, name, business_name')
          .eq('owner_user_id', userId)
          .limit(1)
          .maybeSingle(),
        SUPABASE_TIMEOUT_MS
      );
      if (!error && data) return buildWelcome(data as FranchiseeBranchRow | null, email);
    } catch {
      /* fall through to email lookup */
    }
  }

  if (!email) return buildWelcome(null, email);
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('branch')
        .select('id, name, business_name')
        .ilike('franchisee_email', email)
        .limit(1)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS
    );
    if (error) return buildWelcome(null, email);
    return buildWelcome(data as FranchiseeBranchRow | null, email);
  } catch {
    return buildWelcome(null, email);
  }
}
