import { describe, expect, it } from 'vitest';
import { resolveProductPerformance } from './franchiseReportsService';

describe('resolveProductPerformance', () => {
  it('returns live rows when sales exist', () => {
    const rows = [{ productName: 'Okinawa', quantity: 3, revenue: 300 }];
    expect(resolveProductPerformance(rows, true)).toEqual({ rows, source: 'live' });
  });

  it('returns empty live rows when configured and no sales (no fake sample)', () => {
    expect(resolveProductPerformance([], true)).toEqual({ rows: [], source: 'live' });
  });

  it('returns sample fallback only when supabase is not configured', () => {
    const result = resolveProductPerformance([], false);
    expect(result.source).toBe('fallback');
    expect(result.rows[0]?.productName).toBe('Brown Sugar Milk Tea');
  });
});
