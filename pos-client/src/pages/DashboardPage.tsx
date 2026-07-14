import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrand } from '../context/BrandContext';
import { supabase } from '../lib/supabase';
import { fetchLiveDashboardData } from '../lib/dashboardRealtime';
import { getCurrentBranch, subscribeBranch, type BranchRef } from '../lib/branchContext';
import {
  fetchDailySalesTrend,
  fetchFranchiseSummary,
  fetchLowStockItems,
  fetchProductPerformance,
} from '../lib/franchiseReportsService';
import './DashboardPage.css';

function formatYAxis(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString();
}

export default function DashboardPage() {
  const { brand } = useBrand();
  const [branch, setBranch] = useState<BranchRef>(() => getCurrentBranch());

  useEffect(() => subscribeBranch(() => setBranch(getCurrentBranch())), []);

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
  const [weeklySales, setWeeklySales] = useState<{ day: string; amount: number }[]>([]);
  const [topProducts, setTopProducts] = useState<
    { name: string; count: number; color: string }[]
  >([]);
  const [topProductName, setTopProductName] = useState('—');
  const [topProductSold, setTopProductSold] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<
    { id: string; name: string; quantity: number; unit: string; icon: string }[]
  >([]);
  const [dataSource, setDataSource] = useState<'live' | 'fallback'>('fallback');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refreshDashboard = useCallback(async () => {
    try {
      setLoadError('');
      const [{ dashboard }, trend, products, lowStock] = await Promise.all([
        fetchLiveDashboardData(branch.id),
        fetchDailySalesTrend(brand.dbBrandId, 7, branch.id),
        fetchProductPerformance(brand.dbBrandId, '7d', branch.id),
        fetchLowStockItems(brand.dbBrandId, branch.id),
      ]);

      setLiveDashboard(dashboard);
      setWeeklySales(trend.map((t) => ({ day: t.label, amount: t.amount })));

      const colors = ['#f37021', '#008d36', '#ffd200', '#007a33', '#d98724'];
      const mapped = products.rows.slice(0, 5).map((p, i) => ({
        name: p.productName,
        count: p.quantity,
        color: colors[i % colors.length],
      }));
      setTopProducts(mapped.length ? mapped : [{ name: 'No sales yet', count: 0, color: '#ccc' }]);
      if (products.rows[0]) {
        setTopProductName(products.rows[0].productName);
        setTopProductSold(products.rows[0].quantity);
      } else {
        setTopProductName('—');
        setTopProductSold(0);
      }
      setLowStockItems(
        lowStock.map((i) => ({
          id: i.rawMaterialId,
          name: i.name,
          quantity: i.onHandQty,
          unit: i.unit,
          icon: i.icon || '📦',
        }))
      );
      setDataSource(products.source === 'live' || dashboard.totalOrders > 0 ? 'live' : 'fallback');
    } catch (error) {
      console.error('Dashboard sync failed:', error);
      setLoadError('Realtime sync unavailable. Showing latest cached values.');
    } finally {
      setIsLoading(false);
    }
  }, [brand.dbBrandId, branch.id]);

  useEffect(() => {
    void refreshDashboard();

    // Realtime is primary; poll + focus refresh keep KPIs current if the channel drops.
    const POLL_MS = 15_000;
    const pollId = window.setInterval(() => {
      void refreshDashboard();
    }, POLL_MS);
    const onFocus = () => {
      void refreshDashboard();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

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
      window.clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [refreshDashboard]);

  const maxSales = Math.max(...weeklySales.map((s) => s.amount), 1);
  const yAxisMax = Math.ceil(maxSales / 5000) * 5000 || 5000;
  const yAxisTicks = useMemo(
    () => [yAxisMax, yAxisMax * 0.75, yAxisMax * 0.5, yAxisMax * 0.25, 0],
    [yAxisMax]
  );

  const totalProducts = topProducts.reduce((sum, p) => sum + p.count, 0) || 1;
  const donutGradient = useMemo(() => {
    let accumulated = 0;
    const stops: string[] = [];
    topProducts.forEach((p) => {
      const start = (accumulated / totalProducts) * 360;
      accumulated += p.count;
      const end = (accumulated / totalProducts) * 360;
      stops.push(`${p.color} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [topProducts, totalProducts]);

  const handlePrintEod = async () => {
    const summary = await fetchFranchiseSummary(brand.dbBrandId, 'today', branch.id);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>EOD Report</title></head><body style="font-family:sans-serif;padding:24px">
      <h1>Daily Sales Report — ${branch.name}</h1>
      <p>${new Date().toLocaleDateString('en-PH')}</p>
      <ul>
        <li>Revenue: ₱${summary.revenue.toLocaleString()}</li>
        <li>Orders: ${summary.orders}</li>
        <li>Avg Order: ₱${summary.avgOrderValue.toFixed(2)}</li>
      </ul>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <div className="dashboard-page" id="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <span className="branch-label">{branch.locationLabel || branch.name}</span>
        </div>
        <div className="dashboard-header-badges">
          {isLoading && <span className="dashboard-status is-loading">Syncing orders…</span>}
          {!isLoading && loadError && (
            <span className="dashboard-status is-warning">{loadError}</span>
          )}
          {!isLoading && !loadError && (
            <span className="dashboard-status is-live">
              {dataSource === 'live' ? `Live · ${liveDashboard.totalOrders} orders today` : 'Sample / offline data'}
            </span>
          )}
          <button type="button" className="dashboard-eod-btn" onClick={() => void handlePrintEod()}>
            Print EOD
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card" style={{ animationDelay: '0ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Today&apos;s Sales</span>
          </div>
          <div className="kpi-card-value">₱{liveDashboard.todaySales.toLocaleString()}</div>
          <div className={`kpi-card-change ${liveDashboard.todaySalesChange >= 0 ? 'up' : 'down'}`}>
            {liveDashboard.todaySalesChange >= 0 ? '+' : ''}
            {liveDashboard.todaySalesChange.toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '60ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Orders</span>
          </div>
          <div className="kpi-card-value">{liveDashboard.totalOrders}</div>
          <div className={`kpi-card-change ${liveDashboard.ordersChange >= 0 ? 'up' : 'down'}`}>
            {liveDashboard.ordersChange >= 0 ? '+' : ''}
            {liveDashboard.ordersChange.toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card" style={{ animationDelay: '120ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Avg Order Value</span>
          </div>
          <div className="kpi-card-value">₱{liveDashboard.avgOrderValue.toFixed(2)}</div>
          <div className={`kpi-card-change ${liveDashboard.avgOrderChange >= 0 ? 'up' : 'down'}`}>
            {liveDashboard.avgOrderChange >= 0 ? '+' : ''}
            {liveDashboard.avgOrderChange.toFixed(1)}%
          </div>
        </div>

        <div className="kpi-card kpi-card-highlight" style={{ animationDelay: '180ms' }}>
          <div className="kpi-card-header">
            <span className="kpi-card-title">Top Seller</span>
          </div>
          <div className="kpi-card-value">{topProductName}</div>
          <div className="kpi-card-change sold">{topProductSold} sold</div>
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
            {weeklySales.map((s) => (
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
              {topProducts.map((p) => (
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
                  <td colSpan={5} className="transactions-empty">
                    No orders yet — complete a sale on POS to see live data.
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
