import type { DiscountType } from '../types';

export function computeDiscountAmount(
  subtotal: number,
  discountType: DiscountType,
  promoPercent = 10
): number {
  if (subtotal <= 0 || discountType === 'NONE') return 0;
  if (discountType === 'FREE_DRINK') return subtotal;
  if (discountType === 'PROMO') return subtotal * (Math.max(0, promoPercent) / 100);
  return subtotal * 0.2;
}

export function computeOrderTotal(subtotal: number, discountAmount: number): number {
  return Math.max(0, subtotal - discountAmount);
}
