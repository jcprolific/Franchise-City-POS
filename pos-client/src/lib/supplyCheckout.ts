export interface SupplyCustomerDetails {
  contactName: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  preferredDate: string;
}

export type SupplyCustomerErrors = Partial<Record<keyof SupplyCustomerDetails, string>>;

export const EMPTY_CUSTOMER: SupplyCustomerDetails = {
  contactName: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  preferredDate: '',
};

/** Returns the +639XXXXXXXXX form of a Philippine mobile number, or null. */
export function normalizePhMobile(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, '');
  const match = digits.match(/^(?:\+?63|0)?(9\d{9})$/);
  return match ? `+63${match[1]}` : null;
}

/** Earliest selectable delivery date (tomorrow), as a local YYYY-MM-DD string. */
export function minDeliveryDate(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function validateCustomer(
  customer: SupplyCustomerDetails,
  now: Date = new Date()
): SupplyCustomerErrors {
  const errors: SupplyCustomerErrors = {};
  if (customer.contactName.trim().length < 2) {
    errors.contactName = 'Enter the name of the person receiving this order.';
  }
  if (!normalizePhMobile(customer.mobile)) {
    errors.mobile = 'Enter a valid PH mobile number, e.g. 0917 123 4567.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email.trim())) {
    errors.email = 'Enter a valid email so we can send the receipt.';
  }
  if (customer.address.trim().length < 8) {
    errors.address = 'Enter the full street address for delivery.';
  }
  if (customer.city.trim().length < 2) {
    errors.city = 'Enter the city or municipality.';
  }
  if (customer.preferredDate && customer.preferredDate < minDeliveryDate(now)) {
    errors.preferredDate = 'Choose tomorrow or a later date.';
  }
  return errors;
}

export interface CartDraft {
  quantities: Record<string, number>;
  orderId?: string;
  signature?: string;
}

const cartKey = (branchId: string) => `coftea-supply-cart:${branchId}`;
const contactKey = (branchId: string) => `coftea-supply-contact:${branchId}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the checkout still works without a draft */
  }
}

export const readCartDraft = (branchId: string) => readJson<CartDraft>(cartKey(branchId));
export const writeCartDraft = (branchId: string, draft: CartDraft) =>
  writeJson(cartKey(branchId), draft);
export function clearCartDraft(branchId: string) {
  try {
    window.localStorage.removeItem(cartKey(branchId));
  } catch {
    /* nothing to clear */
  }
}

export const readSavedContact = (branchId: string) =>
  readJson<SupplyCustomerDetails>(contactKey(branchId));
export const saveContact = (branchId: string, customer: SupplyCustomerDetails) =>
  writeJson(contactKey(branchId), { ...customer, preferredDate: '' });

/** Identifies exact cart contents, so an unpaid order is only reused for the same cart. */
export function cartSignature(
  lines: { rawMaterialId: string; quantity: number; unitPrice: number }[]
): string {
  return lines
    .map((l) => `${l.rawMaterialId}:${l.quantity}:${l.unitPrice}`)
    .sort()
    .join('|');
}
