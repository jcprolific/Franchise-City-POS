import { describe, expect, it } from 'vitest';
import { computeDiscountAmount, computeOrderTotal } from './discountService';

describe('discountService', () => {
  it('zeros total for free drink', () => {
    expect(computeDiscountAmount(150, 'FREE_DRINK')).toBe(150);
    expect(computeOrderTotal(150, 150)).toBe(0);
  });

  it('applies editable promo percent', () => {
    expect(computeDiscountAmount(200, 'PROMO', 15)).toBe(30);
  });

  it('applies pwd/senior at 20%', () => {
    expect(computeDiscountAmount(100, 'PWD')).toBe(20);
  });
});
