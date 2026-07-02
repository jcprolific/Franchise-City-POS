// Resolves the branch the POS terminal is operating as. Guest/PIN logins have no
// Supabase user, so the branch is stored locally and defaults to the seeded
// "Coftea — BGC Central" branch. Structured so a branch picker can set it later.

export interface BranchRef {
  id: string;
  name: string;
}

export const DEFAULT_COFTEA_BRANCH: BranchRef = {
  id: 'b1000000-0000-4000-8000-000000000001',
  name: 'Coftea — BGC Central',
};

const BRANCH_STORAGE_KEY = 'coftea.pos.selectedBranch';

export function getCurrentBranch(): BranchRef {
  try {
    const raw = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BranchRef>;
      if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
        return { id: parsed.id, name: parsed.name };
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_COFTEA_BRANCH;
}

export function setCurrentBranch(branch: BranchRef): void {
  localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(branch));
}
