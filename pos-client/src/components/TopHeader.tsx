import { useCallback, useEffect, useRef, useState } from 'react';
import {
  enableOwnerSaleNotifications,
  getNotificationPermission,
  isPushSupported,
  maintainOwnerPushSubscription,
} from '../lib/pushNotifications';
import './TopHeader.css';

interface TopHeaderProps {
  franchiseName: string;
  brandName: string;
  logoUrl: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  cashierName: string;
  roleLabel?: string;
  attendanceStatus: 'IN' | 'OUT';
  onToggleAttendance: () => void;
  onLogout: () => void;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'G';
}

function pushErrorMessage(reason: string): string {
  switch (reason) {
    case 'ios_not_standalone':
      return 'Open the app from your Home Screen icon, then try again.';
    case 'denied':
      return 'Notifications are blocked in device settings.';
    case 'missing_public_key':
      return 'Push is not configured yet. Contact HQ.';
    case 'unsupported':
      return 'This device does not support push notifications.';
    default:
      return `Could not enable notifications (${reason}).`;
  }
}

export default function TopHeader({
  franchiseName,
  brandName,
  logoUrl,
  title,
  subtitle,
  dateLabel,
  cashierName,
  roleLabel = 'Cashier',
  attendanceStatus,
  onToggleAttendance,
  onLogout,
}: TopHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const refreshPushStatus = useCallback(async () => {
    if (!isPushSupported()) {
      setPushEnabled(false);
      return;
    }
    const permission = await getNotificationPermission();
    if (permission === 'granted') {
      void maintainOwnerPushSubscription();
      setPushEnabled(true);
      return;
    }
    setPushEnabled(false);
  }, []);

  useEffect(() => {
    void refreshPushStatus();
  }, [refreshPushStatus]);

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

  const handleEnableNotifications = async () => {
    setPushBusy(true);
    setPushMessage('');
    const result = await enableOwnerSaleNotifications();
    setPushBusy(false);
    if (result.ok) {
      setPushEnabled(true);
      setPushMessage('Sale notifications are on.');
      return;
    }
    setPushMessage(pushErrorMessage(result.reason));
    await refreshPushStatus();
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
                <span className="top-header-profile-menu-role">{roleLabel}</span>
              </div>

              <button
                type="button"
                className={`top-header-profile-menu-item top-header-profile-menu-item--neutral${pushEnabled ? ' is-enabled' : ''}`}
                role="menuitem"
                id="enable-notifications-btn"
                disabled={pushBusy}
                onClick={() => void handleEnableNotifications()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {pushBusy
                  ? 'Enabling…'
                  : pushEnabled
                    ? 'Notifications on'
                    : 'Enable notifications'}
              </button>
              {pushMessage && (
                <p className="top-header-profile-menu-note" role="status">
                  {pushMessage}
                </p>
              )}

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
