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
