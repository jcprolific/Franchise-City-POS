/** Normalize email the same way edge functions do when creating accounts. */
export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Map Supabase auth errors to clearer messages for staff/franchisee users. */
export function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. If HQ created your account, use the temporary password they gave you, or click Forgot Password.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for a confirmation link, or ask HQ to resend it.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Sign in instead, or use Forgot Password if you do not remember your password.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  return message;
}
