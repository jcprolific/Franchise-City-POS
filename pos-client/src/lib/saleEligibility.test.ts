import { describe, it, expect } from 'vitest';
import { isCountablePaidSale, isOpenUnpaidOrder } from './saleEligibility';

describe('isCountablePaidSale', () => {
  it('counts only COMPLETED + PAID', () => {
    expect(isCountablePaidSale('COMPLETED', 'PAID')).toBe(true);
  });

  it('excludes open unpaid NEW tickets', () => {
    expect(isCountablePaidSale('NEW', 'UNPAID')).toBe(false);
    expect(isCountablePaidSale('NEW', 'PAID')).toBe(false);
  });

  it('excludes kitchen prep statuses even when paid', () => {
    expect(isCountablePaidSale('PREPARING', 'PAID')).toBe(false);
    expect(isCountablePaidSale('READY', 'PAID')).toBe(false);
  });

  it('excludes VOIDED and REFUNDED', () => {
    expect(isCountablePaidSale('VOIDED', 'PAID')).toBe(false);
    expect(isCountablePaidSale('REFUNDED', 'PAID')).toBe(false);
    expect(isCountablePaidSale('COMPLETED', 'VOIDED')).toBe(false);
  });
});

describe('isOpenUnpaidOrder', () => {
  it('detects NEW + UNPAID open tickets', () => {
    expect(isOpenUnpaidOrder('NEW', 'UNPAID')).toBe(true);
    expect(isOpenUnpaidOrder('NEW', 'PAID')).toBe(false);
    expect(isOpenUnpaidOrder('COMPLETED', 'PAID')).toBe(false);
  });
});
