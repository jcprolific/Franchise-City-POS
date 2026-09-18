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

  it('explains aborted/timeout fetch as a network retry', () => {
    expect(friendlyAuthError('Fetch is aborted')).toContain('timed out');
    expect(friendlyAuthError('signal is aborted without reason')).toContain('timed out');
  });

  it('explains unconfirmed email', () => {
    expect(friendlyAuthError('Email not confirmed')).toContain('confirm');
  });
});
