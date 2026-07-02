// Memo templates for HQ Action Plan workflow.
//
// Each template is a plain string with {{placeholder}} tokens filled in by
// renderMemo(). Iris / the HQ team can replace the body copy in this file
// without any DB migration — the placeholders and rendering stay the same.

export type ActionPlanType =
  | 'written_warning'
  | 'notice_to_explain'
  | 'performance_improvement_plan';

export interface MemoTemplateFields {
  branch_name: string;
  franchisee_name: string;
  issue_summary: string;
  violation_details: string;
  incident_date: string;
  corrective_action: string;
  deadline: string;
  issued_date: string;
  issued_by: string;
}

export interface ActionPlanOption {
  value: ActionPlanType;
  label: string;
  shortLabel: string;
  description: string;
}

export const ACTION_PLAN_OPTIONS: ActionPlanOption[] = [
  {
    value: 'written_warning',
    label: 'Written Warning Memo',
    shortLabel: 'Written Warning',
    description:
      'Formal warning for a documented breach of Franchise City standards.',
  },
  {
    value: 'notice_to_explain',
    label: 'Notice to Explain (NTE)',
    shortLabel: 'Notice to Explain',
    description:
      'Requires the franchisee to submit a written explanation for a reported issue.',
  },
  {
    value: 'performance_improvement_plan',
    label: 'Performance Improvement Plan (PIP)',
    shortLabel: 'Performance Improvement Plan',
    description:
      'Structured plan with corrective actions and a deadline to restore branch performance.',
  },
];

const WRITTEN_WARNING_TEMPLATE = `FRANCHISE CITY — COFTEA HEADQUARTERS
WRITTEN WARNING MEMORANDUM

Date Issued: {{issued_date}}
To: {{franchisee_name}}
Branch: {{branch_name}}
Issued By: {{issued_by}} (Coftea HQ)

SUBJECT: Written Warning — {{issue_summary}}

This memorandum serves as a formal written warning regarding the following
matter observed on or about {{incident_date}}:

    {{violation_details}}

The above constitutes a breach of the operational standards, quality controls,
and franchise obligations set out in your Franchise Agreement with Coftea /
Franchise City.

You are hereby directed to implement the following corrective action on or
before {{deadline}}:

    {{corrective_action}}

Failure to comply within the deadline stated above may result in escalation,
including issuance of a Notice to Explain, a Performance Improvement Plan, or
further sanctions up to and including suspension of franchise operations, in
accordance with the terms of your Franchise Agreement.

Please treat this matter with the urgency it requires. HQ is available to
support the branch in returning to full compliance.

Sincerely,
{{issued_by}}
Coftea Headquarters — Franchise Operations`;

const NOTICE_TO_EXPLAIN_TEMPLATE = `FRANCHISE CITY — COFTEA HEADQUARTERS
NOTICE TO EXPLAIN

Date Issued: {{issued_date}}
To: {{franchisee_name}}
Branch: {{branch_name}}
Issued By: {{issued_by}} (Coftea HQ)

SUBJECT: Notice to Explain — {{issue_summary}}

On or about {{incident_date}}, Coftea HQ recorded the following concern
regarding your branch:

    {{violation_details}}

You are hereby directed to submit a written explanation on the matter above
within five (5) calendar days from receipt of this notice, or on or before
{{deadline}}, whichever comes first.

Your written explanation should include, at minimum:
    1. The circumstances surrounding the incident.
    2. The corrective action already taken by the branch, if any.
    3. The measures you commit to implement to prevent recurrence.

Suggested corrective direction from HQ:
    {{corrective_action}}

Failure to respond within the period stated will be construed as a waiver of
your right to be heard on this matter, and HQ shall proceed to evaluate the
appropriate disciplinary or corrective action based on available records.

Sincerely,
{{issued_by}}
Coftea Headquarters — Franchise Operations`;

const PIP_TEMPLATE = `FRANCHISE CITY — COFTEA HEADQUARTERS
PERFORMANCE IMPROVEMENT PLAN (PIP)

Date Issued: {{issued_date}}
To: {{franchisee_name}}
Branch: {{branch_name}}
Issued By: {{issued_by}} (Coftea HQ)

SUBJECT: Performance Improvement Plan — {{issue_summary}}

Following review of your branch operations on or about {{incident_date}},
Coftea HQ has determined the following performance gap:

    {{violation_details}}

To restore your branch to full compliance with Franchise City standards, HQ is
placing your branch under a formal Performance Improvement Plan (PIP) with the
following required corrective actions:

    {{corrective_action}}

TIMELINE
    Start of PIP:   {{issued_date}}
    Target Completion: {{deadline}}

REVIEW CADENCE
    HQ will conduct progress checks during the PIP period. You are expected to
    submit weekly updates to Coftea HQ Operations covering:
        - Actions taken against each corrective item.
        - Supporting evidence (sales, inventory, service metrics).
        - Blockers requiring HQ assistance.

CONSEQUENCES
    Successful completion of this PIP within the target period will close the
    matter. Failure to complete the plan, or a recurrence of the same issue
    during the PIP period, may result in escalation to Written Warning,
    suspension of operations, or termination of the Franchise Agreement, as
    provided by the Agreement and Franchise City policy.

HQ is committed to your success and will provide the operational support
required to help your branch meet the targets above.

Sincerely,
{{issued_by}}
Coftea Headquarters — Franchise Operations`;

const TEMPLATES: Record<ActionPlanType, string> = {
  written_warning: WRITTEN_WARNING_TEMPLATE,
  notice_to_explain: NOTICE_TO_EXPLAIN_TEMPLATE,
  performance_improvement_plan: PIP_TEMPLATE,
};

const PLACEHOLDER = '—';

function fillPlaceholder(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : PLACEHOLDER;
}

/** Render a memo body by substituting {{placeholders}} in the chosen template. */
export function renderMemo(type: ActionPlanType, fields: MemoTemplateFields): string {
  const template = TEMPLATES[type];
  const filled: Record<string, string> = {
    branch_name: fillPlaceholder(fields.branch_name),
    franchisee_name: fillPlaceholder(fields.franchisee_name),
    issue_summary: fillPlaceholder(fields.issue_summary),
    violation_details: fillPlaceholder(fields.violation_details),
    incident_date: fillPlaceholder(fields.incident_date),
    corrective_action: fillPlaceholder(fields.corrective_action),
    deadline: fillPlaceholder(fields.deadline),
    issued_date: fillPlaceholder(fields.issued_date),
    issued_by: fillPlaceholder(fields.issued_by),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(filled, key) ? filled[key] : PLACEHOLDER;
  });
}

export function getActionPlanOption(type: ActionPlanType): ActionPlanOption {
  const option = ACTION_PLAN_OPTIONS.find((o) => o.value === type);
  if (!option) {
    throw new Error(`Unknown action plan type: ${type}`);
  }
  return option;
}
