import { describe, it, expect } from 'vitest';
import { isCountablePaidSale } from './saleEligibility';

describe('isCountablePaidSale (Option A)', () => {
  it('counts NEW + PAID immediately for franchisee sales', () => {
    expect(isCountablePaidSale('NEW', 'PAID')).toBe(true);
  });

  it('counts PREPARING / READY / COMPLETED when PAID', () => {
    expect(isCountablePaidSale('PREPARING', 'PAID')).toBe(true);
    expect(isCountablePaidSale('READY', 'PAID')).toBe(true);
    expect(isCountablePaidSale('COMPLETED', 'PAID')).toBe(true);
  });

  it('excludes VOIDED and REFUNDED kitchen statuses', () => {
    expect(isCountablePaidSale('VOIDED', 'PAID')).toBe(false);
    expect(isCountablePaidSale('REFUNDED', 'PAID')).toBe(false);
  });

  it('excludes non-PAID payment statuses', () => {
    expect(isCountablePaidSale('NEW', 'PENDING')).toBe(false);
    expect(isCountablePaidSale('COMPLETED', 'VOIDED')).toBe(false);
    expect(isCountablePaidSale('NEW', 'REFUNDED')).toBe(false);
  });

  it('treats missing status as countable when payment is PAID', () => {
    expect(isCountablePaidSale(null, 'PAID')).toBe(true);
    expect(isCountablePaidSale(undefined, null)).toBe(true);
  });
});
