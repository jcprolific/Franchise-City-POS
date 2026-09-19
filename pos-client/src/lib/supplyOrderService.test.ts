import { describe, expect, it } from 'vitest';
import {
  isAwaitingSupplyPayment,
  isHqFulfillableSupplyOrder,
  nextSupplyStatus,
  SUPPLY_ORDER_STATUS_LABELS,
  SUPPLY_PAYMENT_STATUS_LABELS,
} from './supplyOrderService';

describe('supply order HitPay statuses', () => {
  it('does not let HQ advance unpaid pending_payment orders', () => {
    expect(nextSupplyStatus('pending_payment')).toBeNull();
    expect(
      isHqFulfillableSupplyOrder({ status: 'pending_payment', paymentStatus: 'unpaid' })
    ).toBe(false);
  });

  it('shows paid pending orders to HQ for fulfillment', () => {
    expect(isHqFulfillableSupplyOrder({ status: 'pending', paymentStatus: 'paid' })).toBe(true);
    expect(nextSupplyStatus('pending')).toBe('approved');
  });

  it('labels awaiting payment for franchisees', () => {
    expect(SUPPLY_ORDER_STATUS_LABELS.pending_payment).toBe('Awaiting payment');
    expect(SUPPLY_PAYMENT_STATUS_LABELS.unpaid).toBe('Awaiting payment');
    expect(
      isAwaitingSupplyPayment({ status: 'pending_payment', paymentStatus: 'unpaid' })
    ).toBe(true);
  });
});
