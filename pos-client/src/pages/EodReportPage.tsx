import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Coffee,
  CupSoda,
  FileText,
  IceCream,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { getCurrentBranch, subscribeBranch, type BranchRef } from '../lib/branchContext';
import {
  computeEodTotals,
  loadEodReport,
  refreshEodFromPos,
  saveEodReport,
  updateLineQty,
  type EodExpenseRow,
  type EodLineRow,
  type EodReport,
} from '../lib/eodReportService';
import type { PosOutletContext } from '../App';
import './EodReportPage.css';

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const COUNTER_LABELS: Record<string, string> = {
  freeUpsize: 'Free Upsize',
  freeAddon: 'Free Add-on',
  freeDrink: 'Free Drink',
  missing: 'Missing',
  reject: 'Reject',
};

function QtyStepper({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange: (next: number) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <span className="eod-qty-readonly">{value}</span>;
  }
  return (
    <div className="eod-stepper">
      <button
        type="button"
        className="eod-stepper-btn"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Decrease"
        tabIndex={-1}
      >
        <Minus size={13} />
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        className="eod-stepper-input"
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        className="eod-stepper-btn"
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
        tabIndex={-1}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

function LineSection({
  step,
  icon,
  title,
  subtitle,
  rows,
  onQtyChange,
  readOnly,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rows: EodLineRow[];
  onQtyChange: (key: string, qty: number) => void;
  readOnly?: boolean;
}) {
  const sectionTotal = rows.reduce((sum, r) => sum + r.qty * r.price, 0);
  const sectionQty = rows.reduce((sum, r) => sum + r.qty, 0);

  return (
    <section className="eod-card">
      <header className="eod-card-head">
        <span className="eod-card-step">{step}</span>
        <span className="eod-card-icon">{icon}</span>
        <div className="eod-card-heading">
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="eod-card-total">
          <span>{sectionQty} cups</span>
          <strong>{peso(sectionTotal)}</strong>
        </div>
      </header>
      <div className="eod-lines">
        {rows.map((row) => (
          <div key={row.key} className="eod-line">
            <div className="eod-line-label">
              <strong>{row.label}</strong>
              <span>{peso(row.price)} each</span>
            </div>
            <QtyStepper
              value={row.qty}
              readOnly={readOnly}
              onChange={(qty) => onQtyChange(row.key, qty)}
            />
            <span className={`eod-line-total ${row.qty > 0 ? 'is-active' : ''}`}>
              {peso(row.qty * row.price)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EodReportPage() {
  const { brand } = useBrand();
  const { userName } = useOutletContext<PosOutletContext>();
  const [branch, setBranch] = useState<BranchRef>(() => getCurrentBranch());
  const [report, setReport] = useState<EodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => subscribeBranch(() => setBranch(getCurrentBranch())), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadEodReport({
        brandId: brand.dbBrandId,
        branchId: branch.id,
        branchName: branch.name,
        brand,
      });
      setReport(data);
    } catch {
      setError('Could not load EOD report.');
    } finally {
      setLoading(false);
    }
  }, [brand, branch.id, branch.name]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const totals = useMemo(() => {
    if (!report) return null;
    return computeEodTotals(report.reportData, report.yesterdayBalance, report.gcashPayment);
  }, [report]);

  const readOnly = report?.status === 'submitted';

  const updateReportData = (updater: (prev: EodReport) => EodReport) => {
    setReport((prev) => (prev ? updater(prev) : prev));
  };

  const handleLineQty = (
    section: 'mainSizes' | 'specialFlavors' | 'frappe' | 'addons',
    key: string,
    qty: number
  ) => {
    updateReportData((prev) => ({
      ...prev,
      reportData: {
        ...prev.reportData,
        [section]: updateLineQty(prev.reportData[section], key, qty),
      },
    }));
  };

  const handleCounter = (
    field: 'freeUpsize' | 'freeAddon' | 'freeDrink' | 'missing' | 'reject',
    value: number
  ) => {
    updateReportData((prev) => ({
      ...prev,
      reportData: { ...prev.reportData, [field]: Math.max(0, value) },
    }));
  };

  const handleExpenseChange = (id: string, field: 'description' | 'amount', value: string) => {
    updateReportData((prev) => ({
      ...prev,
      reportData: {
        ...prev.reportData,
        expenses: prev.reportData.expenses.map((e) =>
          e.id === id ? { ...e, [field]: field === 'amount' ? Number(value) || 0 : value } : e
        ),
      },
    }));
  };

  const addExpense = () => {
    updateReportData((prev) => ({
      ...prev,
      reportData: {
        ...prev.reportData,
        expenses: [
          ...prev.reportData.expenses,
          { id: `exp-${Date.now()}`, description: '', amount: 0 },
        ],
      },
    }));
  };

  const removeExpense = (id: string) => {
    updateReportData((prev) => ({
      ...prev,
      reportData: {
        ...prev.reportData,
        expenses: prev.reportData.expenses.filter((e) => e.id !== id),
      },
    }));
  };

  const handleRefreshPos = async () => {
    if (!report) return;
    setSaving(true);
    setMessage('');
    try {
      const refreshed = await refreshEodFromPos({
        brandId: brand.dbBrandId,
        branchId: branch.id,
        brand,
        reportDate: report.reportDate,
        existing: report,
      });
      setReport(refreshed);
      setMessage('Auto-filled from POS orders.');
    } catch {
      setError('Could not refresh from POS.');
    } finally {
      setSaving(false);
    }
  };

  const persist = async (status: 'draft' | 'submitted') => {
    if (!report || !totals) return;
    if (status === 'submitted' && totals.totalSales === 0) {
      const proceed = window.confirm('Total sales is ₱0. Submit anyway?');
      if (!proceed) return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    const payload: EodReport = {
      ...report,
      drinksSubtotal: totals.drinksSubtotal,
      addonsTotal: totals.addonsTotal,
      expensesTotal: totals.expensesTotal,
      totalSales: totals.totalSales,
      totalNetSales: totals.totalNetSales,
      cashOnHand: totals.cashOnHand,
      totalCashOnHand: totals.totalCashOnHand,
      totalCupsSold: totals.totalCupsSold,
    };
    const { report: saved, error: saveError } = await saveEodReport({
      report: payload,
      status,
      submittedBy: userName,
    });
    setSaving(false);
    if (saveError || !saved) {
      setError(saveError ?? 'Save failed');
      return;
    }
    setReport(saved);
    setMessage(status === 'submitted' ? 'EOD report submitted. Salamat!' : 'Draft saved.');
  };

  const handlePrint = () => window.print();

  if (loading || !report || !totals) {
    return (
      <div className="eod-page">
        <div className="eod-loading">
          <span className="eod-loading-spinner" aria-hidden="true" />
          Loading end-of-day report…
        </div>
      </div>
    );
  }

  const varianceVsPos =
    report.posTotalSales != null && report.posTotalSales > 0
      ? totals.totalSales - report.posTotalSales
      : null;

  return (
    <div className="eod-page">
      <div className="eod-scroll">
        {/* Sticky toolbar */}
        <div className="eod-toolbar no-print">
          <div className="eod-toolbar-title">
            <span className="eod-toolbar-icon">
              <ReceiptText size={18} />
            </span>
            <div>
              <h1>End of Day Report</h1>
              <p>
                {branch.name} · {report.reportDate}
              </p>
            </div>
          </div>
          <div className="eod-toolbar-actions">
            <span className={`eod-status eod-status--${report.status}`}>
              <span className="eod-status-dot" aria-hidden="true" />
              {report.status === 'submitted' ? 'Submitted' : 'Draft'}
            </span>
            {!readOnly && (
              <button
                type="button"
                className="eod-btn eod-btn--ghost"
                onClick={() => void handleRefreshPos()}
                disabled={saving}
              >
                <RefreshCw size={14} className={saving ? 'eod-spin' : ''} />
                <span className="eod-btn-label">Auto-fill from POS</span>
              </button>
            )}
            <button type="button" className="eod-btn eod-btn--ghost" onClick={handlePrint}>
              <Printer size={14} />
              <span className="eod-btn-label">Print</span>
            </button>
          </div>
        </div>

        {message && (
          <div className="eod-alert eod-alert--success no-print" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="eod-alert eod-alert--error no-print" role="alert">
            {error}
          </div>
        )}
        {readOnly && (
          <div className="eod-alert eod-alert--info no-print">
            Submitted na ang report para sa araw na ito
            {report.submittedBy ? ` (ni ${report.submittedBy})` : ''}. View-only na ito.
          </div>
        )}

        <div className="eod-layout">
          {/* ---- Form column ---- */}
          <div className="eod-form-col">
            <div className="eod-sheet-banner">
              <div>
                <p>{branch.name.toUpperCase()}</p>
                <h2>END OF DAY SALES REPORT</h2>
              </div>
              <span className="eod-sheet-date">{report.reportDate}</span>
            </div>

            <LineSection
              step="1"
              icon={<CupSoda size={16} />}
              title="Main Sizes"
              subtitle="Regular drinks per cup size"
              rows={report.reportData.mainSizes}
              readOnly={readOnly}
              onQtyChange={(key, qty) => handleLineQty('mainSizes', key, qty)}
            />

            <LineSection
              step="2"
              icon={<Coffee size={16} />}
              title="Special Flavors"
              subtitle="Premium and special series"
              rows={report.reportData.specialFlavors}
              readOnly={readOnly}
              onQtyChange={(key, qty) => handleLineQty('specialFlavors', key, qty)}
            />

            <LineSection
              step="3"
              icon={<IceCream size={16} />}
              title="Frappe"
              subtitle="Blended frappe series"
              rows={report.reportData.frappe}
              readOnly={readOnly}
              onQtyChange={(key, qty) => handleLineQty('frappe', key, qty)}
            />

            <section className="eod-card">
              <header className="eod-card-head">
                <span className="eod-card-step">4</span>
                <span className="eod-card-icon">
                  <FileText size={16} />
                </span>
                <div className="eod-card-heading">
                  <h3>Freebies, Missing &amp; Reject</h3>
                  <p>Cups not counted as sales</p>
                </div>
              </header>
              <div className="eod-counters">
                {(['freeUpsize', 'freeAddon', 'freeDrink', 'missing', 'reject'] as const).map(
                  (field) => (
                    <div key={field} className="eod-counter">
                      <span>{COUNTER_LABELS[field]}</span>
                      <QtyStepper
                        value={report.reportData[field]}
                        readOnly={readOnly}
                        onChange={(v) => handleCounter(field, v)}
                      />
                    </div>
                  )
                )}
              </div>
            </section>

            <LineSection
              step="5"
              icon={<Plus size={16} />}
              title="Add-Ons"
              subtitle="Pearls, cream cheese, espresso shots…"
              rows={report.reportData.addons}
              readOnly={readOnly}
              onQtyChange={(key, qty) => handleLineQty('addons', key, qty)}
            />

            <section className="eod-card">
              <header className="eod-card-head">
                <span className="eod-card-step">6</span>
                <span className="eod-card-icon">
                  <Wallet size={16} />
                </span>
                <div className="eod-card-heading">
                  <h3>Expenses</h3>
                  <p>Ice, supplies, cash advance, atbp.</p>
                </div>
                <div className="eod-card-total">
                  <span>{report.reportData.expenses.length} items</span>
                  <strong className="eod-expense-amount">-{peso(totals.expensesTotal)}</strong>
                </div>
              </header>
              <div className="eod-expenses">
                {report.reportData.expenses.length === 0 && (
                  <p className="eod-expenses-empty">
                    Walang expenses pa. {!readOnly && 'I-click ang "Add expense" para magdagdag.'}
                  </p>
                )}
                {report.reportData.expenses.map((exp: EodExpenseRow) => (
                  <div key={exp.id} className="eod-expense-row">
                    <input
                      type="text"
                      placeholder="e.g. 2 sack ice (truck)"
                      readOnly={readOnly}
                      value={exp.description}
                      onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                    />
                    <div className="eod-expense-amount-wrap">
                      <span>₱</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="0"
                        readOnly={readOnly}
                        value={exp.amount || ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleExpenseChange(exp.id, 'amount', e.target.value)}
                      />
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        className="eod-expense-remove"
                        onClick={() => removeExpense(exp.id)}
                        aria-label="Remove expense"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <button type="button" className="eod-add-expense" onClick={addExpense}>
                    <Plus size={14} />
                    Add expense
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* ---- Summary column ---- */}
          <aside className="eod-summary-col">
            <div className="eod-summary-card">
              <h3 className="eod-summary-title">
                <ReceiptText size={15} />
                Daily Summary
              </h3>

              <div className="eod-summary-rows">
                <div className="eod-summary-row">
                  <span>Total cups sold</span>
                  <strong>{totals.totalCupsSold}</strong>
                </div>
                <div className="eod-summary-row">
                  <span>Drinks subtotal</span>
                  <strong>{peso(totals.drinksSubtotal)}</strong>
                </div>
                <div className="eod-summary-row">
                  <span>Add-ons</span>
                  <strong>{peso(totals.addonsTotal)}</strong>
                </div>
                <div className="eod-summary-row eod-summary-row--sales">
                  <span>TOTAL SALES</span>
                  <strong>{peso(totals.totalSales)}</strong>
                </div>
                {varianceVsPos != null && (
                  <div
                    className={`eod-summary-variance ${
                      Math.abs(varianceVsPos) < 1 ? 'is-match' : 'is-off'
                    }`}
                  >
                    {Math.abs(varianceVsPos) < 1
                      ? `✓ Tugma sa POS (${peso(report.posTotalSales ?? 0)})`
                      : `POS recorded ${peso(report.posTotalSales ?? 0)} · diff ${
                          varianceVsPos > 0 ? '+' : ''
                        }${peso(varianceVsPos)}`}
                  </div>
                )}
                <div className="eod-summary-row eod-summary-row--negative">
                  <span>Less: expenses</span>
                  <strong>-{peso(totals.expensesTotal)}</strong>
                </div>
                <div className="eod-summary-row eod-summary-row--strong">
                  <span>Total net sales</span>
                  <strong>{peso(totals.totalNetSales)}</strong>
                </div>
              </div>

              <div className="eod-summary-inputs">
                <label className="eod-summary-input">
                  <span>GCash payment</span>
                  <div className="eod-peso-input">
                    <span>₱</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      readOnly={readOnly}
                      value={report.gcashPayment || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setReport((prev) =>
                          prev ? { ...prev, gcashPayment: Number(e.target.value) || 0 } : prev
                        )
                      }
                    />
                  </div>
                </label>
                <div className="eod-summary-row">
                  <span>Cash on hand (today)</span>
                  <strong>{peso(totals.cashOnHand)}</strong>
                </div>
                <label className="eod-summary-input">
                  <span>+ Yesterday&apos;s balance</span>
                  <div className="eod-peso-input">
                    <span>₱</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="0"
                      readOnly={readOnly}
                      value={report.yesterdayBalance || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) =>
                        setReport((prev) =>
                          prev ? { ...prev, yesterdayBalance: Number(e.target.value) || 0 } : prev
                        )
                      }
                    />
                  </div>
                </label>
              </div>

              <div className="eod-grand-total">
                <span>TOTAL CASH ON HAND</span>
                <strong>{peso(totals.totalCashOnHand)}</strong>
              </div>

              {!readOnly && (
                <div className="eod-summary-actions no-print">
                  <button
                    type="button"
                    className="eod-btn eod-btn--ghost eod-btn--block"
                    onClick={() => void persist('draft')}
                    disabled={saving}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="eod-btn eod-btn--primary eod-btn--block"
                    onClick={() => void persist('submitted')}
                    disabled={saving}
                  >
                    <Send size={14} />
                    {saving ? 'Saving…' : 'Submit EOD Report'}
                  </button>
                </div>
              )}

              {report.submittedAt && (
                <p className="eod-submitted-meta">
                  Submitted {report.submittedBy ? `by ${report.submittedBy}` : ''} ·{' '}
                  {new Date(report.submittedAt).toLocaleString('en-PH')}
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* Mobile sticky submit bar */}
        {!readOnly && (
          <div className="eod-mobile-bar no-print">
            <div className="eod-mobile-bar-total">
              <span>Total sales</span>
              <strong>{peso(totals.totalSales)}</strong>
            </div>
            <button
              type="button"
              className="eod-btn eod-btn--primary"
              onClick={() => void persist('submitted')}
              disabled={saving}
            >
              <Send size={14} />
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
