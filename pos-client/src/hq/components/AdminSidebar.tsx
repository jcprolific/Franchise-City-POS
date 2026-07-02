import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
  Users,
  Warehouse,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import './AdminSidebar.css';

interface AdminSidebarProps {
  userName: string;
  onLogout: () => void;
}

export default function AdminSidebar({ userName, onLogout }: AdminSidebarProps) {
  const location = useLocation();
  const { brand } = useBrand();

  const navItems = [
    { path: '/hq', label: 'Network Overview', icon: <LayoutDashboard size={18} /> },
    { path: '/hq/branches', label: 'Franchisees', icon: <Store size={18} /> },
    { path: '/hq/supply-orders', label: 'Supply Orders', icon: <ClipboardList size={18} /> },
    { path: '/hq/warehouse', label: 'Warehouse', icon: <Warehouse size={18} /> },
    { path: '/hq/suppliers', label: 'Suppliers', icon: <Handshake size={18} /> },
    { path: '/hq/catalog', label: 'Menu Catalog', icon: <BookOpen size={18} /> },
    { path: '/hq/staff', label: 'Staff Directory', icon: <Users size={18} /> },
    { path: '/hq/reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} /> },
    { path: '/hq/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <img src={brand.logoUrl} alt={brand.name} />
        </div>
        <span className="sidebar-brand-name">{brand.name} HQ</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{userName}</span>
            <span className="sidebar-user-role">
              {userName.includes('Demo') ? 'Coftea HQ Demo' : 'HQ Admin'}
            </span>
          </div>
        </div>
        <div className="sidebar-footer-actions">
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <LogOut size={14} className="logout-icon" />
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
}
