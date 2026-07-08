import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Boxes,
  CreditCard,
  Package,
  Receipt,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBrand } from '../../context/BrandContext';
import { getHqDemoData } from '../data/getHqDemoData';
import {
  fetchReportsData,
  type ReportDateRange,
  type ReportsData,
  type ReportsFilters,
} from '../lib/reportsService';
import './ReportsAnalyticsPage.css';

type ReportTab = 'overview' | 'franchisees' | 'inventory';

const RANGE_OPTIONS: { id: ReportDateRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

const TAB_OPTIONS: { id: ReportTab; label: string }[] = [
  { id: 'overview', label: 'Sales Overview' },
  { id: 'franchisees', label: 'Franchisees' },
  { id: 'inventory', label: 'Inventory' },
];

const PAYMENT_COLORS = ['#d98724', '#8a4b2f', '#c9a27a', '#5a8f69', '#b0563f'];

const LEVEL_LABEL: Record<string, string> = {
  critical: 'Out of stock',
  warn: 'Low stock',
  ok: 'Healthy',
};

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

function formatCompactPeso(value: number) {
  if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₱${(value / 1_000).toFixed(0)}k`;
  return `₱${value.toFixed(0)}`;
}

function computePercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function trendClass(change: number) {
  if (change > 0) return 'hq-stat-trend--up';
  if (change < 0) return 'hq-stat-trend--down';
  return 'hq-stat-trend--muted';
}

export default function ReportsAnalyticsPage() {
  const { brand } = useBrand();
  const demo = useMemo(() => getHqDemoData(brand.slug), [brand.slug]);

  const [filters, setFilters] = useState<ReportsFilters>({ range: '7d', branchId: 'all' });
  const [data, setData] = useState<ReportsData | null>(() => ({
    ...demo.sampleReports,
    source: 'fallback',
  }));
  const [syncing, setSyncing] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      setErrorText('');
      const result = await fetchReportsData(brand.dbBrandId, filters);
      const hasLiveData = result.summary.orders > 0;
      if (hasLiveData) {
        setData(result);
        setUsingDemoData(false);
        if (result.source === 'fallback') {
          setErrorText('Using direct order aggregation. Run the HQ reports SQL functions for optimized metrics.');
        }
      } else {
        setUsingDemoData(true);
        setErrorText(demo.demoDataMessage);
      }
    } catch (error) {
      console.error('HQ reports sync failed', error);
      setUsingDemoData(true);
      setErrorText(demo.demoDataMessage);
    } finally {
      setSyncing(false);
    }
  }, [brand.dbBrandId, demo.demoDataMessage, filters]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`hq-reports-${brand.slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_order' }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branch_inventory' }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, brand.slug]);

  const display = usingDemoData || !data ? { ...demo.sampleReports, source: 'fallback' as const } : data;
  const { summary, revenueTrend, branchRanking, paymentMix, inventoryStatus } = display;

  const revenueChange = computePercentChange(summary.revenue, summary.prevRevenue);
  const orderChange = computePercentChange(summary.orders, summary.prevOrders);

  const branchOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of branchRanking) {
      if (row.branchId) seen.set(row.branchId, row.branchName);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [branchRanking]);

  const leaderboard = useMemo(
    () =>
      branchRanking.map((row) => ({
        ...row,
        shortName: row.branchName.replace(`${brand.name} `, ''),
      })),
    [branchRanking, brand.name]
  );

  const paymentTotal = useMemo(() => paymentMix.reduce((sum, item) => sum + item.amount, 0), [paymentMix]);
  const lowStockItems = useMemo(() => inventoryStatus.filter((row) => row.level !== 'ok'), [inventoryStatus]);

  const rangeSubcopy = RANGE_OPTIONS.find((option) => option.id === filters.range)?.label ?? '';

  return (
    <div className="hq-home hq-reports">
      <header className="hq-home-header">
        <div className="hq-home-heading">
          <span className="hq-eyebrow">{brand.name} Headquarters</span>
          <h1>Reports &amp; Analytics</h1>
          <p>Network-wide sales, franchisee performance, and stock health.</p>
        </div>

        <div className="hq-reports-controls">
          <div className="hq-range-toggle hq-reports-range">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={filters.range === option.id ? 'active' : ''}
                onClick={() => setFilters((prev) => ({ ...prev, range: option.id }))}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="hq-reports-select">
            <Store size={15} />
            <select
              value={filters.branchId ?? 'all'}
              onChange={(event) => setFilters((prev) => ({ ...prev, branchId: event.target.value }))}
            >
              <option value="all">All branches</option>
              {branchOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {filters.range === 'custom' && (
        <div className="hq-reports-custom-range">
          <label>
            From
            <input
              type="date"
              value={filters.startDate ?? ''}
              max={filters.endDate || undefined}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.endDate ?? ''}
              min={filters.startDate || undefined}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </label>
        </div>
      )}

      {syncing && <div className="hq-status-note hq-status-note--sync">Syncing live reports…</div>}
      {!syncing && errorText && <div className="hq-status-note">{errorText}</div>}

      <section className="hq-reports-kpis">
        <article className="hq-stat-card hq-stat-card--dark">
          <div className="hq-stat-meta">
            <span>Network Revenue</span>
            <span className="hq-stat-icon"><Wallet size={16} /></span>
          </div>
          <div className="hq-stat-value">{formatPeso(summary.revenue)}</div>
          <div className={`hq-stat-trend ${trendClass(revenueChange)}`}>
            {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(1)}% vs prior period
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Total Orders</span>
            <span className="hq-stat-icon"><Receipt size={16} /></span>
          </div>
          <div className="hq-stat-value">{summary.orders.toLocaleString()}</div>
          <div className={`hq-stat-trend ${trendClass(orderChange)}`}>
            {orderChange >= 0 ? '↑' : '↓'} {Math.abs(orderChange).toFixed(1)}% vs prior period
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Avg Order Value</span>
            <span className="hq-stat-icon"><CreditCard size={16} /></span>
          </div>
          <div className="hq-stat-value">₱{summary.avgOrderValue.toFixed(2)}</div>
          <div className="hq-stat-trend hq-stat-trend--muted">Across {rangeSubcopy.toLowerCase()}</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Active Branches</span>
            <span className="hq-stat-icon"><Store size={16} /></span>
          </div>
          <div className="hq-stat-value hq-stat-value--split">
            {summary.activeBranches}
            <span>/{demo.totalBranches}</span>
          </div>
          <div className="hq-stat-trend hq-stat-trend--muted">Reported sales</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Low Stock Branches</span>
            <span className="hq-stat-icon"><Boxes size={16} /></span>
          </div>
          <div className="hq-stat-value">{summary.lowStockBranches}</div>
          <div className={`hq-stat-trend ${summary.lowStockBranches > 0 ? 'hq-stat-trend--down' : 'hq-stat-trend--muted'}`}>
            {summary.lowStockBranches > 0 ? 'Need restocking' : 'All healthy'}
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Revenue Growth</span>
            <span className="hq-stat-icon"><TrendingUp size={16} /></span>
          </div>
          <div className="hq-stat-value">{revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%</div>
          <div className="hq-stat-trend hq-stat-trend--muted">vs previous {rangeSubcopy.toLowerCase()}</div>
        </article>
      </section>

      <div className="hq-reports-tabs">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <section className="hq-reports-grid hq-reports-grid--overview">
          <section className="hq-panel hq-reports-chart-panel">
            <div className="hq-panel-head">
              <div>
                <span className="hq-eyebrow">Revenue Trend</span>
                <div className="hq-panel-big-number">{formatPeso(summary.revenue)}</div>
                <span className="hq-panel-subcopy">{brand.name} network · {rangeSubcopy.toLowerCase()}</span>
              </div>
            </div>
            <div className="hq-reports-chart">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={demo.chartStroke} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={demo.chartStroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece6da" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#98a08f' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={formatCompactPeso}
                    tick={{ fontSize: 12, fill: '#98a08f' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(value) => [formatPeso(Number(value)), 'Revenue']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #ece6da', fontSize: 13 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={demo.chartStroke}
                    strokeWidth={2.5}
                    fill="url(#reportsRevenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="hq-panel hq-reports-chart-panel">
            <div className="hq-panel-head">
              <div>
                <span className="hq-eyebrow">Payment Mix</span>
                <h2>How customers pay</h2>
              </div>
            </div>
            <div className="hq-reports-payment">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentMix}
                    dataKey="amount"
                    nameKey="method"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {paymentMix.map((entry, index) => (
                      <Cell key={entry.method} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPeso(Number(value))} contentStyle={{ borderRadius: 12, border: '1px solid #ece6da', fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="hq-reports-legend">
                {paymentMix.map((entry, index) => {
                  const share = paymentTotal > 0 ? (entry.amount / paymentTotal) * 100 : 0;
                  return (
                    <li key={entry.method}>
                      <span className="hq-reports-legend-dot" style={{ background: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }} />
                      <span className="hq-reports-legend-label">{entry.method}</span>
                      <span className="hq-reports-legend-value">{formatPeso(entry.amount)} · {share.toFixed(0)}%</span>
                    </li>
                  );
                })}
                {paymentMix.length === 0 && <li className="hq-reports-legend-empty">No payments in range.</li>}
              </ul>
            </div>
          </section>
        </section>
      )}

      {activeTab === 'franchisees' && (
        <section className="hq-reports-grid">
          <section className="hq-panel hq-reports-chart-panel">
            <div className="hq-panel-head">
              <div>
                <span className="hq-eyebrow">Leaderboard</span>
                <h2>Top franchisees by revenue</h2>
              </div>
            </div>
            <div className="hq-reports-chart">
              <ResponsiveContainer width="100%" height={Math.max(220, leaderboard.length * 42)}>
                <BarChart data={leaderboard} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ece6da" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatCompactPeso} tick={{ fontSize: 12, fill: '#98a08f' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="shortName" width={130} tick={{ fontSize: 12, fill: '#4f5a48' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [formatPeso(Number(value)), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #ece6da', fontSize: 13 }} />
                  <Bar dataKey="revenue" fill={demo.chartStroke} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="hq-panel">
            <div className="hq-panel-head">
              <div>
                <span className="hq-eyebrow">Performance</span>
                <h2>Franchisee breakdown</h2>
              </div>
            </div>
            <div className="hq-orders-scroller">
              <table className="hq-orders-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Franchisee</th>
                    <th>Revenue</th>
                    <th>Orders</th>
                    <th>AOV</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRanking.map((row) => (
                    <tr key={row.branchId || row.branchName}>
                      <td className="hq-orders-total">{row.branchName}</td>
                      <td>{row.franchiseeName ?? '—'}</td>
                      <td className="hq-orders-total">{formatPeso(row.revenue)}</td>
                      <td>{row.orders.toLocaleString()}</td>
                      <td>₱{row.avgOrderValue.toFixed(0)}</td>
                      <td>
                        <span className={`hq-branch-status ${row.isActive ? 'is-warning' : 'is-offline'}`}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {branchRanking.length === 0 && (
                    <tr>
                      <td colSpan={6} className="hq-orders-time">No franchisee data in range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {activeTab === 'inventory' && (
        <section className="hq-reports-grid">
          <section className="hq-panel">
            <div className="hq-panel-head">
              <div>
                <span className="hq-eyebrow">Stock Health</span>
                <h2>Branch inventory status</h2>
              </div>
            </div>
            <div className="hq-orders-scroller">
              <table className="hq-orders-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Material</th>
                    <th>On Hand</th>
                    <th>Reorder At</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryStatus.map((row, index) => (
                    <tr key={`${row.branchId}-${row.materialName}-${index}`}>
                      <td className="hq-orders-total">{row.branchName}</td>
                      <td>{row.materialName}</td>
                      <td>{row.onHandQty.toLocaleString()} {row.unit}</td>
                      <td>{row.lowStockQty.toLocaleString()} {row.unit}</td>
                      <td>
                        <span className={`hq-reports-stock hq-reports-stock--${row.level}`}>
                          {LEVEL_LABEL[row.level] ?? row.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {inventoryStatus.length === 0 && (
                    <tr>
                      <td colSpan={5} className="hq-orders-time">No branch inventory recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="hq-panel">
            <div className="hq-panel-head">
              <div>
                <span className="hq-eyebrow">Reorder Now</span>
                <h2>Low stock alerts</h2>
              </div>
            </div>
            <ul className="hq-alert-list">
              {lowStockItems.map((row, index) => (
                <li key={`${row.branchId}-${row.materialName}-${index}`} className={`hq-alert hq-alert--${row.level === 'critical' ? 'critical' : 'warn'}`}>
                  <span className="hq-alert-icon">
                    {row.level === 'critical' ? <AlertTriangle size={14} /> : <Package size={14} />}
                  </span>
                  <div className="hq-alert-body">
                    <div className="hq-alert-title">{row.materialName}</div>
                    <div className="hq-alert-sub">{row.branchName}</div>
                  </div>
                  <div className="hq-alert-qty">{row.onHandQty.toLocaleString()} {row.unit}</div>
                </li>
              ))}
              {lowStockItems.length === 0 && (
                <li className="hq-alert">
                  <div className="hq-alert-body">
                    <div className="hq-alert-sub">All branches are well stocked.</div>
                  </div>
                </li>
              )}
            </ul>
          </section>
        </section>
      )}
    </div>
  );
}
