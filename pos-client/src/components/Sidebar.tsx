import type { NavPage } from '../types';
import './Sidebar.css';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  userName: string;
  onLogout: () => void;
}

export default function Sidebar({ currentPage, onNavigate, userName, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar" id="sidebar-nav">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">☕</div>
        <span className="sidebar-brand-name">Franchise City</span>
      </div>

      <nav className="sidebar-nav">
        <button
          id="nav-pos"
          className={`sidebar-nav-item ${currentPage === 'pos' ? 'active' : ''}`}
          onClick={() => onNavigate('pos')}
        >
          <span className="nav-icon">🖥</span>
          POS
        </button>
        <button
          id="nav-inventory"
          className={`sidebar-nav-item ${currentPage === 'inventory' ? 'active' : ''}`}
          onClick={() => onNavigate('inventory')}
        >
          <span className="nav-icon">📦</span>
          Inventory
        </button>
        <button
          id="nav-dashboard"
          className={`sidebar-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <span className="nav-icon">📊</span>
          Dashboard
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{userName}</span>
            <span className="sidebar-user-role">Cashier</span>
          </div>
        </div>
        <div className="sidebar-footer-actions">
          <div className="sidebar-sync-badge">
            <span className="sync-dot"></span>
            Online · Synced
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} id="logout-btn">
            <span className="logout-icon">🚪</span>
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
}
