import { useMemo } from 'react';
import { sampleDashboard } from '../data/inventoryDashboardData';
import { sampleInventory } from '../data/inventoryDashboardData';
import './DashboardPage.css';

export default function DashboardPage() {
  const d = sampleDashboard;

  const maxSales = Math.max(...d.weeklySales.map((s) => s.amount));

  const lowStockItems = useMemo(
    () => sampleInventory.filter((i) => i.quantity <= i.lowStockThreshold),
    []
  );

  // Build donut chart gradient
  const totalProducts = d.topProducts.reduce((sum, p) => sum + p.count, 0);
  const donutGradient = useMemo(() => {
    let accumulated = 0;
    const stops: string[] = [];
    d.topProducts.forEach((p) => {
      const start = (accumulated / totalProducts) * 360;
      accumulated += p.count;
      const end = (accumulated / totalProducts) * 360;
      stops.push(`${p.color} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [d.topProducts, totalProducts]);

  return (
    <div className="dashboard-page" id="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <span className="branch-label">Franchise City · Main Branch</span>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card" style={{ animationDelay: '0ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Today's Sales</span>
            <span className="kpi-card-icon">💰</span>
          </div>
          <div className="kpi-card-value">₱{d.todaySales.toLocaleString()}</div>
          <div className="kpi-card-change">+{d.todaySalesChange}%</div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '60ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Orders</span>
            <span className="kpi-card-icon">🛒</span>
          </div>
          <div className="kpi-card-value">{d.totalOrders}</div>
          <div className="kpi-card-change">+{d.ordersChange}%</div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '120ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Avg Order Value</span>
            <span className="kpi-card-icon">📈</span>
          </div>
          <div className="kpi-card-value">₱{d.avgOrderValue.toFixed(2)}</div>
          <div className="kpi-card-change">+{d.avgOrderChange}%</div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '180ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Top Product</span>
            <span className="kpi-card-icon">⭐</span>
          </div>
          <div className="kpi-card-value">{d.topProductName}</div>
          <div className="kpi-card-change sold">{d.topProductSold} sold</div>
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
            {d.weeklySales.map((s) => (
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
              {d.topProducts.map((p) => (
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
              {d.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="order-id">{tx.id}</td>
                  <td>{tx.time}</td>
                  <td>{tx.items}</td>
                  <td className="total">₱{tx.total}</td>
                  <td><span className="payment-tag">{tx.payment}</span></td>
                </tr>
              ))}
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
