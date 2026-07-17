import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import HealthScoreBreakdown from '../components/HealthScoreBreakdown';
import {
  fetchBranchHealthScores,
  persistBranchHealthSnapshots,
  scoreColor,
  scoreGrade,
  type BranchHealthRow,
} from '../lib/branchHealthService';
import './BranchHealthPage.css';

function formatPeriod(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function BranchHealthPage() {
  const { brand } = useBrand();
  const [rows, setRows] = useState<BranchHealthRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const refresh = useCallback(async () => {
    setSyncing(true);
    setErrorText('');
    try {
      const data = await fetchBranchHealthScores(brand.dbBrandId);
      setRows(data);
      if (data.length > 0 && data[0].source === 'computed') {
        await persistBranchHealthSnapshots(data, brand.dbBrandId);
      }
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].branchId);
      }
    } catch (error) {
      console.error('Branch health sync failed', error);
      setErrorText('Could not load branch health scores. Check Supabase connection.');
    } finally {
      setSyncing(false);
    }
  }, [brand.dbBrandId, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.branchName.toLowerCase().includes(q) ||
        (r.franchiseeName ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const selected = filtered.find((r) => r.branchId === selectedId) ?? filtered[0] ?? null;
  const periodLabel =
    rows[0] ? formatPeriod(rows[0].periodStart, rows[0].periodEnd) : 'Current month';

  const networkAvg =
    rows.length > 0
      ? rows.reduce((sum, r) => sum + r.scores.composite, 0) / rows.length
      : 0;

  return (
    <div className="hq-health">
      <header className="hq-health-header">
        <div>
          <p className="hq-eyebrow">Operations</p>
          <h1>Branch Health Score</h1>
          <p>Weighted performance across sales, POS usage, inventory, compliance, and training.</p>
        </div>
        <div className="hq-health-toolbar">
          <div className="hq-search">
            <Search size={16} className="hq-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search branch or franchisee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="hq-btn-secondary" onClick={() => void refresh()} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'hq-spin' : ''} />
            {syncing ? 'Computing…' : 'Recompute'}
          </button>
        </div>
      </header>

      {errorText ? <p className="hq-health-alert">{errorText}</p> : null}

      <div className="hq-health-summary">
        <div className="hq-health-stat">
          <span className="hq-health-stat-label">Network average</span>
          <strong style={{ color: scoreColor(networkAvg) }}>{Math.round(networkAvg)}</strong>
          <span className="hq-health-stat-sub">{scoreGrade(networkAvg)}</span>
        </div>
        <div className="hq-health-stat">
          <span className="hq-health-stat-label">Period</span>
          <strong>{periodLabel}</strong>
          <span className="hq-health-stat-sub">Calendar month</span>
        </div>
        <div className="hq-health-stat">
          <span className="hq-health-stat-label">Branches tracked</span>
          <strong>{rows.length}</strong>
          <span className="hq-health-stat-sub">Active in brand</span>
        </div>
      </div>

      <div className="hq-health-layout">
        <section className="hq-health-table-wrap">
          <table className="hq-health-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Score</th>
                <th>Sales</th>
                <th>POS</th>
                <th>Inventory</th>
                <th>Orders</th>
                <th>Training</th>
                <th>Marketing</th>
                <th>Updates</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.branchId}
                  className={selected?.branchId === row.branchId ? 'is-selected' : ''}
                  onClick={() => setSelectedId(row.branchId)}
                >
                  <td>
                    <strong>{row.branchName}</strong>
                    {row.franchiseeName ? (
                      <span className="hq-health-franchisee">{row.franchiseeName}</span>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className="hq-health-composite"
                      style={{ color: scoreColor(row.scores.composite) }}
                    >
                      {Math.round(row.scores.composite)}
                    </span>
                  </td>
                  <td>{Math.round(row.scores.salesGrowth)}</td>
                  <td>{Math.round(row.scores.posUsage)}</td>
                  <td>{Math.round(row.scores.inventoryAccuracy)}</td>
                  <td>{Math.round(row.scores.orderingCompliance)}</td>
                  <td>{Math.round(row.scores.trainingCompletion)}</td>
                  <td>{Math.round(row.scores.marketingCompliance)}</td>
                  <td>{Math.round(row.scores.storeUpdates)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !syncing ? (
            <p className="hq-health-empty">No branches found for this brand.</p>
          ) : null}
        </section>

        {selected ? (
          <aside className="hq-health-detail">
            <div className="hq-health-detail-header">
              <Activity size={18} />
              <div>
                <h2>{selected.branchName}</h2>
                <p>{selected.franchiseeName ?? 'Franchise branch'}</p>
              </div>
              <div
                className="hq-health-detail-score"
                style={{ color: scoreColor(selected.scores.composite) }}
              >
                {Math.round(selected.scores.composite)}
              </div>
            </div>
            <p className="hq-health-detail-grade">{scoreGrade(selected.scores.composite)}</p>
            <HealthScoreBreakdown scores={selected.scores} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
