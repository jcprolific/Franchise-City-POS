import { describe, expect, it, afterEach } from 'vitest';
import { fetchWithDeadline } from './fetchWithTimeout';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchWithDeadline', () => {
  it('aborts a hung request even when the caller already passed a signal', async () => {
    const caller = new AbortController();
    globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason ?? new Error('aborted'));
        });
      });

    await expect(
      fetchWithDeadline('https://example.test/session', { signal: caller.signal }, 30)
    ).rejects.toBeTruthy();
    expect(caller.signal.aborted).toBe(false);
  });
});
