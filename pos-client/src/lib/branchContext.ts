// Resolves the branch the POS terminal is operating as. Guest/PIN logins have no
// Supabase user, so the branch is stored locally and defaults to the seeded
// "Coftea — BGC Central" branch. Email logins sync from Supabase on sign-in.

export interface BranchRef {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  locationLabel?: string;
}

export const BRANCH_UPDATED_EVENT = 'coftea:branch-updated';

export const DEFAULT_COFTEA_BRANCH: BranchRef = {
  id: 'b1000000-0000-4000-8000-000000000001',
  name: 'Coftea — BGC Central',
  city: 'Taguig',
  address: 'BGC Central',
  locationLabel: 'Taguig · BGC Central',
};

const BRANCH_STORAGE_KEY = 'coftea.pos.selectedBranch';

const branchListeners = new Set<() => void>();

export function formatBranchLocation(
  city?: string | null,
  address?: string | null
): string {
  const parts = [city?.trim(), address?.trim()].filter(Boolean) as string[];
  return parts.join(' · ');
}

export function buildBranchRef(row: {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
}): BranchRef {
  const locationLabel = formatBranchLocation(row.city, row.address);
  return {
    id: row.id,
    name: row.name,
    city: row.city ?? null,
    address: row.address ?? null,
    locationLabel: locationLabel || row.name,
  };
}

export function subscribeBranch(listener: () => void): () => void {
  branchListeners.add(listener);
  return () => branchListeners.delete(listener);
}

function notifyBranchListeners(): void {
  branchListeners.forEach((listener) => listener());
}

export function getCurrentBranch(): BranchRef {
  try {
    const raw = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BranchRef>;
      if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
        const locationLabel =
          parsed.locationLabel ||
          formatBranchLocation(parsed.city, parsed.address) ||
          parsed.name;
        return {
          id: parsed.id,
          name: parsed.name,
          city: parsed.city ?? null,
          address: parsed.address ?? null,
          locationLabel,
        };
      }
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_COFTEA_BRANCH;
}

export function setCurrentBranch(branch: BranchRef): void {
  const normalized = buildBranchRef(branch);
  localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(normalized));
  notifyBranchListeners();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BRANCH_UPDATED_EVENT, { detail: normalized }));
  }
}

export function clearCurrentBranch(): void {
  localStorage.removeItem(BRANCH_STORAGE_KEY);
  notifyBranchListeners();
}
