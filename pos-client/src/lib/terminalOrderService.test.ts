import { describe, expect, it } from 'vitest';
import { formatOrderNumber } from './terminalOrderService';

describe('formatOrderNumber', () => {
  it('prefixes order number with terminal code', () => {
    expect(formatOrderNumber('T-01', 5001)).toBe('01-5001');
    expect(formatOrderNumber('T-02', 5010)).toBe('02-5010');
  });
});
