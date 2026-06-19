import { useCallback, useEffect, useRef, useState } from 'react';
import './TopHeader.css';

interface TopHeaderProps {
  franchiseName: string;
  brandName: string;
  logoUrl: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  cashierName: string;
  attendanceStatus: 'IN' | 'OUT';
  onToggleAttendance: () => void;
  onLogout: () => void;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'G';
}

export default function TopHeader({
  franchiseName,
  brandName,
  logoUrl,
  title,
  subtitle,
  dateLabel,
  cashierName,
  attendanceStatus,
  onToggleAttendance,
  onLogout,
}: TopHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  return (
    <header className="top-header" id="top-header">
      <div className="top-header-brand">
        <div className="top-header-brand-text">
          <span className="top-header-eyebrow">Franchise</span>
          <span className="top-header-franchise">{franchiseName}</span>
        </div>
      </div>

      <div className="top-header-title-zone">
        <img
          src={logoUrl}
          alt={brandName}
          className="top-header-brand-logo"
        />
        <div className="top-header-title-text">
          <span className="top-header-title">{title}</span>
          <span className="top-header-subtitle">{subtitle}</span>
        </div>
      </div>

      <div className="top-header-meta">
        <div className="top-header-meta-block">
          <span className="top-header-meta-label">Today</span>
          <span className="top-header-meta-value">{dateLabel}</span>
        </div>
        <div className="top-header-meta-block">
          <span className="top-header-meta-label">Cashier</span>
          <span className="top-header-meta-value">{cashierName}</span>
        </div>
        <button
          type="button"
          className={`top-header-time-btn ${attendanceStatus === 'IN' ? 'is-in' : 'is-out'}`}
          onClick={onToggleAttendance}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {attendanceStatus === 'IN' ? 'Time out' : 'Time in'}
        </button>
        <div className="top-header-profile" ref={menuRef}>
          <button
            type="button"
            className="top-header-avatar"
            aria-label={`${cashierName} profile menu`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {getInitial(cashierName)}
          </button>
          {menuOpen && (
            <div className="top-header-profile-menu" role="menu">
              <div className="top-header-profile-menu-header">
                <span className="top-header-profile-menu-name">{cashierName}</span>
                <span className="top-header-profile-menu-role">Cashier</span>
              </div>
              <button
                type="button"
                className="top-header-profile-menu-item"
                role="menuitem"
                onClick={handleLogout}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
