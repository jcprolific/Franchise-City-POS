import { supabase } from './supabase';
import { withTimeout, SUPABASE_TIMEOUT_MS } from './withTimeout';
import {
  buildBranchRef,
  formatBranchLocation,
  setCurrentBranch,
  type BranchRef,
} from './branchContext';

export interface FranchiseeBranchRow {
  id: string | null;
  name: string | null;
  business_name: string | null;
  city?: string | null;
  address?: string | null;
}

export interface FranchiseeWelcome {
  branchId: string | null;
  welcomeName: string;
  locationLabel: string;
  isLinked: boolean;
}

const BRANCH_SELECT = 'id, name, business_name, city, address';

export function buildWelcome(
  row: FranchiseeBranchRow | null,
  email: string
): FranchiseeWelcome {
  if (row?.name) {
    const locationLabel = formatBranchLocation(row.city, row.address) || row.name;
    return {
      branchId: row.id,
      welcomeName: row.name,
      locationLabel,
      isLinked: true,
    };
  }
  if (row?.business_name) {
    const locationLabel =
      formatBranchLocation(row.city, row.address) || row.business_name;
    return {
      branchId: row.id,
      welcomeName: row.business_name,
      locationLabel,
      isLinked: true,
    };
  }
  const fallback = email.split('@')[0]?.trim();
  return {
    branchId: null,
    welcomeName: fallback || 'Franchisee',
    locationLabel: fallback || 'Franchisee',
    isLinked: false,
  };
}

function applyResolvedBranch(row: FranchiseeBranchRow | null): void {
  if (!row?.id || !row.name) return;
  setCurrentBranch(
    buildBranchRef({
      id: row.id,
      name: row.name,
      city: row.city,
      address: row.address,
    })
  );
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
          .select(BRANCH_SELECT)
          .eq('owner_user_id', userId)
          .limit(1)
          .maybeSingle(),
        SUPABASE_TIMEOUT_MS
      );
      if (!error && data) {
        const welcome = buildWelcome(data as FranchiseeBranchRow, email);
        applyResolvedBranch(data as FranchiseeBranchRow);
        return welcome;
      }

      const { data: profile } = await withTimeout(
        supabase
          .from('profiles')
          .select('branch_id')
          .eq('id', userId)
          .maybeSingle(),
        SUPABASE_TIMEOUT_MS
      );

      if (profile?.branch_id) {
        const { data: staffBranch, error: staffError } = await withTimeout(
          supabase
            .from('branch')
            .select(BRANCH_SELECT)
            .eq('id', profile.branch_id)
            .maybeSingle(),
          SUPABASE_TIMEOUT_MS
        );
        if (!staffError && staffBranch) {
          const welcome = buildWelcome(staffBranch as FranchiseeBranchRow, email);
          applyResolvedBranch(staffBranch as FranchiseeBranchRow);
          return welcome;
        }
      }
    } catch {
      /* fall through to email lookup */
    }
  }

  if (!email) return buildWelcome(null, email);
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('branch')
        .select(BRANCH_SELECT)
        .ilike('franchisee_email', email)
        .limit(1)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS
    );
    if (error) return buildWelcome(null, email);
    const welcome = buildWelcome(data as FranchiseeBranchRow | null, email);
    if (data) applyResolvedBranch(data as FranchiseeBranchRow);
    return welcome;
  } catch {
    return buildWelcome(null, email);
  }
}

export type { BranchRef };
