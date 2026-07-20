/**
 * Revenue recognition: only completed, paid sales count.
 * Open tickets stay NEW + UNPAID until Charge.
 */
export function isCountablePaidSale(
  status: string | null | undefined,
  paymentStatus: string | null | undefined
): boolean {
  const pay = String(paymentStatus ?? '').toUpperCase();
  if (pay !== 'PAID') return false;

  const orderStatus = String(status ?? '').toUpperCase();
  if (orderStatus === 'VOIDED' || orderStatus === 'REFUNDED') return false;

  return orderStatus === 'COMPLETED';
}

export function isOpenUnpaidOrder(
  status: string | null | undefined,
  paymentStatus: string | null | undefined
): boolean {
  const orderStatus = String(status ?? 'NEW').toUpperCase();
  const pay = String(paymentStatus ?? 'UNPAID').toUpperCase();
  return orderStatus === 'NEW' && pay === 'UNPAID';
}
