import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  userName: string;
  userRole: string;
  canAccessHq: boolean;
  onLogout: () => void;
}

export default function Sidebar({ userName, userRole, canAccessHq, onLogout }: SidebarProps) {
  const navClassName = ({ isActive }: { isActive: boolean }) =>
    `sidebar-nav-item ${isActive ? 'active' : ''}`;

  return (
    <aside className="sidebar" id="sidebar-nav">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">☕</div>
        <span className="sidebar-brand-name">Franchise City</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          id="nav-pos"
          className={navClassName}
          to="/pos"
        >
          <span className="nav-icon">🖥</span>
          POS
        </NavLink>
        <NavLink
          id="nav-inventory"
          className={navClassName}
          to="/inventory"
        >
          <span className="nav-icon">📦</span>
          Inventory
        </NavLink>
        <NavLink
          id="nav-dashboard"
          className={navClassName}
          to="/dashboard"
        >
          <span className="nav-icon">📊</span>
          Dashboard
        </NavLink>
        {canAccessHq && (
          <NavLink
            className={navClassName}
            to="/hq"
          >
            <span className="nav-icon">🏢</span>
            HQ Portal
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{userName}</span>
            <span className="sidebar-user-role">{userRole}</span>
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
