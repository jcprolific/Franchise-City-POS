import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  hasPermission,
  isPortalRole,
  type Capability,
  type UserRole,
} from '../lib/permissions';
import './Sidebar.css';

interface SidebarProps {
  userName: string;
  userRole: string;
  role: UserRole;
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

function OrdersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function PromotionsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3.5 12 12 3.5h6.5V10L10 18.5 3.5 12Z" />
      <circle cx="15.5" cy="8.5" r="1.2" />
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

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BusinessIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9h.01M9 13h.01M9 17h.01" />
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

interface NavItem {
  id: string;
  to: string;
  label: string;
  icon: ReactNode;
  capability: Capability;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'nav-portal', to: '/portal', label: 'Portal Home', icon: <HomeIcon />, capability: 'portal' },
  { id: 'nav-staff', to: '/portal/staff', label: 'Manage Staff', icon: <StaffIcon />, capability: 'portal_staff' },
  { id: 'nav-business', to: '/portal/business', label: 'Business Info', icon: <BusinessIcon />, capability: 'portal_business' },
  { id: 'nav-dashboard', to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, capability: 'dashboard' },
  { id: 'nav-pos', to: '/pos', label: 'POS', icon: <PosIcon />, capability: 'pos' },
  { id: 'nav-orders', to: '/orders', label: 'Orders', icon: <OrdersIcon />, capability: 'orders' },
  { id: 'nav-inventory', to: '/inventory', label: 'Inventory', icon: <InventoryIcon />, capability: 'inventory' },
  { id: 'nav-promotions', to: '/promotions', label: 'Promotions', icon: <PromotionsIcon />, capability: 'promotions' },
];

function navItemsForRole(role: UserRole): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => {
    if (item.capability === 'inventory') {
      return hasPermission(role, 'inventory') || hasPermission(role, 'inventory_view');
    }
    return hasPermission(role, item.capability);
  });
}

export default function Sidebar({ userName, userRole, role, canAccessHq, onLogout }: SidebarProps) {
  const navClassName = ({ isActive }: { isActive: boolean }) =>
    `sidebar-nav-item ${isActive ? 'active' : ''}`;

  const items = navItemsForRole(role);
  const portalFirst = isPortalRole(role);

  const sorted = portalFirst
    ? [...items].sort((a, b) => {
        const aPortal = a.to.startsWith('/portal') ? 0 : 1;
        const bPortal = b.to.startsWith('/portal') ? 0 : 1;
        return aPortal - bPortal;
      })
    : items;

  return (
    <aside className="sidebar" id="sidebar-nav">
      <nav className="sidebar-nav">
        {sorted.map((item) => (
          <NavLink key={item.id} id={item.id} className={navClassName} to={item.to}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {canAccessHq && (
          <NavLink className={navClassName} to="/hq">
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
