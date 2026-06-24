import { supabase } from './supabase';

export interface InquiryInput {
  fullName: string;
  email: string;
  phone: string;
  interestedBrand: string | null;
}

export interface ValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInquiry(input: InquiryInput): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!input.fullName.trim()) errors.fullName = 'Pakilagay ang iyong pangalan.';
  if (!input.email.trim()) errors.email = 'Pakilagay ang iyong email.';
  else if (!EMAIL_RE.test(input.email.trim())) errors.email = 'Hindi wastong email address.';
  if (input.phone.replace(/\D/g, '').length < 7) errors.phone = 'Pakilagay ang wastong contact number.';
  return errors;
}

export interface InquiryRow {
  full_name: string;
  email: string;
  phone: string;
  interested_brand: string | null;
}

export function buildInquiryPayload(input: InquiryInput): InquiryRow {
  return {
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    interested_brand: input.interestedBrand,
  };
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export async function submitInquiry(input: InquiryInput): Promise<SubmitResult> {
  const payload = buildInquiryPayload(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('franchise_inquiries').insert(payload as any);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
