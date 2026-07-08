import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import './PortalLayout.css';

interface PortalLayoutProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export default function PortalLayout({ title, subtitle, icon: Icon, children }: PortalLayoutProps) {
  return (
    <div className="portal-page">
      <header className="portal-page-header">
        <Link to="/portal" className="portal-page-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Portal Home
        </Link>
        <div className="portal-page-title-row">
          <span className="portal-page-icon">
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="portal-page-title-text">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <div className="portal-page-body">{children}</div>
    </div>
  );
}

export function PortalPlaceholderNote({ children }: { children: ReactNode }) {
  return <p className="portal-placeholder-note">{children}</p>;
}

export function PortalCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`portal-card ${className}`.trim()}>{children}</article>;
}

export function PortalTag({
  children,
  variant = 'default',
}: {
  children: ReactNode;
  variant?: 'default' | 'pinned' | 'open' | 'resolved' | 'soon';
}) {
  return <span className={`portal-tag portal-tag--${variant}`}>{children}</span>;
}
