import { BarChart3, TrendingUp, Users, Store } from 'lucide-react';
import './GlobalDashboard.css';

export default function GlobalDashboard() {
  // Mock data for the static HQ dashboard
  const chartData = [
    { day: 'Mon', revenue: 42000 },
    { day: 'Tue', revenue: 38500 },
    { day: 'Wed', revenue: 51200 },
    { day: 'Thu', revenue: 49800 },
    { day: 'Fri', revenue: 86400 },
    { day: 'Sat', revenue: 95200 },
    { day: 'Sun', revenue: 89600 },
  ];
  
  const maxRev = Math.max(...chartData.map(d => d.revenue));

  const topBranches = [
    { rank: 1, name: 'Makati CBD Branch', manager: 'John Doe', revenue: 145000, orders: 1240 },
    { rank: 2, name: 'BGC High Street', manager: 'Jane Smith', revenue: 132000, orders: 1105 },
    { rank: 3, name: 'Quezon City Circle', manager: 'Mike Johnson', revenue: 98500, orders: 890 },
    { rank: 4, name: 'Alabang Town Center', manager: 'Sarah Williams', revenue: 76000, orders: 650 },
  ];

  return (
    <div className="page-container global-dashboard">
      <div className="page-header">
        <div className="page-title">
          <h1>Global KPI Dashboard</h1>
          <p>Real-time system-wide analytics and performance.</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="hq-kpi-grid">
        <div className="hq-kpi-card">
          <div className="hq-kpi-header">
            <span>Total Revenue (Today)</span>
            <BarChart3 size={16} />
          </div>
          <div className="hq-kpi-value">₱184,500</div>
          <div className="hq-kpi-footer">
            <span className="trend-up">↑ 12.5%</span>
            <span className="trend-label">vs yesterday</span>
          </div>
        </div>

        <div className="hq-kpi-card blue">
          <div className="hq-kpi-header">
            <span>Global Orders</span>
            <TrendingUp size={16} />
          </div>
          <div className="hq-kpi-value">1,482</div>
          <div className="hq-kpi-footer">
            <span className="trend-up">↑ 8.2%</span>
            <span className="trend-label">vs yesterday</span>
          </div>
        </div>

        <div className="hq-kpi-card green">
          <div className="hq-kpi-header">
            <span>Active Branches</span>
            <Store size={16} />
          </div>
          <div className="hq-kpi-value">24<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/25</span></div>
          <div className="hq-kpi-footer">
            <span className="trend-up">96%</span>
            <span className="trend-label">Operational Status</span>
          </div>
        </div>

        <div className="hq-kpi-card red">
          <div className="hq-kpi-header">
            <span>Low Stock Alerts</span>
            <Users size={16} />
          </div>
          <div className="hq-kpi-value">8</div>
          <div className="hq-kpi-footer">
            <span className="trend-down">Action Required</span>
            <span className="trend-label">across 3 branches</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="hq-main-row">
        {/* Left Panel: Charts */}
        <div className="hq-panel">
          <div className="hq-panel-title">
            Network Revenue Trend
            <span className="hq-panel-subtitle">This Week (All Branches)</span>
          </div>
          
          <div className="hq-chart-area">
            {chartData.map((data, idx) => (
              <div className="hq-chart-col" key={idx}>
                <div 
                  className="hq-chart-bar" 
                  style={{ height: `${(data.revenue / maxRev) * 100}%` }}
                  title={`₱${data.revenue.toLocaleString()}`}
                />
                <div className="hq-chart-label">{data.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Leaderboard */}
        <div className="hq-panel">
          <div className="hq-panel-title">
            Top Performing Branches
          </div>
          
          <div className="leaderboard-list">
            {topBranches.map((branch) => (
              <div className="leaderboard-item" key={branch.rank}>
                <div className={`rank-badge top-${branch.rank}`}>
                  {branch.rank}
                </div>
                <div className="branch-info">
                  <div className="branch-name">{branch.name}</div>
                  <div className="branch-mgr">{branch.manager}</div>
                </div>
                <div className="branch-stats">
                  <div className="branch-revenue">₱{branch.revenue.toLocaleString()}</div>
                  <div className="branch-orders">{branch.orders} orders</div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="btn-primary" style={{ width: '100%', marginTop: 'auto', background: 'var(--bg-surface-alt)', color: 'var(--text-primary)' }}>
            View Full Report
          </button>
        </div>
      </div>
    </div>
  );
}
