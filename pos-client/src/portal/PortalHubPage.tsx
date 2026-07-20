import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Megaphone,
  BookOpen,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  Video,
  ClipboardList,
  FileText,
  Ticket,
  Monitor,
  ArrowRight,
  Sparkles,
  FolderOpen,
  History,
  Tag,
  MapPin,
  CalendarDays,
  Users,
  Building2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  hasPermission,
  isFranchiseOwner,
  type UserRole,
} from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { useBrand } from '../context/BrandContext';
import {
  fetchActiveSystemNotices,
  fetchAnnouncements,
  type PortalAnnouncement,
  type SystemNotice,
} from '../lib/portalService';
import {
  resolveFranchiseeBranch,
  type FranchiseeWelcome,
} from '../lib/franchiseeBranch';
import { BRANCH_UPDATED_EVENT } from '../lib/branchContext';
import PortalHealthWidget from './PortalHealthWidget';
import BranchStaffPresence from './BranchStaffPresence';
import './PortalHubPage.css';

type TileAccent = 'news' | 'ops' | 'support' | 'sales';

interface PortalTile {
  icon: LucideIcon;
  label: string;
  desc: string;
  to: string;
  accent: TileAccent;
}

interface PortalSection {
  id: string;
  label: string;
  subtitle: string;
  tiles: PortalTile[];
}

const QUICK_ACTIONS = [
  { icon: FileText, label: 'EOD Report', desc: 'Submit daily sales', to: '/eod-report' },
  { icon: Monitor, label: 'Open POS', desc: 'Ring up sales', to: '/pos' },
  { icon: Package, label: 'Inventory', desc: 'Stock & reorder', to: '/inventory' },
  { icon: TrendingUp, label: 'Reports', desc: 'Branch analytics', to: '/portal/reports' },
  { icon: Ticket, label: 'Get Help', desc: 'Submit a ticket', to: '/portal/support' },
] as const;

const SECTIONS: PortalSection[] = [
  {
    id: 'hq',
    label: 'Franchise Portal',
    subtitle: 'HQ updates, guides, and franchise resources',
    tiles: [
      { icon: Megaphone, label: 'Announcements', desc: 'Official updates from HQ', to: '/portal/announcements', accent: 'news' },
      { icon: Sparkles, label: 'Product Launches', desc: 'New menu & products', to: '/portal/launches', accent: 'news' },
      { icon: Tag, label: 'Promo Campaigns', desc: 'Active promotions', to: '/portal/campaigns', accent: 'news' },
      { icon: BookOpen, label: 'Operations Manual', desc: 'SOPs and guides', to: '/portal/manual', accent: 'ops' },
      { icon: ClipboardList, label: 'Download Forms', desc: 'Printable documents', to: '/portal/forms', accent: 'ops' },
      { icon: FolderOpen, label: 'Business Resources', desc: 'Brand assets & guides', to: '/portal/resources', accent: 'ops' },
      { icon: Video, label: 'Training Materials', desc: 'Staff training library', to: '/portal/training', accent: 'ops' },
      { icon: ShoppingCart, label: 'Product Ordering', desc: 'Order supplies from HQ', to: '/inventory', accent: 'support' },
      { icon: History, label: 'Order History', desc: 'Past supply orders', to: '/portal/orders', accent: 'support' },
      { icon: Ticket, label: 'Technical Support', desc: 'Help & troubleshooting', to: '/portal/support', accent: 'support' },
    ],
  },
  {
    id: 'store',
    label: 'Sales & Inventory',
    subtitle: 'Daily store operations and performance',
    tiles: [
      { icon: Monitor, label: 'POS Terminal', desc: 'Record sales transactions', to: '/pos', accent: 'sales' },
      { icon: Package, label: 'Inventory', desc: 'Stock monitoring & adjustments', to: '/inventory', accent: 'sales' },
      { icon: Wallet, label: 'Sales Dashboard', desc: 'Daily sales at a glance', to: '/dashboard', accent: 'sales' },
      { icon: FileText, label: 'End of Day Report', desc: 'Submit daily sales summary', to: '/eod-report', accent: 'sales' },
      { icon: TrendingUp, label: 'Business Reports', desc: 'Daily, weekly, monthly reports', to: '/portal/reports', accent: 'sales' },
    ],
  },
];

