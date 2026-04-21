import { useCallback, useEffect, useMemo, useState } from 'react';
import { sampleDashboard } from '../data/inventoryDashboardData';
import { sampleInventory } from '../data/inventoryDashboardData';
import { supabase } from '../lib/supabase';
import { fetchLiveDashboardData } from '../lib/dashboardRealtime';
import './DashboardPage.css';

export default function DashboardPage() {
  const staticDashboard = sampleDashboard;
  const [liveDashboard, setLiveDashboard] = useState({
    todaySales: 0,
    todaySalesChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
    recentTransactions: [] as {
      id: string;
      time: string;
      items: number;
      total: number;
      payment: string;
    }[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refreshDashboard = useCallback(async () => {
    try {
      setLoadError('');
      const { dashboard } = await fetchLiveDashboardData();
      setLiveDashboard(dashboard);
    } catch (error) {
      console.error('Dashboard sync failed:', error);
      setLoadError('Realtime sync unavailable. Showing latest cached values.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();

    const channel = supabase
      .channel('dashboard-pos-order-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_order' },
        () => {
          void refreshDashboard();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshDashboard]);

  const maxSales = Math.max(...staticDashboard.weeklySales.map((s) => s.amount));

  const lowStockItems = useMemo(
    () => sampleInventory.filter((i) => i.quantity <= i.lowStockThreshold),
    []
  );

  // Build donut chart gradient
  const totalProducts = staticDashboard.topProducts.reduce((sum, p) => sum + p.count, 0);
  const donutGradient = useMemo(() => {
    let accumulated = 0;
    const stops: string[] = [];
    staticDashboard.topProducts.forEach((p) => {
      const start = (accumulated / totalProducts) * 360;
      accumulated += p.count;
      const end = (accumulated / totalProducts) * 360;
      stops.push(`${p.color} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [staticDashboard.topProducts, totalProducts]);

  return (
    <div className="dashboard-page" id="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <span className="branch-label">Franchise City · Main Branch</span>
      </div>
      {isLoading && <div className="branch-label">Loading live orders...</div>}
      {loadError && <div className="branch-label">{loadError}</div>}

      {/* KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card" style={{ animationDelay: '0ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Today's Sales</span>
            <span className="kpi-card-icon">💰</span>
          </div>
          <div className="kpi-card-value">₱{liveDashboard.todaySales.toLocaleString()}</div>
          <div className="kpi-card-change">
            {liveDashboard.todaySalesChange >= 0 ? '+' : ''}
            {liveDashboard.todaySalesChange.toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '60ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Orders</span>
            <span className="kpi-card-icon">🛒</span>
          </div>
          <div className="kpi-card-value">{liveDashboard.totalOrders}</div>
          <div className="kpi-card-change">
            {liveDashboard.ordersChange >= 0 ? '+' : ''}
            {liveDashboard.ordersChange.toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '120ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Avg Order Value</span>
            <span className="kpi-card-icon">📈</span>
          </div>
          <div className="kpi-card-value">₱{liveDashboard.avgOrderValue.toFixed(2)}</div>
          <div className="kpi-card-change">
            {liveDashboard.avgOrderChange >= 0 ? '+' : ''}
            {liveDashboard.avgOrderChange.toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '180ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Top Product</span>
            <span className="kpi-card-icon">⭐</span>
          </div>
          <div className="kpi-card-value">{staticDashboard.topProductName}</div>
          <div className="kpi-card-change sold">{staticDashboard.topProductSold} sold</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-title">Weekly Sales</div>
          <div className="bar-chart">
            <div className="bar-chart-y-labels">
              {[22000, 16500, 11000, 5500, 0].map((v) => (
                <span key={v} className="bar-y-label">{v.toLocaleString()}</span>
              ))}
            </div>
            {staticDashboard.weeklySales.map((s) => (
              <div key={s.day} className="bar-chart-col">
                <div
                  className="bar-chart-bar"
                  style={{ height: `${(s.amount / maxSales) * 100}%` }}
                  title={`₱${s.amount.toLocaleString()}`}
                />
                <span className="bar-chart-label">{s.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="chart-card">
          <div className="chart-card-title">Top Products</div>
          <div className="donut-chart-wrapper">
            <div
              className="donut-chart"
              style={{ background: donutGradient }}
            >
              <div className="donut-chart-inner" />
            </div>
            <div className="donut-legend">
              {staticDashboard.topProducts.map((p) => (
                <div key={p.name} className="donut-legend-item">
                  <div className="donut-legend-dot" style={{ background: p.color }} />
                  <span className="donut-legend-name">{p.name}</span>
                  <span className="donut-legend-count">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        {/* Recent Transactions */}
        <div className="transactions-card">
          <div className="transactions-card-title">Recent Transactions</div>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Time</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {liveDashboard.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="order-id">{tx.id}</td>
                  <td>{tx.time}</td>
                  <td>{tx.items}</td>
                  <td className="total">₱{tx.total}</td>
                  <td><span className="payment-tag">{tx.payment}</span></td>
                </tr>
              ))}
              {liveDashboard.recentTransactions.length === 0 && (
                <tr>
                  <td className="order-id">No orders yet</td>
                  <td>--</td>
                  <td>0</td>
                  <td className="total">₱0.00</td>
                  <td><span className="payment-tag">--</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alert */}
        <div className="low-stock-card">
          <div className="low-stock-card-title">
            <span>⚠️</span> Low Stock Alert
          </div>
          <div className="low-stock-list">
            {lowStockItems.map((item) => (
              <div key={item.id} className="low-stock-row">
                <span className="low-stock-name">{item.name}</span>
                <span className="low-stock-qty">
                  {item.quantity.toLocaleString()} {item.unit}
                </span>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div style={{ color: 'var(--success)', fontSize: 'var(--font-sm)' }}>
                ✅ All items sufficiently stocked
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
