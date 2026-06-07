import './TopHeader.css';

interface TopHeaderProps {
  franchiseName: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  cashierName: string;
  attendanceStatus: 'IN' | 'OUT';
  onToggleAttendance: () => void;
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'G';
}

export default function TopHeader({
  franchiseName,
  title,
  subtitle,
  dateLabel,
  cashierName,
  attendanceStatus,
  onToggleAttendance,
}: TopHeaderProps) {
  return (
    <header className="top-header" id="top-header">
      <div className="top-header-brand">
        <div className="top-header-logo" aria-hidden="true">
          <span>🍟</span>
        </div>
        <div className="top-header-brand-text">
          <span className="top-header-eyebrow">Franchise</span>
          <span className="top-header-franchise">{franchiseName}</span>
        </div>
      </div>

      <div className="top-header-title-zone">
        <div className="top-header-mascot" aria-hidden="true">
          <span>🥔</span>
        </div>
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
        <div className="top-header-avatar" aria-hidden="true">
          {getInitial(cashierName)}
        </div>
      </div>
    </header>
  );
}
