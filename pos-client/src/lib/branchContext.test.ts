import { describe, it, expect } from 'vitest';
import { DEFAULT_COFTEA_BRANCH, isSeedBranchId } from './branchContext';

describe('isSeedBranchId', () => {
  it('detects the placeholder BGC seed branch', () => {
    expect(isSeedBranchId(DEFAULT_COFTEA_BRANCH.id)).toBe(true);
  });

  it('accepts real branch UUIDs', () => {
    expect(isSeedBranchId('4120eec3-6f80-4e08-9fa2-14900be95172')).toBe(false);
  });
});
