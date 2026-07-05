import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Megaphone,
  BookOpen,
  TrendingUp,
  Video,
  ClipboardList,
  Ticket,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import './ComingSoonPage.css';

const MODULES: Record<string, { icon: LucideIcon; title: string; blurb: string }> = {
  announcements: {
    icon: Megaphone,
    title: 'Announcements',
    blurb: 'News and updates from HQ will appear here.',
  },
  manual: {
    icon: BookOpen,
    title: 'Operations Manual',
    blurb: 'SOPs, recipes, and store guides will live here.',
  },
  reports: {
    icon: TrendingUp,
    title: 'Reports',
    blurb: 'Branch performance reports are on the way.',
  },
  training: {
    icon: Video,
    title: 'Training Videos',
    blurb: 'The staff training library is being prepared.',
  },
  forms: {
    icon: ClipboardList,
    title: 'Download Forms',
    blurb: 'Printable forms and documents will be posted here.',
  },
  support: {
    icon: Ticket,
    title: 'Support Tickets',
    blurb: 'Soon you can raise and track help requests to HQ.',
  },
};

export default function ComingSoonPage() {
  const { module } = useParams();
  const config = module ? MODULES[module] : undefined;

  if (!config) {
    return <Navigate to="/portal" replace />;
  }

  const Icon = config.icon;

  return (
    <div className="portal-soon" id={`portal-soon-${module}`}>
      <div className="portal-soon-card">
        <span className="portal-soon-icon">
          <Icon size={34} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="portal-soon-title">{config.title}</h1>
        <p className="portal-soon-blurb">{config.blurb}</p>
        <span className="portal-soon-badge">Coming Soon</span>
        <Link to="/portal" className="portal-soon-back">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Portal Home
        </Link>
      </div>
    </div>
  );
}
