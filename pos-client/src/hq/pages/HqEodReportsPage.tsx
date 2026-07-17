import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, RefreshCw, Search } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  fetchEodReportById,
  fetchEodReportSummaries,
  type EodReport,
  type EodReportSummary,
} from '../../lib/eodReportService';
import { getManilaIsoDateKey } from '../../lib/timezone';
import './HqEodReportsPage.css';

const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function varianceLabel(reported: number, pos: number | null): string | null {
  if (pos == null || pos === 0) return null;
  const diff = reported - pos;
  if (Math.abs(diff) < 1) return 'Matches POS';
  const pct = ((diff / pos) * 100).toFixed(1);
  return diff > 0 ? `+${peso(diff)} (+${pct}%)` : `${peso(diff)} (${pct}%)`;
}

export default function HqEodReportsPage() {
  const { brand } = useBrand();
  const [rows, setRows] = useState<EodReportSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EodReport | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'draft'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endDate = getManilaIsoDateKey();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const startDate = getManilaIsoDateKey(start);
      const data = await fetchEodReportSummaries(brand.dbBrandId, { startDate, endDate });
      setRows(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch {
      setError('Could not load EOD reports.');
    } finally {
      setLoading(false);
    }
  }, [brand.dbBrandId, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void fetchEodReportById(selectedId).then(setDetail);
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.branchName.toLowerCase().includes(q) || r.reportDate.includes(q);
    });
  }, [rows, search, statusFilter]);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const submittedCount = rows.filter((r) => r.status === 'submitted').length;
  const draftCount = rows.filter((r) => r.status === 'draft').length;

  return (
    <div className="hq-eod">
      <header className="hq-eod-header">
        <div>
          <p className="hq-eyebrow">Operations</p>
          <h1>EOD Reports</h1>
          <p>End-of-day sales reports submitted by franchise branches.</p>
        </div>
        <div className="hq-eod-toolbar">
          <div className="hq-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search branch or date…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="hq-eod-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'submitted' | 'draft')}
          >
            <option value="all">All status</option>
            <option value="submitted">Submitted</option>
            <option value="draft">Draft</option>
          </select>
          <button type="button" className="hq-btn-secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'hq-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="hq-eod-alert">{error}</div>}

      <div className="hq-eod-summary">
        <div className="hq-stat-card">
          <span className="hq-stat-label">Last 30 days</span>
          <span className="hq-stat-value">{rows.length}</span>
          <span className="hq-stat-note">Total reports</span>
        </div>
        <div className="hq-stat-card">
          <span className="hq-stat-label">Submitted</span>
          <span className="hq-stat-value hq-stat-value--success">{submittedCount}</span>
          <span className="hq-stat-note">On-time compliance</span>
        </div>
        <div className="hq-stat-card">
          <span className="hq-stat-label">Drafts</span>
          <span className="hq-stat-value hq-stat-value--warn">{draftCount}</span>
          <span className="hq-stat-note">Pending submission</span>
        </div>
      </div>

      <div className="hq-eod-layout">
        <div className="hq-eod-table-wrap">
          <table className="hq-eod-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total Sales</th>
                <th>Cups</th>
                <th>POS vs Report</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="hq-eod-empty">
                    {loading ? 'Loading…' : 'No EOD reports yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((row) => {
                const variance = varianceLabel(row.totalSales, row.posTotalSales);
                return (
                  <tr
                    key={row.id}
                    className={row.id === selected?.id ? 'is-selected' : ''}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>{row.branchName}</td>
                    <td>{formatDate(row.reportDate)}</td>
                    <td>
                      <span className={`hq-eod-badge hq-eod-badge--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>{peso(row.totalSales)}</td>
                    <td>{row.totalCupsSold}</td>
                    <td className={variance?.startsWith('+') ? 'hq-variance-up' : variance?.startsWith('-') || variance?.startsWith('₱-') ? 'hq-variance-down' : ''}>
                      {variance ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="hq-eod-detail">
          {!selected || !detail ? (
            <div className="hq-eod-detail-empty">
              <FileText size={32} strokeWidth={1.5} />
              <p>Select a report to view details</p>
            </div>
          ) : (
            <>
              <div className="hq-eod-detail-header">
                <h2>{selected.branchName}</h2>
                <p>{formatDate(selected.reportDate)}</p>
                <span className={`hq-eod-badge hq-eod-badge--${selected.status}`}>
                  {selected.status}
                </span>
              </div>

              <div className="hq-eod-detail-stats">
                <div><span>Total Sales</span><strong>{peso(detail.totalSales)}</strong></div>
                <div><span>Net Sales</span><strong>{peso(detail.totalNetSales)}</strong></div>
                <div><span>Total Cups</span><strong>{detail.totalCupsSold}</strong></div>
                <div><span>GCash</span><strong>{peso(detail.gcashPayment)}</strong></div>
                <div><span>Cash on Hand</span><strong>{peso(detail.cashOnHand)}</strong></div>
                <div><span>Total Cash</span><strong className="hq-text-danger">{peso(detail.totalCashOnHand)}</strong></div>
              </div>

              {detail.posTotalSales != null && (
                <div className="hq-eod-variance-box">
                  <span>POS recorded</span>
                  <strong>{peso(detail.posTotalSales)}</strong>
                  <span className="hq-eod-variance-note">
                    {varianceLabel(detail.totalSales, detail.posTotalSales) ?? 'No variance data'}
                  </span>
                </div>
              )}

              <section className="hq-eod-section">
                <h3>Drinks Breakdown</h3>
                {[...detail.reportData.mainSizes, ...detail.reportData.specialFlavors, ...detail.reportData.frappe]
                  .filter((r) => r.qty > 0)
                  .map((r) => (
                    <div key={r.key} className="hq-eod-line">
                      <span>{r.label} ({r.price})</span>
                      <span>{r.qty} · {peso(r.qty * r.price)}</span>
                    </div>
                  ))}
              </section>

              {detail.reportData.addons.some((a) => a.qty > 0) && (
                <section className="hq-eod-section">
                  <h3>Add-Ons</h3>
                  {detail.reportData.addons
                    .filter((a) => a.qty > 0)
                    .map((a) => (
                      <div key={a.key} className="hq-eod-line">
                        <span>{a.label}</span>
                        <span>{a.qty} · {peso(a.qty * a.price)}</span>
                      </div>
                    ))}
                </section>
              )}

              {detail.reportData.expenses.length > 0 && (
                <section className="hq-eod-section">
                  <h3>Expenses</h3>
                  {detail.reportData.expenses.map((e) => (
                    <div key={e.id} className="hq-eod-line">
                      <span>{e.description || 'Expense'}</span>
                      <span>{peso(e.amount)}</span>
                    </div>
                  ))}
                  <div className="hq-eod-line hq-eod-line--total">
                    <span>Total Expenses</span>
                    <span>{peso(detail.expensesTotal)}</span>
                  </div>
                </section>
              )}

              {selected.submittedAt && (
                <p className="hq-eod-meta">
                  Submitted by {selected.submittedBy ?? 'Unknown'} ·{' '}
                  {new Date(selected.submittedAt).toLocaleString('en-PH')}
                </p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
