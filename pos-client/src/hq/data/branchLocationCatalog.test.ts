import { describe, expect, it } from 'vitest';
import {
  CUSTOM_BRANCH_LOCATION_ID,
  findBranchLocationById,
  formatLocationLabel,
  getAvailableBranchLocations,
  locationToFranchiseeFields,
  matchBranchToLocationId,
} from './branchLocationCatalog';

describe('branchLocationCatalog', () => {
  it('maps a location to franchisee form fields', () => {
    const loc = findBranchLocationById('coftea', 'coftea-bgc');
    expect(loc).not.toBeNull();
    expect(locationToFranchiseeFields(loc!)).toEqual({
      branchCode: 'BGC-01',
      branchName: 'Coftea — BGC Central',
      address: 'Bonifacio Global City, 26th St corner 7th Ave',
      city: 'Taguig City',
    });
  });

  it('formats a readable location label', () => {
    const loc = findBranchLocationById('coftea', 'coftea-makati');
    expect(formatLocationLabel(loc!)).toBe('Coftea — Makati — Makati City');
  });

  it('matches branch rows by code', () => {
    const id = matchBranchToLocationId('coftea', {
      branch_code: 'BGC-01',
      name: 'Anything',
      city: 'Taguig City',
      address: 'BGC',
    });
    expect(id).toBe('coftea-bgc');
  });

  it('excludes locations already assigned to another branch', () => {
    const available = getAvailableBranchLocations(
      'coftea',
      [
        {
          id: 'b-1',
          name: 'Coftea — BGC Central',
          address: 'BGC',
          is_active: true,
          created_at: '',
          branch_code: 'BGC-01',
          owner_user_id: 'owner-1',
        },
      ],
      null
    );
    expect(available.some((loc) => loc.id === 'coftea-bgc')).toBe(false);
    expect(available.some((loc) => loc.id === 'coftea-makati')).toBe(true);
  });

  it('returns custom when no catalog match', () => {
    expect(
      matchBranchToLocationId('coftea', {
        branch_code: 'XYZ',
        name: 'Unknown Store',
        city: 'Nowhere',
        address: '123',
      })
    ).toBe(CUSTOM_BRANCH_LOCATION_ID);
  });
});
