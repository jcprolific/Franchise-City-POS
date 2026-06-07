import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  userName: string;
  userRole: string;
  canAccessHq: boolean;
  onLogout: () => void;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function PosIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
      <path d="M7.5 5.5 16.5 10.5" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 3v18h18" />
      <path d="M7 15v-4" />
      <path d="M12 15V7" />
      <path d="M17 15v-6" />
    </svg>
  );
}

function HqIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h.01M12 8h.01M15 8h.01" />
      <path d="M9 12h.01M12 12h.01M15 12h.01" />
      <path d="M10 21v-4h4v4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M15 12H5" />
    </svg>
  );
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
          <span className="nav-icon"><PosIcon /></span>
          POS
        </NavLink>
        <NavLink
          id="nav-inventory"
          className={navClassName}
          to="/inventory"
        >
          <span className="nav-icon"><InventoryIcon /></span>
          Inventory
        </NavLink>
        <NavLink
          id="nav-dashboard"
          className={navClassName}
          to="/dashboard"
        >
          <span className="nav-icon"><DashboardIcon /></span>
          Dashboard
        </NavLink>
        {canAccessHq && (
          <NavLink
            className={navClassName}
            to="/hq"
          >
            <span className="nav-icon"><HqIcon /></span>
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
            <span className="logout-icon"><LogoutIcon /></span>
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
}
