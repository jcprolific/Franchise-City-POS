import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, ShoppingBag, Wallet, Store, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { HqKpiSnapshot, HqWeeklyRevenueItem } from '../lib/hqKpiService';
import { fetchHqKpiData } from '../lib/hqKpiService';
import './GlobalDashboard.css';

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

const placeholderTopSellers = [
  { rank: 1, name: 'Spanish Latte', sold: 142, revenue: 23430 },
  { rank: 2, name: 'Caramel Macchiato', sold: 118, revenue: 20060 },
  { rank: 3, name: 'Cappuccino', sold: 102, revenue: 15300 },
  { rank: 4, name: 'Mocha', sold: 96, revenue: 15360 },
  { rank: 5, name: 'Americano', sold: 84, revenue: 10080 },
];

const placeholderLocations = [
  { id: 'fcm', name: 'Franchise City Main', meta: '4.9 star · 12 years', revenue: 89000, percent: 92, flag: 'TOP' },
  { id: 'bgc', name: 'BGC Central', meta: '4.8 star · 5 years', revenue: 72500, percent: 78 },
  { id: 'qc', name: 'Quezon Ave.', meta: '4.7 star · 3 years', revenue: 58600, percent: 64 },
  { id: 'ort', name: 'Ortigas Tower', meta: '4.6 star · 4 years', revenue: 43200, percent: 52 },
  { id: 'aln', name: 'Alabang Town', meta: '4.6 star · 2 years', revenue: 38400, percent: 46 },
];

const placeholderInventoryAlerts = [
  { id: 'esp', name: 'Espresso Beans (1kg)', branch: 'Franchise City', qty: 2, level: 'warn' as const },
  { id: 'milk', name: 'Whole Milk', branch: 'BGC Central', qty: 0, level: 'critical' as const },
  { id: 'syr', name: 'Caramel Syrup', branch: 'Quezon Ave.', qty: 3, level: 'warn' as const },
  { id: 'cup', name: 'Paper Cups (16oz)', branch: 'Alabang Town', qty: 0, level: 'critical' as const },
  { id: 'cho', name: 'Chocolate Powder', branch: 'Ortigas Tower', qty: 5, level: 'warn' as const },
];

const placeholderLiveOrders = [
  { id: '4955', branch: 'Franchise City', items: 'Latte, Spanish Latte', total: 340, status: 'NEW', time: 'Just now' },
  { id: '4954', branch: 'BGC Central', items: 'Mocha x2, Americano', total: 460, status: 'PREPARING', time: '3 min ago' },
  { id: '4953', branch: 'Quezon Ave.', items: 'Cappuccino, Flat White', total: 295, status: 'PREPARING', time: '6 min ago' },
  { id: '4952', branch: 'Alabang Town', items: 'Caramel Macchiato', total: 175, status: 'READY', time: '8 min ago' },
  { id: '4951', branch: 'Franchise City', items: 'Espresso x3', total: 300, status: 'COMPLETED', time: '10 min ago' },
];

