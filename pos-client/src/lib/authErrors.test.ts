import { describe, expect, it } from 'vitest';
import { friendlyAuthError, normalizeAuthEmail } from './authErrors';

describe('normalizeAuthEmail', () => {
  it('trims and lowercases email', () => {
    expect(normalizeAuthEmail('  Owner@Example.COM  ')).toBe('owner@example.com');
  });
});

describe('friendlyAuthError', () => {
  it('explains invalid credentials for HQ-created accounts', () => {
    expect(friendlyAuthError('Invalid login credentials')).toContain('Forgot Password');
  });
});
