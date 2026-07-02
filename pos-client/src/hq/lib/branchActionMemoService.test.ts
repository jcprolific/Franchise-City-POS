import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => {
      throw new Error('Supabase should not be called in this pure-function test.');
    },
  },
}));

import { previewMemoBody, type CreateBranchActionMemoInput } from './branchActionMemoService';

const BASE_INPUT: CreateBranchActionMemoInput = {
  brandId: 'brand-1',
  branchId: null,
  branchName: 'Coftea Ortigas',
  franchiseeName: 'Ana Cruz',
  actionPlanType: 'written_warning',
  issueSummary: 'Terminal offline',
  violationDetails: 'Terminal unreachable for 1 hour.',
  incidentDate: '2026-07-01',
  correctiveAction: 'Reboot terminal and confirm sync.',
  deadline: '2026-07-08',
  issuedBy: 'Coftea HQ Demo',
};

describe('previewMemoBody', () => {
  it('renders a fully substituted memo with no placeholders left over', () => {
    const body = previewMemoBody(BASE_INPUT, new Date('2026-07-03T00:00:00Z'));
    expect(body).not.toMatch(/\{\{\w+\}\}/);
    expect(body).toContain('Coftea Ortigas');
    expect(body).toContain('Ana Cruz');
    expect(body).toContain('Coftea HQ Demo');
    expect(body).toContain('Reboot terminal and confirm sync.');
    expect(body).toContain('2026-07-08');
  });

  it('renders a different template body per memo type', () => {
    const warning = previewMemoBody(BASE_INPUT);
    const nte = previewMemoBody({ ...BASE_INPUT, actionPlanType: 'notice_to_explain' });
    const pip = previewMemoBody({ ...BASE_INPUT, actionPlanType: 'performance_improvement_plan' });

    expect(warning).toContain('WRITTEN WARNING MEMORANDUM');
    expect(nte).toContain('NOTICE TO EXPLAIN');
    expect(pip).toContain('PERFORMANCE IMPROVEMENT PLAN');
  });

  it('handles missing optional fields gracefully', () => {
    const body = previewMemoBody({
      ...BASE_INPUT,
      franchiseeName: null,
      violationDetails: null,
      correctiveAction: null,
      incidentDate: null,
      deadline: null,
    });
    expect(body).toContain('To: —');
    // Missing dates/text should fall back to the placeholder dash, not "null".
    expect(body).not.toContain('null');
  });
});