export default function GlobalDashboard() {
  const [snapshot, setSnapshot] = useState<HqKpiSnapshot>(EMPTY_SNAPSHOT);
  const [chartData, setChartData] = useState<HqWeeklyRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [range, setRange] = useState<'daily' | 'weekly'>('weekly');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    try {
      setErrorText('');
      const result = await fetchHqKpiData();
      setSnapshot(result.snapshot);
      setChartData(result.weeklyRevenue);
      if (result.source === 'fallback') {
        setErrorText('Showing direct aggregation. Run HQ KPI SQL functions for optimized metrics.');
      }
    } catch (error) {
      console.error('HQ KPI sync failed', error);
      setErrorText('Failed to load HQ KPI data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel('hq-pos-order-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pos_order' }, () => {
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const revenueChange = computePercentChange(snapshot.todayRevenue, snapshot.yesterdayRevenue);
  const orderChange = computePercentChange(snapshot.todayOrders, snapshot.yesterdayOrders);

  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return [] as { x: number; y: number; day: string; revenue: number }[];
    const points = chartData.map((item) => ({ ...item, revenue: item.revenue }));
    const maxY = Math.max(1, ...points.map((p) => p.revenue));
    return points.map((p, idx) => ({
      day: p.day,
      revenue: p.revenue,
      x: (idx / Math.max(1, points.length - 1)) * 100,
      y: 100 - (p.revenue / maxY) * 100,
    }));
  }, [chartData]);

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

  const cashierName = 'Staff HQ';
  const initials = 'SH';

  return (
    <div className="hq-home" id="hq-home">
      <header className="hq-home-header">
        <div className="hq-home-heading">
          <span className="hq-eyebrow">Headquarters Overview</span>
          <h1>Good morning, {cashierName}</h1>
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

      {loading && <div className="hq-status-note">Loading HQ data...</div>}
      {errorText && <div className="hq-status-note">{errorText}</div>}

      <section className="hq-kpi-row">
        <article className="hq-stat-card hq-stat-card--dark">
          <div className="hq-stat-meta">
            <span>Total Sales Today</span>
            <span className="hq-stat-icon"><Wallet size={16} /></span>
          </div>
          <div className="hq-stat-value">{formatPeso(snapshot.todayRevenue)}</div>
          <div className="hq-stat-trend hq-stat-trend--up">
            {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(1)}% vs yesterday
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Total Orders</span>
            <span className="hq-stat-icon"><ShoppingBag size={16} /></span>
          </div>
          <div className="hq-stat-value">{snapshot.todayOrders.toLocaleString()}</div>
          <div className="hq-stat-trend hq-stat-trend--up">
            {orderChange >= 0 ? '↑' : '↓'} {Math.abs(orderChange).toFixed(1)}% vs yesterday
          </div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Avg Order Value</span>
            <span className="hq-stat-icon"><CreditCard size={16} /></span>
          </div>
          <div className="hq-stat-value">₱{snapshot.avgOrderValue.toFixed(2)}</div>
          <div className="hq-stat-trend hq-stat-trend--muted">Today global AOV</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Active Branches</span>
            <span className="hq-stat-icon"><Store size={16} /></span>
          </div>
          <div className="hq-stat-value hq-stat-value--split">
            {snapshot.activeBranches}
            <span>/5</span>
          </div>
          <div className="hq-stat-trend hq-stat-trend--muted">Online now</div>
        </article>
      </section>

      <section className="hq-panel hq-panel--chart">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Revenue Overview</span>
            <div className="hq-panel-big-number">₱371,700</div>
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
                <stop offset="0%" stopColor="rgba(217, 135, 36, 0.35)" />
                <stop offset="100%" stopColor="rgba(217, 135, 36, 0.0)" />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill="url(#hqAreaFill)" stroke="none" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#d98724"
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

      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Best Sellers</span>
            <h2>Top 5 Today</h2>
          </div>
          <button className="hq-ghost-btn" type="button">View all</button>
        </div>

        <ul className="hq-ranked-list">
          {placeholderTopSellers.map((item) => (
            <li key={item.rank}>
              <span className="hq-rank">{item.rank}</span>
              <div className="hq-rank-body">
                <div className="hq-rank-title">{item.name}</div>
                <div className="hq-rank-sub">{item.sold} sold</div>
              </div>
              <div className="hq-rank-amount">{formatPeso(item.revenue)}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Branch Performance</span>
            <h2>All Locations</h2>
          </div>
          <button className="hq-ghost-btn" type="button">5 active</button>
        </div>

        <ul className="hq-location-list">
          {placeholderLocations.map((loc) => (
            <li key={loc.id}>
              <div className="hq-location-top">
                <div className="hq-location-info">
                  <span className="hq-location-dot" />
                  <div>
                    <div className="hq-location-title">
                      {loc.name}
                      {loc.flag && <span className="hq-location-flag">{loc.flag}</span>}
                    </div>
                    <div className="hq-location-meta">{loc.meta}</div>
                  </div>
                </div>
                <div className="hq-location-amount">
                  {formatPeso(loc.revenue)}
                  <span className="hq-location-orders">{Math.round(loc.revenue / 180)} orders</span>
                </div>
              </div>
              <div className="hq-progress">
                <div className="hq-progress-fill" style={{ width: `${loc.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Inventory Alerts</span>
            <h2>Needs Attention</h2>
          </div>
          <button className="hq-ghost-btn hq-ghost-btn--danger" type="button">Restock</button>
        </div>

        <ul className="hq-alert-list">
          {placeholderInventoryAlerts.map((alert) => (
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

      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Live Orders</span>
            <h2>Across All Branches</h2>
          </div>
          <button className="hq-ghost-btn" type="button">Refresh</button>
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
              {placeholderLiveOrders.map((order) => (
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
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
