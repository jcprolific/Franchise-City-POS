import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, Coffee, Users, Settings, LogOut } from 'lucide-react';
import './AdminSidebar.css';

interface AdminSidebarProps {
  userName: string;
  onLogout: () => void;
}

export default function AdminSidebar({ userName, onLogout }: AdminSidebarProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Global KPI', icon: <LayoutDashboard size={18} /> },
    { path: '/branches', label: 'Branches', icon: <Store size={18} /> },
    { path: '/catalog', label: 'Menu Catalog', icon: <Coffee size={18} /> },
    { path: '/staff', label: 'Staff Directory', icon: <Users size={18} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🌟</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Franchise City HQ</span>
          <span className="sidebar-brand-sub">Admin Portal</span>
        </div>
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
            <span className="sidebar-user-role">Super Admin</span>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={onLogout}>
          <LogOut size={14} className="logout-icon" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
