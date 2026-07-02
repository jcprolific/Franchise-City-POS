import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, History, X } from 'lucide-react';
import type { HqBranchAlert } from '../data/getHqDemoData';
import { fetchFranchisees } from '../lib/franchiseeService';
import {
  ACTION_PLAN_OPTIONS,
  type ActionPlanType,
} from '../lib/memoTemplates';
import {
  createBranchActionMemo,
  fetchMemosForBranch,
  previewMemoBody,
  type BranchActionMemo,
} from '../lib/branchActionMemoService';
import './ActionPlanModal.css';

interface ActionPlanModalProps {
  alert: HqBranchAlert;
  brandId: string;
  issuedBy: string;
  onClose: () => void;
  onSaved?: (memo: BranchActionMemo) => void;
}

interface FormState {
  actionPlanType: ActionPlanType;
  franchiseeName: string;
  issueSummary: string;
  violationDetails: string;
  incidentDate: string;
  correctiveAction: string;
  deadline: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function defaultMemoSubject(alert: HqBranchAlert): string {
  if (alert.status === 'Offline') {
    return 'POS terminal offline — failure to maintain operational uptime';
  }
  if (/target|goal|sales/i.test(alert.meta)) {
    return 'Daily sales performance below franchise target';
  }
  if (/stock|inventory|reorder/i.test(alert.meta)) {
    return 'Inventory shortage — reorder compliance required';
  }
  return alert.meta;
}

function defaultViolationDetails(alert: HqBranchAlert): string {
  return `HQ flagged the following concern at ${alert.name}: ${alert.meta}.`;
}

function formatMemoDate(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActionPlanModal({
  alert,
  brandId,
  issuedBy,
  onClose,
  onSaved,
}: ActionPlanModalProps) {
  const initialIncidentDate = todayIso();

  const [form, setForm] = useState<FormState>({
    actionPlanType: 'written_warning',
    franchiseeName: '',
    issueSummary: defaultMemoSubject(alert),
    violationDetails: defaultViolationDetails(alert),
    incidentDate: initialIncidentDate,
    correctiveAction: '',
    deadline: addDays(initialIncidentDate, 7),
  });
  const [franchiseeLookupTried, setFranchiseeLookupTried] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [history, setHistory] = useState<BranchActionMemo[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedMemoId, setExpandedMemoId] = useState<string | null>(null);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveError('');
    setSaveNotice('');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchFranchisees(brandId);
        if (cancelled) return;
        if (!result.rows) return;
        const match = result.rows.find(
          (row) => normalizeName(row.name) === normalizeName(alert.name)
        );
        if (match) {
          setForm((prev) => ({
            ...prev,
            franchiseeName: prev.franchiseeName || match.franchisee_name || '',
          }));
          if (!match.id.startsWith('local-')) {
            setBranchId(match.id);
          }
        }
      } catch (error) {
        console.error('Franchisee lookup failed', error);
      } finally {
        if (!cancelled) setFranchiseeLookupTried(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, alert.name]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await fetchMemosForBranch(brandId, alert.name);
      setHistory(result.memos);
      if (result.error) setHistoryError(result.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load memo history.';
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, [brandId, alert.name]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSave = useMemo(() => {
    return (
      form.issueSummary.trim().length > 0 &&
      form.violationDetails.trim().length > 0 &&
      form.correctiveAction.trim().length > 0 &&
      form.deadline.length > 0 &&
      !saving
    );
  }, [form, saving]);

  const previewInput = useMemo(
    () => ({
      brandId,
      branchId,
      branchName: alert.name,
      franchiseeName: form.franchiseeName,
      actionPlanType: form.actionPlanType,
      issueSummary: form.issueSummary,
      violationDetails: form.violationDetails,
      incidentDate: form.incidentDate,
      correctiveAction: form.correctiveAction,
      deadline: form.deadline,
      issuedBy,
    }),
    [alert.name, brandId, branchId, form, issuedBy]
  );

  const previewBody = useMemo(() => previewMemoBody(previewInput), [previewInput]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');
    setSaveNotice('');

    const result = await createBranchActionMemo(previewInput);
    setSaving(false);

    if (!result.ok || !result.memo) {
      setSaveError(result.error || 'Failed to save memo.');
      return;
    }

    setSaveNotice(
      result.savedLocally
        ? 'Memo saved locally (offline). It will not sync to Supabase automatically.'
        : 'Memo saved to Supabase.'
    );
    setHistory((prev) => [result.memo!, ...prev]);
    onSaved?.(result.memo);
  }, [canSave, previewInput, onSaved]);

  const selectedOption = ACTION_PLAN_OPTIONS.find((o) => o.value === form.actionPlanType);

  return (
    <div
      className="action-plan-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Action plan for ${alert.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="action-plan-modal">
        <header className="action-plan-header">
          <div>
            <span className="action-plan-eyebrow">Action Plan</span>
            <h2>{alert.name}</h2>
            <p className="action-plan-sub">
              <AlertTriangle size={12} />
              <span>{alert.meta}</span>
            </p>
          </div>
          <button
            type="button"
            className="action-plan-close"
            onClick={onClose}
            aria-label="Close action plan"
          >
            <X size={18} />
          </button>
        </header>

        <div className="action-plan-body">
          <section className="action-plan-form" aria-label="Memo details">
            <fieldset className="action-plan-fieldset">
              <legend>Memo Type</legend>
              <div className="action-plan-radio-group">
                {ACTION_PLAN_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`action-plan-radio ${form.actionPlanType === option.value ? 'is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="action-plan-type"
                      value={option.value}
                      checked={form.actionPlanType === option.value}
                      onChange={() => updateField('actionPlanType', option.value)}
                    />
                    <span className="action-plan-radio-body">
                      <span className="action-plan-radio-title">{option.label}</span>
                      <span className="action-plan-radio-desc">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="action-plan-grid">
              <label className="action-plan-field">
                <span>Franchisee Name</span>
                <input
                  type="text"
                  value={form.franchiseeName}
                  placeholder={
                    franchiseeLookupTried ? 'e.g. Ana Cruz' : 'Looking up franchisee...'
                  }
                  onChange={(e) => updateField('franchiseeName', e.target.value)}
                />
              </label>

              <label className="action-plan-field">
                <span>Incident Date</span>
                <input
                  type="date"
                  value={form.incidentDate}
                  onChange={(e) => updateField('incidentDate', e.target.value)}
                />
              </label>

              <label className="action-plan-field action-plan-field--wide">
                <span>Memo Subject</span>
                <input
                  type="text"
                  value={form.issueSummary}
                  onChange={(e) => updateField('issueSummary', e.target.value)}
                  placeholder="e.g. Daily sales below franchise target"
                />
              </label>

              <label className="action-plan-field action-plan-field--wide">
                <span>Violation / Concern Details</span>
                <textarea
                  rows={3}
                  value={form.violationDetails}
                  onChange={(e) => updateField('violationDetails', e.target.value)}
                  placeholder="Describe the observed issue, standards breached, and impact."
                />
              </label>

              <label className="action-plan-field action-plan-field--wide">
                <span>Corrective Action Required</span>
                <textarea
                  rows={3}
                  value={form.correctiveAction}
                  onChange={(e) => updateField('correctiveAction', e.target.value)}
                  placeholder="Specific steps the franchisee must take to remedy the issue."
                />
              </label>

              <label className="action-plan-field">
                <span>Compliance Deadline</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => updateField('deadline', e.target.value)}
                />
              </label>

              <label className="action-plan-field">
                <span>Issued By</span>
                <input type="text" value={issuedBy} readOnly />
              </label>
            </div>

            {saveError && <div className="action-plan-error">{saveError}</div>}
            {saveNotice && <div className="action-plan-notice">{saveNotice}</div>}

            <div className="action-plan-actions">
              <button type="button" className="action-plan-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="action-plan-btn-primary"
                disabled={!canSave}
                onClick={() => void handleSave()}
              >
                {saving ? 'Saving...' : `Save ${selectedOption?.shortLabel ?? 'Memo'}`}
              </button>
            </div>
          </section>

          <aside className="action-plan-preview" aria-label="Memo preview">
            <div className="action-plan-preview-head">
              <FileText size={14} />
              <span>Memo Preview</span>
            </div>
            <pre className="action-plan-preview-body">{previewBody}</pre>
          </aside>
        </div>

        <section className="action-plan-history">
          <button
            type="button"
            className="action-plan-history-toggle"
            onClick={() => setShowHistory((prev) => !prev)}
            aria-expanded={showHistory}
          >
            <History size={14} />
            <span>Memo History ({history.length})</span>
            <span className="action-plan-history-chevron">{showHistory ? '−' : '+'}</span>
          </button>

          {showHistory && (
            <div className="action-plan-history-body">
              {historyLoading && <div className="action-plan-notice">Loading memo history...</div>}
              {historyError && <div className="action-plan-error">{historyError}</div>}
              {!historyLoading && history.length === 0 && (
                <div className="action-plan-empty">No prior memos for this branch.</div>
              )}
              <ul className="action-plan-history-list">
                {history.map((memo) => {
                  const option = ACTION_PLAN_OPTIONS.find((o) => o.value === memo.action_plan_type);
                  const isOpen = expandedMemoId === memo.id;
                  return (
                    <li key={memo.id} className="action-plan-history-item">
                      <button
                        type="button"
                        className="action-plan-history-item-head"
                        onClick={() => setExpandedMemoId(isOpen ? null : memo.id)}
                        aria-expanded={isOpen}
                      >
                        <div>
                          <div className="action-plan-history-title">
                            {option?.shortLabel ?? memo.action_plan_type}
                          </div>
                          <div className="action-plan-history-meta">
                            {formatMemoDate(memo.created_at)} · {memo.issued_by}
                            {memo._local ? ' · offline' : ''}
                          </div>
                        </div>
                        <span className="action-plan-history-chevron">{isOpen ? '−' : '+'}</span>
                      </button>
                      {isOpen && (
                        <pre className="action-plan-history-body-text">{memo.memo_body}</pre>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
