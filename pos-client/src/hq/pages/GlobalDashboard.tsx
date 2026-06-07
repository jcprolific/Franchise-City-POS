import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, ShoppingBag, Wallet, Store, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAttendanceEntries, subscribeAttendance } from '../../lib/attendanceStore';
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

const HQ_TOTAL_BRANCHES = 260;
const HQ_SAMPLE_SNAPSHOT: HqKpiSnapshot = {
  todayRevenue: 14370385,
  yesterdayRevenue: 13263971,
  todayOrders: 76845,
  yesterdayOrders: 73049,
  avgOrderValue: 187,
  activeBranches: 228,
};

const hqSampleRevenue: HqWeeklyRevenueItem[] = [
  { day: 'Mon', revenue: 13800000 },
  { day: 'Tue', revenue: 14240000 },
  { day: 'Wed', revenue: 15120000 },
  { day: 'Thu', revenue: 14630000 },
  { day: 'Fri', revenue: 16280000 },
  { day: 'Sat', revenue: 18590000 },
  { day: 'Sun', revenue: 17940000 },
];

function computePercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

const placeholderTopSellers = [
  { rank: 1, name: 'Cheese', sold: 18420, revenue: 1197300 },
  { rank: 2, name: 'Barbecue', sold: 14982, revenue: 973830 },
  { rank: 3, name: 'Sour Cream', sold: 12104, revenue: 786760 },
  { rank: 4, name: 'Chili Cheese', sold: 9876, revenue: 740700 },
  { rank: 5, name: 'Cheddar', sold: 8542, revenue: 597940 },
];

const placeholderLeaders = [
  { id: 'smc', rank: 1, name: 'Potato Corner SM Cebu 4', meta: 'SM Cebu · Cebu', revenue: 102967 },
  { id: 'smb', rank: 2, name: 'Potato Corner SM Baguio 11', meta: 'SM Baguio · Cordillera', revenue: 102650 },
  { id: 'tac', rank: 3, name: 'Potato Corner Tacloban 3', meta: 'Tacloban · Eastern Visayas', revenue: 102606 },
  { id: 'smn', rank: 4, name: 'Potato Corner SM North 3', meta: 'SM North · NCR', revenue: 101757 },
  { id: 'nag', rank: 5, name: 'Potato Corner Naga', meta: 'Naga · Bicol', revenue: 101497 },
];

const branchesToCheck = [
  { id: 'ort', name: 'Potato Corner Ortigas', meta: 'Terminal offline · last sync 2h ago', status: 'Offline' },
  { id: 'smn', name: 'Potato Corner SM North', meta: 'Below target · 85% of daily goal', status: 'Needs Attention' },
  { id: 'grh3', name: 'Potato Corner Greenhills 3', meta: 'Terminal offline · last sync 2h ago', status: 'Offline' },
  { id: 'grh4', name: 'Potato Corner Greenhills 4', meta: 'Below target · 88% of daily goal', status: 'Needs Attention' },
  { id: 'tri', name: 'Potato Corner Trinoma 4', meta: 'Below target · 76% of daily goal', status: 'Needs Attention' },
  { id: 'bat', name: 'Potato Corner Batangas City 3', meta: 'Below target · 77% of daily goal', status: 'Needs Attention' },
];

const placeholderInventoryAlerts = [
  { id: 'cup', name: 'PC Cups (Regular)', branch: 'Ortigas', qty: 120, level: 'warn' as const },
  { id: 'lid', name: 'Cup Lids', branch: 'SM North', qty: 180, level: 'warn' as const },
  { id: 'chi', name: 'Chili Cheese Powder', branch: 'Trinoma', qty: 0, level: 'critical' as const },
  { id: 'oil', name: 'Fry Oil', branch: 'Greenhills', qty: 3, level: 'critical' as const },
  { id: 'bag', name: 'Paper Bags', branch: 'Batangas City', qty: 190, level: 'warn' as const },
];

const placeholderLiveOrders = [
  { id: '4955', branch: 'SM Cebu 4', items: 'Cheese Mega, BBQ Regular', total: 275, status: 'NEW', time: 'Just now' },
  { id: '4954', branch: 'SM Baguio 11', items: 'Sour Cream x2, Chicken Pops', total: 365, status: 'PREPARING', time: '3 min ago' },
  { id: '4953', branch: 'Tacloban 3', items: 'Cheese Giga, Iced Tea', total: 245, status: 'PREPARING', time: '6 min ago' },
  { id: '4952', branch: 'SM North 3', items: 'Barbecue Jumbo', total: 105, status: 'READY', time: '8 min ago' },
  { id: '4951', branch: 'Naga', items: 'Cheddar Mega, Sweet Corn Regular', total: 260, status: 'COMPLETED', time: '10 min ago' },
];

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