function tileId(label: string) {
  return `tile-${label.toLowerCase().replace(/\s+/g, '-')}`;
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatAnnouncementDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

interface PortalHubPageProps {
  userRole: UserRole;
}

export default function PortalHubPage({ userRole }: PortalHubPageProps) {
  const { brand } = useBrand();
  const location = useLocation();
  const [welcome, setWelcome] = useState<FranchiseeWelcome | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [spotlight, setSpotlight] = useState<PortalAnnouncement | null>(null);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadWelcome = useCallback(async () => {
    setLoading(true);
    const [{ data: { session } }, systemNotices, announcements] = await Promise.all([
      supabase.auth.getSession(),
      fetchActiveSystemNotices(brand.dbBrandId),
      fetchAnnouncements(brand.dbBrandId),
    ]);
    const email = session?.user?.email ?? '';
    const userId = session?.user?.id;
    const resolved = await resolveFranchiseeBranch(email, userId);
    setUserEmail(email);
    setWelcome(resolved);
    setNotices(systemNotices);
    setAnnouncementCount(announcements.length);
    setSpotlight(announcements.find((a) => a.pinned) ?? announcements[0] ?? null);
    setLoading(false);
  }, [brand.dbBrandId]);

  useEffect(() => {
    void loadWelcome();
  }, [loadWelcome, location.pathname]);

  useEffect(() => {
    const onBranchUpdated = () => {
      void loadWelcome();
    };
    window.addEventListener(BRANCH_UPDATED_EVENT, onBranchUpdated);
    return () => window.removeEventListener(BRANCH_UPDATED_EVENT, onBranchUpdated);
  }, [loadWelcome]);

  const displayName = useMemo(() => {
    if (welcome?.isLinked) return welcome.welcomeName;
    return brand.franchiseName;
  }, [welcome, brand.franchiseName]);

  const locationLabel = useMemo(() => {
    if (welcome?.isLinked && welcome.locationLabel) return welcome.locationLabel;
    return brand.franchiseName;
  }, [welcome, brand.franchiseName]);

  const showLinkWarning = Boolean(welcome && !welcome.isLinked && userEmail);

  const ownerTiles: PortalTile[] = isFranchiseOwner(userRole)
    ? [
        { icon: Users, label: 'Manage Staff', desc: 'Create barista accounts for your store', to: '/portal/staff', accent: 'ops' },
        { icon: Building2, label: 'Business Information', desc: 'Update branch contact & business details', to: '/portal/business', accent: 'ops' },
      ]
    : [];

  const filteredSections = SECTIONS.map((section) => ({
    ...section,
    tiles: section.tiles.filter((tile) => {
      if (tile.to === '/portal/reports') return hasPermission(userRole, 'portal_reports');
      if (tile.to === '/portal/manual' || tile.to === '/portal/forms' || tile.to === '/portal/resources' || tile.to === '/portal/training') {
        return hasPermission(userRole, 'portal_manual');
      }
      if (tile.to === '/portal/orders') return hasPermission(userRole, 'portal_orders');
      if (tile.to === '/pos') return hasPermission(userRole, 'pos');
      if (tile.to === '/inventory') return hasPermission(userRole, 'inventory') || hasPermission(userRole, 'inventory_view');
      if (tile.to === '/dashboard' || tile.to === '/eod-report') return hasPermission(userRole, 'dashboard');
      return hasPermission(userRole, 'portal');
    }),
  }));

  const sectionsWithOwner = filteredSections.map((section, idx) =>
    idx === 0 ? { ...section, tiles: [...ownerTiles, ...section.tiles] } : section
  );

  const quickActions = QUICK_ACTIONS.filter((action) => {
    if (action.to === '/eod-report') return hasPermission(userRole, 'dashboard');
    if (action.to === '/pos') return hasPermission(userRole, 'pos');
    if (action.to === '/inventory') return hasPermission(userRole, 'inventory') || hasPermission(userRole, 'inventory_view');
    if (action.to === '/portal/reports') return hasPermission(userRole, 'portal_reports');
    return hasPermission(userRole, 'portal');
  });

  let tileIndex = 0;

  return (
    <div className="portal-hub" id="portal-hub">
      {notices.map((n) => (
        <div key={n.id} className={`portal-hub-notice portal-hub-notice--${n.noticeType}`} role="status">
          <strong>{n.title}</strong> — {n.body}
        </div>
      ))}

      <header className="portal-hub-hero">
        <div className="portal-hub-hero-main">
          <span className="portal-hub-badge">
            <Sparkles size={12} aria-hidden="true" />
            Franchise Owner Portal
          </span>
          <h1 className="portal-hub-welcome">
            Welcome,{' '}
            {loading ? (
              <span className="portal-hub-name-skeleton" aria-hidden="true" />
            ) : (
              <span className="portal-hub-branch">{displayName}</span>
            )}
            <span className="portal-hub-period">.</span>
          </h1>
          <p className="portal-hub-sub">
            {loading ? 'What would you like to do today?' : locationLabel}
          </p>

          <div className="portal-hub-meta">
            <span className="portal-hub-chip">
              <MapPin size={13} aria-hidden="true" />
              {loading ? brand.franchiseName : locationLabel}
            </span>
            <span className="portal-hub-chip">
              <CalendarDays size={13} aria-hidden="true" />
              {formatTodayLabel()}
            </span>
            {!loading && announcementCount > 0 && (
              <span className="portal-hub-chip portal-hub-chip--accent">
                <Megaphone size={13} aria-hidden="true" />
                {announcementCount} update{announcementCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {showLinkWarning && (
            <p className="portal-hub-note" role="status">
              Your account isn&apos;t linked to a branch yet — contact HQ to link it.
            </p>
          )}
        </div>

        {spotlight && (
          <Link to="/portal/announcements" className="portal-hub-spotlight">
            <span className="portal-hub-spotlight-label">
              {spotlight.pinned ? 'Pinned update' : 'Latest from HQ'}
            </span>
            <strong className="portal-hub-spotlight-title">{spotlight.title}</strong>
            <p className="portal-hub-spotlight-body">{spotlight.body}</p>
            <span className="portal-hub-spotlight-foot">
              {formatAnnouncementDate(spotlight.publishedAt)}
              <ArrowRight size={14} aria-hidden="true" />
            </span>
          </Link>
        )}
      </header>

      <PortalHealthWidget branchId={welcome?.branchId ?? null} />
      <BranchStaffPresence branchId={welcome?.branchId ?? null} />

      <nav className="portal-hub-quick" aria-label="Quick actions">
        {quickActions.map(({ icon: Icon, label, desc, to }) => (
          <Link key={label} to={to} className="portal-hub-quick-item">
            <span className="portal-hub-quick-icon">
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="portal-hub-quick-text">
              <strong>{label}</strong>
              <span>{desc}</span>
            </span>
            <Zap size={14} className="portal-hub-quick-bolt" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="portal-hub-sections">
        {sectionsWithOwner.map((section) => (
          <section
            key={section.id}
            className="portal-hub-section"
            data-section={section.id}
            aria-labelledby={`portal-section-${section.id}`}
          >
            <div className="portal-hub-section-head">
              <h2 className="portal-hub-section-title" id={`portal-section-${section.id}`}>
                {section.label}
              </h2>
              <p className="portal-hub-section-sub">{section.subtitle}</p>
            </div>
            <div className="portal-hub-grid">
              {section.tiles.map(({ icon: Icon, label, desc, to, accent }) => {
                const delay = tileIndex++;
                return (
                  <Link
                    key={label}
                    to={to}
                    className={`portal-tile portal-tile--${accent}`}
                    style={{ animationDelay: `${delay * 35}ms` }}
                    id={tileId(label)}
                  >
                    <span className="portal-tile-icon">
                      <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="portal-tile-body">
                      <span className="portal-tile-label">{label}</span>
                      <span className="portal-tile-desc">{desc}</span>
                    </span>
                    <span className="portal-tile-arrow" aria-hidden="true">
                      <ArrowRight size={16} strokeWidth={2.25} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
