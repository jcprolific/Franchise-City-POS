import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  BookOpen,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  Video,
  ClipboardList,
  Ticket,
  Monitor,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  resolveFranchiseeBranch,
  type FranchiseeWelcome,
} from '../lib/franchiseeBranch';
import './PortalHubPage.css';

const TILES = [
  { icon: Megaphone, label: 'Announcements', desc: 'News & updates from HQ', to: '/portal/announcements' },
  { icon: BookOpen, label: 'Operations Manual', desc: 'SOPs and guides', to: '/portal/manual' },
  { icon: ShoppingCart, label: 'Order Products', desc: 'Order supplies from HQ', to: '/inventory' },
  { icon: Package, label: 'Inventory', desc: 'Track branch stock', to: '/inventory' },
  { icon: Wallet, label: 'Sales Dashboard', desc: 'Daily sales at a glance', to: '/dashboard' },
  { icon: TrendingUp, label: 'Reports', desc: 'Performance reports', to: '/portal/reports' },
  { icon: Video, label: 'Training Videos', desc: 'Staff training library', to: '/portal/training' },
  { icon: ClipboardList, label: 'Download Forms', desc: 'Printable documents', to: '/portal/forms' },
  { icon: Ticket, label: 'Support Tickets', desc: 'Get help from HQ', to: '/portal/support' },
  { icon: Monitor, label: 'POS Terminal', desc: 'Ring up sales', to: '/pos' },
];

export default function PortalHubPage() {
  const [welcome, setWelcome] = useState<FranchiseeWelcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email ?? '';
      const resolved = await resolveFranchiseeBranch(email);
      if (!cancelled) setWelcome(resolved);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="portal-hub" id="portal-hub">
      <header className="portal-hub-header">
        <h1 className="portal-hub-welcome">
          WELCOME COFTEA CAFE{' '}
          <span className="portal-hub-branch">
            {welcome ? welcome.welcomeName.toUpperCase() : '…'}
          </span>
          !
        </h1>
        <p className="portal-hub-sub">What would you like to do today?</p>
        {welcome && !welcome.isLinked && (
          <p className="portal-hub-note">
            Your account isn&apos;t linked to a branch yet — contact HQ to link it.
          </p>
        )}
      </header>

      <div className="portal-hub-grid">
        {TILES.map(({ icon: Icon, label, desc, to }) => (
          <Link
            key={label}
            to={to}
            className="portal-tile"
            id={`tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="portal-tile-icon">
              <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="portal-tile-label">{label}</span>
            <span className="portal-tile-desc">{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
