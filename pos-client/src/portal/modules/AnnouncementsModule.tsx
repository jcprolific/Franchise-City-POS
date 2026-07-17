import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { supabase } from '../../lib/supabase';
import { fetchAnnouncements, type AnnouncementTag, type PortalAnnouncement } from '../../lib/portalService';
import {
  acknowledgeComplianceItem,
  fetchComplianceAcks,
} from '../../lib/complianceService';
import { resolveFranchiseeBranch } from '../../lib/franchiseeBranch';
import PortalLayout, { PortalCard, PortalPlaceholderNote, PortalTag } from '../PortalLayout';
import '../../hq/pages/BranchHealthPage.css';

const TABS: { id: 'all' | AnnouncementTag; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'launch', label: 'Launches' },
  { id: 'campaign', label: 'Campaigns' },
  { id: 'update', label: 'Updates' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function needsAck(item: PortalAnnouncement) {
  return item.requiresAck || item.tag === 'campaign' || item.tag === 'promo';
}

export default function AnnouncementsModule({ defaultTag = 'all' }: { defaultTag?: 'all' | AnnouncementTag }) {
  const { brand } = useBrand();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTag = (searchParams.get('tag') as AnnouncementTag | 'all') || defaultTag;
  const [activeTab, setActiveTab] = useState<'all' | AnnouncementTag>(initialTag);
  const [items, setItems] = useState<PortalAnnouncement[]>([]);
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const tag = activeTab === 'all' ? undefined : activeTab;
      const [{ data: { session } }, data] = await Promise.all([
        supabase.auth.getSession(),
        fetchAnnouncements(brand.dbBrandId, tag),
      ]);
      const email = session?.user?.email ?? '';
      const userId = session?.user?.id;
      const resolved = await resolveFranchiseeBranch(email, userId);
      const resolvedBranchId = resolved.branchId;
      const ackSet = resolvedBranchId
        ? await fetchComplianceAcks(brand.dbBrandId, resolvedBranchId, 'announcement')
        : new Set<string>();

      if (!cancelled) {
        setItems(data);
        setBranchId(resolvedBranchId);
        setAcks(ackSet);
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [brand.dbBrandId, activeTab]);

  const onTab = (id: typeof activeTab) => {
    setActiveTab(id);
    if (id === 'all') searchParams.delete('tag');
    else searchParams.set('tag', id);
    setSearchParams(searchParams, { replace: true });
  };

  const onAck = async (item: PortalAnnouncement) => {
    if (!branchId || acks.has(item.id)) return;
    setSavingId(item.id);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await acknowledgeComplianceItem({
      brandId: brand.dbBrandId,
      branchId,
      refType: 'announcement',
      refId: item.id,
      acknowledgedBy: session?.user?.email ?? undefined,
    });
    setSavingId(null);
    if (!error) {
      setAcks((prev) => new Set(prev).add(item.id));
    }
  };

  const usingFallback = items.some((i) => i.source === 'fallback');

  return (
    <PortalLayout icon={Megaphone} title="Announcements" subtitle="News and updates from HQ">
      {usingFallback && (
        <PortalPlaceholderNote>
          Showing sample or cached announcements. Run supabase-franchise-city-subscription.sql for live HQ posts.
        </PortalPlaceholderNote>
      )}

      <div className="portal-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`portal-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <p className="portal-loading">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <PortalCard><p className="portal-announcement-body">No announcements in this category yet.</p></PortalCard>
      ) : null}

      {items.map((item) => {
        const ackRequired = needsAck(item);
        const acked = acks.has(item.id);
        return (
          <PortalCard key={item.id} className={item.pinned ? 'portal-card--pinned' : ''}>
            <div className="portal-announcement-meta">
              {item.pinned ? <PortalTag variant="pinned">Pinned</PortalTag> : null}
              <PortalTag>{item.tag}</PortalTag>
              <span className="portal-announcement-date">{formatDate(item.publishedAt)}</span>
            </div>
            <h2 className="portal-announcement-title">{item.title}</h2>
            <p className="portal-announcement-body">{item.body}</p>
            {ackRequired && branchId ? (
              <button
                type="button"
                className={`portal-btn-ack${acked ? ' is-done' : ''}`}
                disabled={acked || savingId === item.id}
                onClick={() => void onAck(item)}
              >
                {acked ? 'Acknowledged' : savingId === item.id ? 'Saving…' : 'Acknowledge campaign'}
              </button>
            ) : null}
          </PortalCard>
        );
      })}
    </PortalLayout>
  );
}
