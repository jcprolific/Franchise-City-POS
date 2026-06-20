import { useCallback, useEffect, useMemo, useState } from 'react';
import { sampleDashboard } from '../data/inventoryDashboardData';
import { sampleInventory } from '../data/inventoryDashboardData';
import { useBrand } from '../context/BrandContext';
import { supabase } from '../lib/supabase';
import { fetchLiveDashboardData } from '../lib/dashboardRealtime';
import './DashboardPage.css';

function formatYAxis(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString();
}

export default function DashboardPage() {
  const { brand } = useBrand();
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
  const yAxisMax = Math.ceil(maxSales / 5000) * 5000 || 5000;
  const yAxisTicks = useMemo(
    () => [yAxisMax, yAxisMax * 0.75, yAxisMax * 0.5, yAxisMax * 0.25, 0],
    [yAxisMax]
  );

  const lowStockItems = useMemo(
    () => sampleInventory.filter((i) => i.quantity <= i.lowStockThreshold),
    []
  );

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

  const hasLiveOrders = liveDashboard.totalOrders > 0;

  return (
    <div className="dashboard-page" id="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <span className="branch-label">{brand.branchLabel}</span>
        </div>
        <div className="dashboard-header-badges">
          {isLoading && <span className="dashboard-status is-loading">Syncing orders…</span>}
          {!isLoading && loadError && (
            <span className="dashboard-status is-warning">{loadError}</span>
          )}
          {!isLoading && !loadError && hasLiveOrders && (
            <span className="dashboard-status is-live">Live · {liveDashboard.totalOrders} orders today</span>
          )}
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card" style={{ animationDelay: '0ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Today&apos;s Sales</span>
          </div>
          <div className="kpi-card-value">
            ₱{(hasLiveOrders ? liveDashboard.todaySales : staticDashboard.todaySales).toLocaleString()}
          </div>
          <div className={`kpi-card-change ${(hasLiveOrders ? liveDashboard.todaySalesChange : staticDashboard.todaySalesChange) >= 0 ? 'up' : 'down'}`}>
            {(hasLiveOrders ? liveDashboard.todaySalesChange : staticDashboard.todaySalesChange) >= 0 ? '+' : ''}
            {(hasLiveOrders ? liveDashboard.todaySalesChange : staticDashboard.todaySalesChange).toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '60ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Orders</span>
          </div>
          <div className="kpi-card-value">
            {hasLiveOrders ? liveDashboard.totalOrders : staticDashboard.totalOrders}
          </div>
          <div className={`kpi-card-change ${(hasLiveOrders ? liveDashboard.ordersChange : staticDashboard.ordersChange) >= 0 ? 'up' : 'down'}`}>
            {(hasLiveOrders ? liveDashboard.ordersChange : staticDashboard.ordersChange) >= 0 ? '+' : ''}
            {(hasLiveOrders ? liveDashboard.ordersChange : staticDashboard.ordersChange).toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '120ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Avg Order Value</span>
          </div>
          <div className="kpi-card-value">
            ₱{(hasLiveOrders ? liveDashboard.avgOrderValue : staticDashboard.avgOrderValue).toFixed(2)}
          </div>
          <div className={`kpi-card-change ${(hasLiveOrders ? liveDashboard.avgOrderChange : staticDashboard.avgOrderChange) >= 0 ? 'up' : 'down'}`}>
            {(hasLiveOrders ? liveDashboard.avgOrderChange : staticDashboard.avgOrderChange) >= 0 ? '+' : ''}
            {(hasLiveOrders ? liveDashboard.avgOrderChange : staticDashboard.avgOrderChange).toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card kpi-card-highlight" style={{ animationDelay: '180ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Top Flavor</span>
          </div>
          <div className="kpi-card-value">{staticDashboard.topProductName}</div>
          <div className="kpi-card-change sold">{staticDashboard.topProductSold} sold</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-card-title">Weekly Sales</div>
          <div className="bar-chart">
            <div className="bar-chart-y-labels">
              {yAxisTicks.map((v) => (
                <span key={v} className="bar-y-label">{formatYAxis(v)}</span>
              ))}
            </div>
            {staticDashboard.weeklySales.map((s) => (
              <div key={s.day} className="bar-chart-col">
                <div
                  className="bar-chart-bar"
                  style={{ height: `${(s.amount / yAxisMax) * 100}%` }}
                  title={`₱${s.amount.toLocaleString()}`}
                />
                <span className="bar-chart-label">{s.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-title">Top Sellers</div>
          <div className="donut-chart-wrapper">
            <div className="donut-chart" style={{ background: donutGradient }}>
              <div className="donut-chart-inner">
                <span className="donut-chart-center">{totalProducts}</span>
              </div>
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

      <div className="bottom-row">
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
              {(hasLiveOrders ? liveDashboard.recentTransactions : staticDashboard.recentTransactions).map((tx) => (
                <tr key={tx.id}>
                  <td className="order-id">{tx.id}</td>
                  <td>{tx.time}</td>
                  <td>{tx.items}</td>
                  <td className="total">₱{tx.total}</td>
                  <td><span className="payment-tag">{tx.payment}</span></td>
                </tr>
              ))}
              {(hasLiveOrders ? liveDashboard.recentTransactions : staticDashboard.recentTransactions).length === 0 && (
                <tr>
                  <td colSpan={5} className="transactions-empty">
                    No orders yet — sample data will appear once synced.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="low-stock-card">
          <div className="low-stock-card-title">
            <span>⚠️</span> Low Stock Alert
          </div>
          <div className="low-stock-list">
            {lowStockItems.map((item) => (
              <div key={item.id} className="low-stock-row">
                <span className="low-stock-name">
                  <span className="low-stock-icon" aria-hidden="true">{item.icon}</span>
                  {item.name}
                </span>
                <span className="low-stock-qty">
                  {item.quantity.toLocaleString()} {item.unit}
                </span>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="low-stock-ok">✅ All items sufficiently stocked</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
