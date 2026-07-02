import { describe, expect, it } from 'vitest';
import {
  ACTION_PLAN_OPTIONS,
  getActionPlanOption,
  renderMemo,
  type ActionPlanType,
  type MemoTemplateFields,
} from './memoTemplates';

const BASE_FIELDS: MemoTemplateFields = {
  branch_name: 'Coftea Ortigas',
  franchisee_name: 'Ana Cruz',
  issue_summary: 'Terminal offline',
  violation_details: 'Terminal has been unreachable for over 1 hour.',
  incident_date: '2026-07-01',
  corrective_action: 'Reboot terminal and confirm sync within 24 hours.',
  deadline: '2026-07-08',
  issued_date: 'July 3, 2026',
  issued_by: 'Coftea HQ Demo',
};

const TYPES: ActionPlanType[] = [
  'written_warning',
  'notice_to_explain',
  'performance_improvement_plan',
];

describe('renderMemo', () => {
  it.each(TYPES)('substitutes all placeholders for %s', (type) => {
    const body = renderMemo(type, BASE_FIELDS);
    expect(body).not.toMatch(/\{\{\w+\}\}/);
  });

  it.each(TYPES)('includes core header labels for %s', (type) => {
    const body = renderMemo(type, BASE_FIELDS);
    expect(body).toContain('FRANCHISE CITY');
    expect(body).toContain(BASE_FIELDS.branch_name);
    expect(body).toContain(BASE_FIELDS.franchisee_name);
    expect(body).toContain(BASE_FIELDS.issued_by);
    expect(body).toContain(BASE_FIELDS.issued_date);
  });

  it('injects violation details, corrective action, and deadline into the body', () => {
    const body = renderMemo('written_warning', BASE_FIELDS);
    expect(body).toContain(BASE_FIELDS.violation_details);
    expect(body).toContain(BASE_FIELDS.corrective_action);
    expect(body).toContain(BASE_FIELDS.deadline);
    expect(body).toContain(BASE_FIELDS.incident_date);
  });

  it('renders the Written Warning heading for the written_warning type', () => {
    const body = renderMemo('written_warning', BASE_FIELDS);
    expect(body).toContain('WRITTEN WARNING MEMORANDUM');
    expect(body).toContain('SUBJECT: Written Warning');
  });

  it('renders the Notice to Explain heading for the NTE type', () => {
    const body = renderMemo('notice_to_explain', BASE_FIELDS);
    expect(body).toContain('NOTICE TO EXPLAIN');
    expect(body).toContain('within five (5) calendar days');
  });

  it('renders the Performance Improvement Plan sections for the PIP type', () => {
    const body = renderMemo('performance_improvement_plan', BASE_FIELDS);
    expect(body).toContain('PERFORMANCE IMPROVEMENT PLAN');
    expect(body).toContain('TIMELINE');
    expect(body).toContain('REVIEW CADENCE');
    expect(body).toContain('CONSEQUENCES');
  });

  it('falls back to a dash for missing fields', () => {
    const body = renderMemo('written_warning', {
      ...BASE_FIELDS,
      franchisee_name: '',
      violation_details: '   ',
    });
    expect(body).toContain('To: —');
    expect(body).toContain('    —');
  });
});

describe('ACTION_PLAN_OPTIONS', () => {
  it('exposes exactly the three MVP memo types', () => {
    expect(ACTION_PLAN_OPTIONS.map((o) => o.value)).toEqual(TYPES);
  });

  it('returns the option for a valid type', () => {
    const option = getActionPlanOption('notice_to_explain');
    expect(option.shortLabel).toBe('Notice to Explain');
  });
});
