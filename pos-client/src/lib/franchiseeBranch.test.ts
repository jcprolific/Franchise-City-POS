import { describe, expect, it } from 'vitest';
import { buildWelcome, type FranchiseeBranchRow } from './franchiseeBranch';

const ROW: FranchiseeBranchRow = {
  id: 'b-1',
  name: 'BGC Central',
  business_name: 'Coftea BGC Central Inc.',
};

describe('buildWelcome', () => {
  it('uses branch name when present', () => {
    expect(buildWelcome(ROW, 'owner@coftea.com')).toEqual({
      branchId: 'b-1',
      welcomeName: 'BGC Central',
      isLinked: true,
    });
  });

  it('falls back to business_name when name is missing', () => {
    const row = { ...ROW, name: null };
    expect(buildWelcome(row, 'owner@coftea.com')).toEqual({
      branchId: 'b-1',
      welcomeName: 'Coftea BGC Central Inc.',
      isLinked: true,
    });
  });

  it('falls back to the email user when no branch row matches', () => {
    expect(buildWelcome(null, 'owner@coftea.com')).toEqual({
      branchId: null,
      welcomeName: 'owner',
      isLinked: false,
    });
  });

  it('never returns an empty welcome name', () => {
    expect(buildWelcome(null, '').welcomeName).toBe('Franchisee');
  });
});
