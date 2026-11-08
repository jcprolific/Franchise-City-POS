import { describe, expect, it } from 'vitest';
import {
  cartSignature,
  minDeliveryDate,
  normalizePhMobile,
  validateCustomer,
} from './supplyCheckout';

const valid = {
  contactName: 'Juan Dela Cruz',
  mobile: '0917 123 4567',
  email: 'owner@example.com',
  address: '123 Rizal Street, Barangay Poblacion',
  city: 'Natividad',
  preferredDate: '',
};
const now = new Date(2026, 10, 8, 15, 0);

describe('normalizePhMobile', () => {
  it.each(['09171234567', '0917-123-4567', '+639171234567', '639171234567', '9171234567'])(
    'accepts %s',
    (input) => expect(normalizePhMobile(input)).toBe('+639171234567')
  );
  it.each(['', '12345', '08171234567', '091712345678'])('rejects "%s"', (input) =>
    expect(normalizePhMobile(input)).toBeNull()
  );
});

describe('validateCustomer', () => {
  it('passes complete details', () => {
    expect(validateCustomer(valid, now)).toEqual({});
  });
  it('flags every missing required field', () => {
    const errors = validateCustomer(
      { contactName: '', mobile: '', email: '', address: '', city: '', preferredDate: '' },
      now
    );
    expect(Object.keys(errors).sort()).toEqual(['address', 'city', 'contactName', 'email', 'mobile']);
  });
  it('rejects a delivery date of today but accepts tomorrow', () => {
    expect(validateCustomer({ ...valid, preferredDate: '2026-11-08' }, now).preferredDate).toBeTruthy();
    expect(validateCustomer({ ...valid, preferredDate: '2026-11-09' }, now).preferredDate).toBeUndefined();
  });
});

describe('minDeliveryDate', () => {
  it('rolls over the month', () => {
    expect(minDeliveryDate(new Date(2026, 10, 30))).toBe('2026-12-01');
  });
});

describe('cartSignature', () => {
  it('ignores line order and changes with quantity', () => {
    const a = { rawMaterialId: 'a', quantity: 1, unitPrice: 10 };
    const b = { rawMaterialId: 'b', quantity: 2, unitPrice: 20 };
    expect(cartSignature([a, b])).toBe(cartSignature([b, a]));
    expect(cartSignature([a, b])).not.toBe(cartSignature([a, { ...b, quantity: 3 }]));
  });
});
