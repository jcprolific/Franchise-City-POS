// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
  buildHeaderFinder,
  excelSerialToIso,
  mapOnboardingStatus,
  mapRosterRow,
  mapStoreStatus,
  normalizePhone,
} from '../../../scripts/rosterImportCore.mjs';

describe('rosterImportCore', () => {
  it('normalizes scientific notation phones', () => {
    expect(normalizePhone('9.171808384E9')).toBe('09171808384');
    expect(normalizePhone('09213715125')).toBe('09213715125');
  });

  it('converts excel serial dates', () => {
    expect(excelSerialToIso('45772')).toBe('2025-04-25');
  });

  it('maps messy status labels', () => {
    expect(mapStoreStatus('Active', 'Daily/Frequent/Active Orders', '').storeStatus).toBe(
      'active'
    );
    expect(mapStoreStatus('Terminated', 'Closed', '').storeStatus).toBe('terminated');
    expect(mapStoreStatus('For Termination', '', '').storeStatus).toBe('for_termination');
    expect(mapStoreStatus('Relocating', '', '').storeStatus).toBe('relocating');
  });

  it('maps onboarding from store status', () => {
    expect(mapOnboardingStatus('active')).toBe('active');
    expect(mapOnboardingStatus('downpayment')).toBe('onboarding');
    expect(mapOnboardingStatus('terminated')).toBe('suspended');
  });

  it('maps a coftea-style row', () => {
    const headerFinder = buildHeaderFinder({
      1: 'Franchisee Name',
      2: 'Franchise Name',
      3: 'Status',
      4: 'Contact Number',
      5: 'Home Address',
      6: 'Branch Address',
      7: 'Email Address',
      8: 'Franchise Package',
    });
    const row = {
      1: 'Concon, Margarette Marie',
      2: 'Coftea Brgy Zone 1 Dasmarinas Cavite',
      3: 'Active',
      4: '09993284061',
      5: 'Brgy San Jose, Dasmarinas Cavite',
      6: '#10 Zone 1 Dasmarinas',
      7: 'margaconcon@gmail.com',
      8: 'Package A',
    };
    const mapped = mapRosterRow({
      brandSlug: 'coftea',
      brandId: 'a1000000-0000-4000-8000-000000000002',
      sheetName: 'Coftea Roster',
      rowNumber: 12,
      row,
      headerFinder,
    });
    expect(mapped?.store_status).toBe('active');
    expect(mapped?.franchisee_email).toBe('margaconcon@gmail.com');
    expect(mapped?.source_sheet).toBe('Coftea Roster');
    expect(mapped?.source_row).toBe(12);
  });
});
