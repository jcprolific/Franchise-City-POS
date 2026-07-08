import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { fetchAnnouncements, type AnnouncementTag, type PortalAnnouncement } from '../../lib/portalService';
import PortalLayout, { PortalCard, PortalPlaceholderNote, PortalTag } from '../PortalLayout';

const TABS: { id: 'all' | AnnouncementTag; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'launch', label: 'Launches' },
  { id: 'campaign', label: 'Campaigns' },
  { id: 'update', label: 'Updates' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AnnouncementsModule({ defaultTag = 'all' }: { defaultTag?: 'all' | AnnouncementTag }) {
  const { brand } = useBrand();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTag = (searchParams.get('tag') as AnnouncementTag | 'all') || defaultTag;
  const [activeTab, setActiveTab] = useState<'all' | AnnouncementTag>(initialTag);
  const [items, setItems] = useState<PortalAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const tag = activeTab === 'all' ? undefined : activeTab;
      const data = await fetchAnnouncements(brand.dbBrandId, tag);
      if (!cancelled) {
        setItems(data);
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

      {items.map((item) => (
        <PortalCard key={item.id} className={item.pinned ? 'portal-card--pinned' : ''}>
          <div className="portal-announcement-meta">
            {item.pinned ? <PortalTag variant="pinned">Pinned</PortalTag> : null}
            <PortalTag>{item.tag}</PortalTag>
            <span className="portal-announcement-date">{formatDate(item.publishedAt)}</span>
          </div>
          <h2 className="portal-announcement-title">{item.title}</h2>
          <p className="portal-announcement-body">{item.body}</p>
        </PortalCard>
      ))}
    </PortalLayout>
  );
}
