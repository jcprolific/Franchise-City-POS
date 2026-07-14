/**
 * Option A: franchisee/HQ sales count paid punches immediately.
 * Kitchen workflow status is independent of revenue recognition.
 */
export function isCountablePaidSale(
  status: string | null | undefined,
  paymentStatus: string | null | undefined
): boolean {
  const pay = String(paymentStatus ?? 'PAID').toUpperCase();
  if (pay !== 'PAID') return false;

  const kitchen = String(status ?? 'NEW').toUpperCase();
  if (kitchen === 'VOIDED' || kitchen === 'REFUNDED') return false;

  return true;
}