export default function GlobalDashboard() {
  const [snapshot, setSnapshot] = useState<HqKpiSnapshot>(EMPTY_SNAPSHOT);
  const [chartData, setChartData] = useState<HqWeeklyRevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [range, setRange] = useState<'daily' | 'weekly'>('weekly');
  const [search, setSearch] = useState('');
  const [attendanceEntries, setAttendanceEntries] = useState(getAttendanceEntries());

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

  useEffect(() => {
    const sync = () => setAttendanceEntries(getAttendanceEntries());
    sync();
    return subscribeAttendance(sync);
  }, []);

  const displaySnapshot = snapshot.todayOrders > 0 ? snapshot : HQ_SAMPLE_SNAPSHOT;
  const displayChartData = chartData.length > 0 ? chartData : hqSampleRevenue;
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

  const cashierName = 'Staff HQ';
  const initials = 'SH';
  const weeklyRevenueTotal = displayChartData.reduce((sum, item) => sum + item.revenue, 0);
  const todayKey = useMemo(() => new Date().toDateString(), []);

  const attendanceSummary = useMemo(() => {
    const todayEntries = attendanceEntries
      .filter((entry) => new Date(entry.timestamp).toDateString() === todayKey)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const staffMap = new Map<
      string,
      {
        staffName: string;
        role: string;
        status: 'IN' | 'OUT';
        lastSeen: string;
        hoursToday: number;
      }
    >();
    const openShiftStart = new Map<string, string>();

    for (const entry of todayEntries) {
      const key = entry.staffName.toLowerCase();
      if (!staffMap.has(key)) {
        staffMap.set(key, {
          staffName: entry.staffName,
          role: entry.role,
          status: 'OUT',
          lastSeen: entry.timestamp,
          hoursToday: 0,
        });
      }
      const rec = staffMap.get(key)!;
      rec.role = entry.role;
      rec.lastSeen = entry.timestamp;
      rec.status = entry.status;

      if (entry.status === 'IN') {
        openShiftStart.set(key, entry.timestamp);
      } else {
        const started = openShiftStart.get(key);
        if (started) {
          rec.hoursToday += new Date(entry.timestamp).getTime() - new Date(started).getTime();
          openShiftStart.delete(key);
        }
      }
    }

    const nowMs = Date.now();
    for (const [key, started] of openShiftStart) {
      const rec = staffMap.get(key);
      if (rec) {
        rec.hoursToday += nowMs - new Date(started).getTime();
      }
    }

    const staff = [...staffMap.values()]
      .map((item) => ({ ...item, hoursToday: item.hoursToday / (1000 * 60 * 60) }))
      .sort((a, b) => b.hoursToday - a.hoursToday);

    return {
      staff,
      onShift: staff.filter((item) => item.status === 'IN').length,
      totalHours: staff.reduce((sum, item) => sum + item.hoursToday, 0),
    };
  }, [attendanceEntries, todayKey]);

  return (
    <div className="hq-home" id="hq-home">
      <header className="hq-home-header">
        <div className="hq-home-heading">
          <span className="hq-eyebrow">Headquarters Overview</span>
          <h1>Good morning, {cashierName}</h1>
          <p>Here's how the network is performing today.</p>
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

      {loading && <div className="hq-status-note">Loading Potato Corner HQ data...</div>}
      {errorText && <div className="hq-status-note">{errorText} Showing Potato Corner sample network view.</div>}

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
          <div className="hq-stat-trend hq-stat-trend--muted">Today global AOV</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Active Branches</span>
            <span className="hq-stat-icon"><Store size={16} /></span>
          </div>
          <div className="hq-stat-value hq-stat-value--split">
            {displaySnapshot.activeBranches}
            <span>/{HQ_TOTAL_BRANCHES}</span>
          </div>
          <div className="hq-stat-trend hq-stat-trend--muted">Online now</div>
        </article>
      </section>

      <section className="hq-panel hq-panel--chart">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Revenue Overview</span>
            <div className="hq-panel-big-number">{formatPeso(weeklyRevenueTotal)}</div>
            <span className="hq-panel-subcopy">Network-wide, weekly</span>
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
                <stop offset="0%" stopColor="rgba(0, 141, 54, 0.24)" />
                <stop offset="100%" stopColor="rgba(0, 141, 54, 0.0)" />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill="url(#hqAreaFill)" stroke="none" />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#008d36"
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
        <section className="hq-panel">
          <div className="hq-panel-head">
            <div>
              <span className="hq-eyebrow">Top Performing Branches</span>
              <h2>Today's Leaders</h2>
            </div>
          </div>

          <ul className="hq-location-list hq-location-list--leaders">
            {placeholderLeaders.map((loc) => (
              <li key={loc.id}>
                <div className="hq-location-top">
                  <div className="hq-location-info">
                    <span className="hq-rank hq-rank--green">{loc.rank}</span>
                    <div>
                      <div className="hq-location-title">{loc.name}</div>
                      <div className="hq-location-meta">{loc.meta}</div>
                    </div>
                  </div>
                  <div className="hq-location-amount">{formatPeso(loc.revenue)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="hq-panel">
          <div className="hq-panel-head">
            <div>
              <span className="hq-eyebrow">Needs Attention</span>
              <h2>Branches to Check</h2>
            </div>
          </div>

          <ul className="hq-alert-list hq-alert-list--branches">
            {branchesToCheck.map((branch) => (
              <li key={branch.id} className="hq-alert hq-alert--branch">
                <span className="hq-alert-icon">
                  <AlertTriangle size={14} />
                </span>
                <div className="hq-alert-body">
                  <div className="hq-alert-title">{branch.name}</div>
                  <div className="hq-alert-sub">{branch.meta}</div>
                </div>
                <span className={`hq-branch-status ${branch.status === 'Offline' ? 'is-offline' : 'is-warning'}`}>
                  {branch.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="hq-panel hq-panel--wide">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Best Sellers — Network Wide</span>
            <h2>Top 5 Today</h2>
          </div>
          <button className="hq-ghost-btn" type="button">View all</button>
        </div>

        <ul className="hq-ranked-list hq-ranked-list--wide">
          {placeholderTopSellers.map((item) => (
            <li key={item.rank}>
              <span className="hq-rank">{item.rank}</span>
              <div className="hq-rank-body">
                <div className="hq-rank-title">{item.name}</div>
                <div className="hq-rank-sub">{item.sold.toLocaleString()} sold</div>
              </div>
              <div className="hq-rank-amount">{formatPeso(item.revenue)}</div>
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
            <span className="hq-eyebrow">Employee Attendance</span>
            <h2>Time In / Time Out Monitoring</h2>
          </div>
          <button className="hq-ghost-btn" type="button">
            {attendanceSummary.onShift} on shift
          </button>
        </div>

        <section className="hq-attendance-kpis">
          <article className="hq-attendance-kpi">
            <span className="hq-attendance-kpi-label">Total Staff Logged Today</span>
            <span className="hq-attendance-kpi-value">{attendanceSummary.staff.length}</span>
          </article>
          <article className="hq-attendance-kpi">
            <span className="hq-attendance-kpi-label">Currently On Shift</span>
            <span className="hq-attendance-kpi-value">{attendanceSummary.onShift}</span>
          </article>
          <article className="hq-attendance-kpi">
            <span className="hq-attendance-kpi-label">Total Staff Hours Today</span>
            <span className="hq-attendance-kpi-value">{formatHours(attendanceSummary.totalHours)}</span>
          </article>
        </section>

        <div className="hq-orders-scroller">
          <table className="hq-orders-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Status</th>
                <th>Hours Today</th>
                <th>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {attendanceSummary.staff.map((staff) => (
                <tr key={staff.staffName}>
                  <td className="hq-orders-id">{staff.staffName}</td>
                  <td>{staff.role}</td>
                  <td>
                    <span className={`hq-status hq-status--${staff.status === 'IN' ? 'ready' : 'completed'}`}>
                      {staff.status === 'IN' ? 'On Shift' : 'Off Shift'}
                    </span>
                  </td>
                  <td className="hq-orders-total">{formatHours(staff.hoursToday)}</td>
                  <td className="hq-orders-time">
                    {new Date(staff.lastSeen).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
              {attendanceSummary.staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="hq-orders-time">
                    No attendance logs yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
