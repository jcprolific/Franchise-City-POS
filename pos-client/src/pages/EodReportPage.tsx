import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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

function LineTable({
  title,
  rows,
  onQtyChange,
  readOnly,
}: {
  title: string;
  rows: EodLineRow[];
  onQtyChange: (key: string, qty: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="eod-table-block">
      <h3 className="eod-table-title">{title}</h3>
      <table className="eod-table">
        <thead>
          <tr>
            <th>SIZE</th>
            <th>QTY</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                {row.label} <span className="eod-price">({row.price})</span>
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  className="eod-qty-input"
                  value={row.qty || ''}
                  readOnly={readOnly}
                  onChange={(e) => onQtyChange(row.key, Number(e.target.value) || 0)}
                />
              </td>
              <td className="eod-total-cell">{peso(row.qty * row.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

  const totals = useMemo(() => {
    if (!report) return null;
    return computeEodTotals(report.reportData, report.yesterdayBalance, report.gcashPayment);
  }, [report]);

  const readOnly = report?.status === 'submitted';

  const updateReportData = (updater: (prev: EodReport) => EodReport) => {
    setReport((prev) => (prev ? updater(prev) : prev));
  };

  const handleLineQty = (section: 'mainSizes' | 'specialFlavors' | 'frappe' | 'addons', key: string, qty: number) => {
    updateReportData((prev) => ({
      ...prev,
      reportData: {
        ...prev.reportData,
        [section]: updateLineQty(prev.reportData[section], key, qty),
      },
    }));
  };

  const handleCounter = (field: 'freeUpsize' | 'freeAddon' | 'freeDrink' | 'missing' | 'reject', value: number) => {
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
          e.id === id
            ? { ...e, [field]: field === 'amount' ? Number(value) || 0 : value }
            : e
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
    setMessage(status === 'submitted' ? 'EOD report submitted successfully.' : 'Draft saved.');
  };

  const handlePrint = () => window.print();

  if (loading || !report || !totals) {
    return (
      <div className="eod-page">
        <div className="eod-loading">Loading end-of-day report…</div>
      </div>
    );
  }

  return (
    <div className="eod-page">
      <header className="eod-header no-print">
        <div>
          <p className="eod-eyebrow">End of Day</p>
          <h1>Daily Sales Report</h1>
          <p>{branch.name} · {report.reportDate}</p>
        </div>
        <div className="eod-header-actions">
          {report.posTotalSales != null && (
            <span className="eod-pos-badge">POS total: {peso(report.posTotalSales)}</span>
          )}
          <span className={`eod-status eod-status--${report.status}`}>
            {report.status === 'submitted' ? 'Submitted' : 'Draft'}
          </span>
          {!readOnly && (
            <button type="button" className="eod-btn eod-btn--ghost" onClick={() => void handleRefreshPos()} disabled={saving}>
              Auto-fill from POS
            </button>
          )}
          <button type="button" className="eod-btn eod-btn--ghost" onClick={handlePrint}>Print</button>
          {!readOnly && (
            <>
              <button type="button" className="eod-btn eod-btn--ghost" onClick={() => void persist('draft')} disabled={saving}>
                Save Draft
              </button>
              <button type="button" className="eod-btn eod-btn--primary" onClick={() => void persist('submitted')} disabled={saving}>
                Submit EOD
              </button>
            </>
          )}
        </div>
      </header>

      {message && <div className="eod-alert eod-alert--success no-print">{message}</div>}
      {error && <div className="eod-alert eod-alert--error no-print">{error}</div>}

      <div className="eod-form-sheet">
        <div className="eod-form-banner">
          <div>
            <p className="eod-brand-name">{branch.name.toUpperCase()}</p>
            <h2>END OF DAY SALES REPORT</h2>
          </div>
          <div className="eod-form-date">{report.reportDate}</div>
        </div>

        <div className="eod-form-grid">
          <LineTable
            title="Main Sizes"
            rows={report.reportData.mainSizes}
            readOnly={readOnly}
            onQtyChange={(key, qty) => handleLineQty('mainSizes', key, qty)}
          />
          <LineTable
            title="Special Flavors"
            rows={report.reportData.specialFlavors}
            readOnly={readOnly}
            onQtyChange={(key, qty) => handleLineQty('specialFlavors', key, qty)}
          />
          <LineTable
            title="Frappe"
            rows={report.reportData.frappe}
            readOnly={readOnly}
            onQtyChange={(key, qty) => handleLineQty('frappe', key, qty)}
          />
        </div>

        <div className="eod-counters">
          {(['freeUpsize', 'freeAddon', 'freeDrink', 'missing', 'reject'] as const).map((field) => (
            <label key={field} className="eod-counter">
              <span>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
              <input
                type="number"
                min={0}
                readOnly={readOnly}
                value={report.reportData[field] || ''}
                onChange={(e) => handleCounter(field, Number(e.target.value) || 0)}
              />
            </label>
          ))}
          <div className="eod-counter eod-counter--highlight">
            <span>TOTAL CUPS SOLD</span>
            <strong>{totals.totalCupsSold}</strong>
          </div>
          <div className="eod-counter eod-counter--highlight">
            <span>Drinks Subtotal</span>
            <strong>{peso(totals.drinksSubtotal)}</strong>
          </div>
        </div>

        <LineTable
          title="Add-Ons"
          rows={report.reportData.addons}
          readOnly={readOnly}
          onQtyChange={(key, qty) => handleLineQty('addons', key, qty)}
        />

        <div className="eod-summary-row">
          <div className="eod-summary-highlight">
            <span>TOTAL SALES</span>
            <strong>{peso(totals.totalSales)}</strong>
          </div>
          <div className="eod-summary-highlight">
            <span>ADD-ONS TOTAL</span>
            <strong>{peso(totals.addonsTotal)}</strong>
          </div>
        </div>

        <div className="eod-financial">
          <div className="eod-expenses">
            <div className="eod-expenses-header">
              <h3>Expenses</h3>
              {!readOnly && (
                <button type="button" className="eod-btn eod-btn--ghost eod-btn--sm" onClick={addExpense}>
                  + Add expense
                </button>
              )}
            </div>
            <ul className="eod-expense-list">
              {report.reportData.expenses.map((exp: EodExpenseRow) => (
                <li key={exp.id}>
                  <input
                    type="text"
                    placeholder="Description"
                    readOnly={readOnly}
                    value={exp.description}
                    onChange={(e) => handleExpenseChange(exp.id, 'description', e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Amount"
                    readOnly={readOnly}
                    value={exp.amount || ''}
                    onChange={(e) => handleExpenseChange(exp.id, 'amount', e.target.value)}
                  />
                  {!readOnly && (
                    <button type="button" className="eod-remove" onClick={() => removeExpense(exp.id)} aria-label="Remove">
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="eod-expenses-total">Expenses Total: <strong>{peso(totals.expensesTotal)}</strong></div>
          </div>

          <div className="eod-cash-summary">
            <div className="eod-cash-row">
              <span>TOTAL NET SALES</span>
              <strong>{peso(totals.totalNetSales)}</strong>
            </div>
            <div className="eod-cash-row">
              <span>GCASH PAYMENT</span>
              <input
                type="number"
                min={0}
                readOnly={readOnly}
                className="eod-cash-input"
                value={report.gcashPayment || ''}
                onChange={(e) =>
                  setReport((prev) =>
                    prev ? { ...prev, gcashPayment: Number(e.target.value) || 0 } : prev
                  )
                }
              />
            </div>
            <div className="eod-cash-row">
              <span>CASH ON HAND (Daily)</span>
              <strong>{peso(totals.cashOnHand)}</strong>
            </div>
            <div className="eod-cash-row">
              <span>+ YESTERDAY SALES</span>
              <input
                type="number"
                min={0}
                readOnly={readOnly}
                className="eod-cash-input"
                value={report.yesterdayBalance || ''}
                onChange={(e) =>
                  setReport((prev) =>
                    prev ? { ...prev, yesterdayBalance: Number(e.target.value) || 0 } : prev
                  )
                }
              />
            </div>
            <div className="eod-cash-row eod-cash-row--grand">
              <span>TOTAL CASH ON HAND</span>
              <strong>{peso(totals.totalCashOnHand)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
