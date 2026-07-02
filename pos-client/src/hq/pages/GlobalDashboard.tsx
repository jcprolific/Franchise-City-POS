import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  CreditCard,
  ShoppingBag,
  Wallet,
  Store,
  AlertTriangle,
  Plus,
  Trash2,
  FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBrand } from '../../context/BrandContext';
import type { HqKpiSnapshot, HqWeeklyRevenueItem } from '../lib/hqKpiService';
import { fetchHqKpiData } from '../lib/hqKpiService';
import { getHqDemoData, type HqBranchAlert } from '../data/getHqDemoData';
import ActionPlanModal from '../components/ActionPlanModal';
import {
  alertToWatchInput,
  createWatchItem,
  deleteWatchItem,
  fetchWatchItems,
  updateWatchItemStatus,
  watchItemToAlert,
  FLAG_LABELS,
  WORKFLOW_LABELS,
  type BranchWatchItem,
  type WatchFlag,
  type WorkflowStatus,
} from '../lib/branchWatchService';
import './GlobalDashboard.css';

const WORKFLOW_ORDER: WorkflowStatus[] = ['open', 'in_progress', 'resolved'];

function nextWorkflowStatus(status: WorkflowStatus): WorkflowStatus {
  const idx = WORKFLOW_ORDER.indexOf(status);
  return WORKFLOW_ORDER[(idx + 1) % WORKFLOW_ORDER.length];
}

const EMPTY_WATCH_FORM = {
  branchName: '',
  issue: '',
  flag: 'needs_attention' as WatchFlag,
};

const EMPTY_SNAPSHOT: HqKpiSnapshot = {
  todayRevenue: 0,
  yesterdayRevenue: 0,
  todayOrders: 0,
  yesterdayOrders: 0,
  avgOrderValue: 0,
  activeBranches: 0,
};

function computePercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export default function GlobalDashboard() {
  const { brand } = useBrand();
  const demo = useMemo(() => getHqDemoData(brand.slug), [brand.slug]);

  const [snapshot, setSnapshot] = useState<HqKpiSnapshot>(EMPTY_SNAPSHOT);
  const [chartData, setChartData] = useState<HqWeeklyRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [range, setRange] = useState<'daily' | 'weekly'>('weekly');
  const [search, setSearch] = useState('');
  const [activeAlert, setActiveAlert] = useState<HqBranchAlert | null>(null);

  const [watchItems, setWatchItems] = useState<BranchWatchItem[]>([]);
  const [watchLoading, setWatchLoading] = useState(true);
  const [watchError, setWatchError] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [watchForm, setWatchForm] = useState(EMPTY_WATCH_FORM);
  const [savingWatch, setSavingWatch] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setErrorText('');
      const result = await fetchHqKpiData(brand.dbBrandId);
      setSnapshot(result.snapshot);
      setChartData(result.weeklyRevenue);
      const hasLiveData = result.snapshot.todayOrders > 0;
      setUsingDemoData(!hasLiveData);
      if (result.source === 'fallback' && hasLiveData) {
        setErrorText('Using direct order aggregation. Run HQ KPI SQL functions for optimized metrics.');
      } else if (!hasLiveData) {
        setErrorText(demo.demoDataMessage);
      }
    } catch (error) {
      console.error('HQ KPI sync failed', error);
      setUsingDemoData(true);
      setErrorText(demo.demoDataMessage);
    } finally {
      setLoading(false);
    }
  }, [brand.dbBrandId, demo.demoDataMessage]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`hq-pos-order-${brand.slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_order' }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, brand.slug]);

  const displaySnapshot = usingDemoData ? demo.sampleSnapshot : snapshot;
  const displayChartData = usingDemoData || chartData.length === 0 ? demo.sampleRevenue : chartData;
  const revenueChange = computePercentChange(displaySnapshot.todayRevenue, displaySnapshot.yesterdayRevenue);
  const orderChange = computePercentChange(displaySnapshot.todayOrders, displaySnapshot.yesterdayOrders);

  const chartPoints = useMemo(() => {
    if (displayChartData.length === 0) return [] as { x: number; y: number; day: string; revenue: number }[];
    const points = displayChartData.map((item) => ({ ...item, revenue: item.revenue }));
    const maxY = Math.max(1, ...points.map((p) => p.revenue));
    return points.map((p, idx) => ({
      day: p.day,
      revenue: p.revenue,
      x: (idx / Math.max(1, points.length - 1)) * 100,
      y: 100 - (p.revenue / maxY) * 100,
    }));
  }, [displayChartData]);

  const linePath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    return chartPoints
      .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ');
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const path = chartPoints.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    return `${path} L 100 100 L 0 100 Z`;
  }, [chartPoints]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  const cashierName = brand.slug === 'coftea' ? 'Coftea HQ' : `${brand.name} HQ`;
  const initials = brand.shortName.slice(0, 2).toUpperCase();
  const weeklyRevenueTotal = displayChartData.reduce((sum, item) => sum + item.revenue, 0);

  const loadWatchItems = useCallback(async () => {
    setWatchLoading(true);
    setWatchError('');
    try {
      const seeds = demo.branchesToCheck.map((alert) => alertToWatchInput(alert, brand.dbBrandId));
      const result = await fetchWatchItems(brand.dbBrandId, seeds);
      setWatchItems(result.items);
      if (result.error) setWatchError(result.error);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load watch list.';
      setWatchError(message);
    } finally {
      setWatchLoading(false);
    }
  }, [brand.dbBrandId, demo.branchesToCheck]);

  useEffect(() => {
    void loadWatchItems();
  }, [loadWatchItems]);

  const openCounts = useMemo(() => {
    return watchItems.reduce(
      (acc, item) => {
        acc[item.workflow_status] += 1;
        return acc;
      },
      { open: 0, in_progress: 0, resolved: 0 } as Record<WorkflowStatus, number>
    );
  }, [watchItems]);

  const filteredWatchItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return watchItems.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.workflow_status === statusFilter;
      const matchesSearch =
        !q ||
        item.branch_name.toLowerCase().includes(q) ||
        item.issue.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [watchItems, statusFilter, search]);

  const handleAddWatchItem = useCallback(async () => {
    if (!watchForm.branchName.trim() || !watchForm.issue.trim() || savingWatch) return;
    setSavingWatch(true);
    setWatchError('');
    const result = await createWatchItem({
      brandId: brand.dbBrandId,
      branchName: watchForm.branchName,
      issue: watchForm.issue,
      flag: watchForm.flag,
      createdBy: cashierName,
    });
    setSavingWatch(false);
    if (!result.ok || !result.item) {
      setWatchError(result.error || 'Failed to add entry.');
      return;
    }
    setWatchItems((prev) => [result.item!, ...prev]);
    setWatchForm(EMPTY_WATCH_FORM);
    setShowAddForm(false);
  }, [watchForm, savingWatch, brand.dbBrandId, cashierName]);

  const handleAdvanceStatus = useCallback(
    async (item: BranchWatchItem) => {
      const next = nextWorkflowStatus(item.workflow_status);
      setPendingStatusId(item.id);
      const result = await updateWatchItemStatus(brand.dbBrandId, item.id, next);
      setPendingStatusId(null);
      if (!result.ok || !result.item) {
        setWatchError(result.error || 'Failed to update status.');
        return;
      }
      setWatchItems((prev) => prev.map((row) => (row.id === item.id ? result.item! : row)));
    },
    [brand.dbBrandId]
  );

  const handleDeleteWatchItem = useCallback(
    async (item: BranchWatchItem) => {
      const confirmed = window.confirm(`Remove "${item.branch_name}" from the watch list?`);
      if (!confirmed) return;
      const result = await deleteWatchItem(brand.dbBrandId, item.id);
      if (!result.ok) {
        setWatchError(result.error || 'Failed to remove entry.');
        return;
      }
      setWatchItems((prev) => prev.filter((row) => row.id !== item.id));
    },
    [brand.dbBrandId]
  );

  const filteredLiveOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return demo.liveOrders;
    return demo.liveOrders.filter(
      (o) =>
        o.branch.toLowerCase().includes(q) ||
        o.items.toLowerCase().includes(q) ||
        o.id.includes(q)
    );
  }, [demo.liveOrders, search]);

  return (
    <div className="hq-home" id="hq-home">
      <header className="hq-home-header">
        <div className="hq-home-heading">
          <span className="hq-eyebrow">{brand.name} Headquarters</span>
          <h1>Good morning, {cashierName}</h1>
          <p>Here's how your {brand.name} network is performing today.</p>
        </div>

        <div className="hq-home-toolbar">
          <div className="hq-search">
            <Search size={16} className="hq-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches, orders, items..."
            />
          </div>
          <div className="hq-today">
            <span className="hq-today-label">Today</span>
            <span className="hq-today-date">{today}</span>
          </div>
          <div className="hq-avatar">{initials}</div>
        </div>
      </header>

      {loading && <div className="hq-status-note">Loading {brand.name} HQ data...</div>}
      {errorText && <div className="hq-status-note">{errorText}</div>}

      <section className="hq-kpi-row">
        <article className="hq-stat-card hq-stat-card--dark">
          <div className="hq-stat-meta">
            <span>Total Sales Today</span>
            <span className="hq-stat-icon"><Wallet size={16} /></span>
          </div>
          <div className="hq-stat-value">{formatPeso(displaySnapshot.todayRevenue)}</div>
          <div className="hq-stat-trend hq-stat-trend--up">
            {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(1)}% vs yesterday
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Total Orders</span>
            <span className="hq-stat-icon"><ShoppingBag size={16} /></span>
          </div>
          <div className="hq-stat-value">{displaySnapshot.todayOrders.toLocaleString()}</div>
          <div className="hq-stat-trend hq-stat-trend--up">
            {orderChange >= 0 ? '↑' : '↓'} {Math.abs(orderChange).toFixed(1)}% vs yesterday
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Avg Order Value</span>
            <span className="hq-stat-icon"><CreditCard size={16} /></span>
          </div>
          <div className="hq-stat-value">₱{displaySnapshot.avgOrderValue.toFixed(2)}</div>
          <div className="hq-stat-trend hq-stat-trend--muted">Today network AOV</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Active Branches</span>
            <span className="hq-stat-icon"><Store size={16} /></span>
          </div>
          <div className="hq-stat-value hq-stat-value--split">
            {displaySnapshot.activeBranches}
            <span>/{demo.totalBranches}</span>
          </div>
          <div className="hq-stat-trend hq-stat-trend--muted">Online now</div>
        </article>
      </section>

      <section className="hq-panel hq-panel--chart">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Revenue Overview</span>
            <div className="hq-panel-big-number">{formatPeso(weeklyRevenueTotal)}</div>
            <span className="hq-panel-subcopy">{brand.name} network, weekly</span>
          </div>
          <div className="hq-range-toggle">
            <button
              type="button"
              className={range === 'daily' ? 'active' : ''}
              onClick={() => setRange('daily')}
            >
              Daily
            </button>
            <button
              type="button"
              className={range === 'weekly' ? 'active' : ''}
              onClick={() => setRange('weekly')}
            >
              Weekly
            </button>
          </div>
        </div>

        <div className="hq-chart-wrap">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hq-chart-svg">
            <defs>
              <linearGradient id="hqAreaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={demo.chartFillStart} />
                <stop offset="100%" stopColor={demo.chartFillEnd} />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill="url(#hqAreaFill)" stroke="none" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={demo.chartStroke}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          <div className="hq-chart-labels">
            {chartPoints.length === 0
              ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <span key={d}>{d}</span>
                ))
              : chartPoints.map((p) => <span key={p.day}>{p.day}</span>)}
          </div>
        </div>
      </section>

      <section className="hq-split-row">
        <section className="hq-panel hq-watch-panel">
          <div className="hq-panel-head">
            <div>
              <span className="hq-eyebrow">Needs Attention</span>
              <h2>Branches to Check</h2>
            </div>
            <button
              type="button"
              className="hq-ghost-btn hq-watch-add-btn"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              <Plus size={14} />
              {showAddForm ? 'Close' : 'Add Entry'}
            </button>
          </div>

          <div className="hq-watch-filters" role="tablist" aria-label="Filter by status">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((key) => {
              const count =
                key === 'all' ? watchItems.length : openCounts[key as WorkflowStatus];
              const label = key === 'all' ? 'All' : WORKFLOW_LABELS[key as WorkflowStatus];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === key}
                  className={`hq-watch-filter ${statusFilter === key ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {label}
                  <span className="hq-watch-filter-count">{count}</span>
                </button>
              );
            })}
          </div>

          {showAddForm && (
            <div className="hq-watch-form">
              <div className="hq-watch-form-row">
                <label className="hq-watch-field">
                  <span>Branch</span>
                  <input
                    type="text"
                    list="hq-watch-branch-options"
                    value={watchForm.branchName}
                    onChange={(e) => setWatchForm((f) => ({ ...f, branchName: e.target.value }))}
                    placeholder="e.g. Coftea Makati"
                  />
                  <datalist id="hq-watch-branch-options">
                    {demo.sampleBranches.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                  </datalist>
                </label>
                <label className="hq-watch-field hq-watch-field--flag">
                  <span>Flag</span>
                  <select
                    value={watchForm.flag}
                    onChange={(e) =>
                      setWatchForm((f) => ({ ...f, flag: e.target.value as WatchFlag }))
                    }
                  >
                    <option value="needs_attention">{FLAG_LABELS.needs_attention}</option>
                    <option value="offline">{FLAG_LABELS.offline}</option>
                  </select>
                </label>
              </div>
              <label className="hq-watch-field">
                <span>Issue</span>
                <input
                  type="text"
                  value={watchForm.issue}
                  onChange={(e) => setWatchForm((f) => ({ ...f, issue: e.target.value }))}
                  placeholder="e.g. Below target · 78% of daily goal"
                />
              </label>
              <div className="hq-watch-form-actions">
                <button
                  type="button"
                  className="hq-ghost-btn"
                  onClick={() => {
                    setShowAddForm(false);
                    setWatchForm(EMPTY_WATCH_FORM);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="hq-watch-save-btn"
                  disabled={!watchForm.branchName.trim() || !watchForm.issue.trim() || savingWatch}
                  onClick={() => void handleAddWatchItem()}
                >
                  {savingWatch ? 'Adding...' : 'Add to Watch List'}
                </button>
              </div>
            </div>
          )}

          {watchError && <div className="hq-watch-error">{watchError}</div>}

          <ul className="hq-alert-list hq-alert-list--branches">
            {watchLoading && (
              <li className="hq-alert hq-alert--branch">
                <div className="hq-alert-body">
                  <div className="hq-alert-sub">Loading watch list...</div>
                </div>
              </li>
            )}

            {!watchLoading &&
              filteredWatchItems.map((item) => (
                <li
                  key={item.id}
                  className={`hq-alert hq-alert--branch hq-watch-row is-${item.workflow_status}`}
                >
                  <span className="hq-alert-icon">
                    <AlertTriangle size={14} />
                  </span>
                  <div className="hq-alert-body">
                    <div className="hq-alert-title">{item.branch_name}</div>
                    <div className="hq-alert-sub">{item.issue}</div>
                    <div className="hq-watch-tags">
                      <span
                        className={`hq-branch-status ${item.flag === 'offline' ? 'is-offline' : 'is-warning'}`}
                      >
                        {FLAG_LABELS[item.flag]}
                      </span>
                      <button
                        type="button"
                        className={`hq-watch-status hq-watch-status--${item.workflow_status}`}
                        onClick={() => void handleAdvanceStatus(item)}
                        disabled={pendingStatusId === item.id}
                        title="Click to advance status"
                      >
                        {pendingStatusId === item.id
                          ? '...'
                          : WORKFLOW_LABELS[item.workflow_status]}
                      </button>
                    </div>
                  </div>
                  <div className="hq-watch-actions">
                    <button
                      type="button"
                      className="hq-ghost-btn hq-branch-action-btn"
                      onClick={() => setActiveAlert(watchItemToAlert(item))}
                    >
                      <FileText size={13} />
                      Action Plan
                    </button>
                    <button
                      type="button"
                      className="hq-watch-delete"
                      onClick={() => void handleDeleteWatchItem(item)}
                      aria-label={`Remove ${item.branch_name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}

            {!watchLoading && filteredWatchItems.length === 0 && (
              <li className="hq-alert hq-alert--branch">
                <div className="hq-alert-body">
                  <div className="hq-alert-sub">
                    {watchItems.length === 0
                      ? 'No branches flagged. Add an entry to start tracking.'
                      : 'No entries match this filter.'}
                  </div>
                </div>
              </li>
            )}
          </ul>
        </section>

        <section className="hq-panel">
          <div className="hq-panel-head">
            <div>
              <span className="hq-eyebrow">Inventory Alerts</span>
              <h2>Low Stock</h2>
            </div>
            <button className="hq-ghost-btn hq-ghost-btn--danger" type="button">Restock</button>
          </div>

          <ul className="hq-alert-list">
            {demo.inventoryAlerts.map((alert) => (
              <li key={alert.id} className={`hq-alert hq-alert--${alert.level}`}>
                <span className="hq-alert-icon">
                  <AlertTriangle size={14} />
                </span>
                <div className="hq-alert-body">
                  <div className="hq-alert-title">{alert.name}</div>
                  <div className="hq-alert-sub">{alert.branch}</div>
                </div>
                <div className="hq-alert-qty">{alert.qty}</div>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Live Orders</span>
            <h2>Recent Activity</h2>
          </div>
          <button className="hq-ghost-btn" type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>

        <div className="hq-orders-scroller">
          <table className="hq-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Branch</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveOrders.map((order) => (
                <tr key={order.id}>
                  <td className="hq-orders-id">#{order.id}</td>
                  <td>{order.branch}</td>
                  <td className="hq-orders-items">{order.items}</td>
                  <td className="hq-orders-total">{formatPeso(order.total)}</td>
                  <td>
                    <span className={`hq-status hq-status--${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="hq-orders-time">{order.time}</td>
                </tr>
              ))}
              {filteredLiveOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="hq-orders-time">
                    No orders match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {activeAlert && (
        <ActionPlanModal
          alert={activeAlert}
          brandId={brand.dbBrandId}
          issuedBy={cashierName}
          onClose={() => setActiveAlert(null)}
        />
      )}
    </div>
  );
}
