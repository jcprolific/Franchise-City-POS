import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Megaphone,
  Pin,
  Plus,
  Rocket,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  type AnnouncementTag,
  type PortalAnnouncement,
} from '../../lib/portalService';
import './PortalContentPage.css';

const TAGS: { key: AnnouncementTag; label: string }[] = [
  { key: 'update', label: 'Update' },
  { key: 'launch', label: 'Launch' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'promo', label: 'Promo' },
  { key: 'policy', label: 'Policy' },
  { key: 'reminder', label: 'Reminder' },
];

function initials(title: string) {
  return title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function PortalContentPage() {
  const { brand } = useBrand();
  const [items, setItems] = useState<PortalAnnouncement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<AnnouncementTag>('update');
  const [pinned, setPinned] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<AnnouncementTag | 'all'>('all');

  const reload = useCallback(async () => {
    setItems(await fetchAnnouncements(brand.dbBrandId));
  }, [brand.dbBrandId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createAnnouncement({ brandId: brand.dbBrandId, title, body, tag, pinned });
    setTitle('');
    setBody('');
    setPinned(false);
    setShowForm(false);
    await reload();
  };

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.tag === filter)),
    [items, filter]
  );

  const pinnedCount = items.filter((i) => i.pinned).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Portal Content</h1>
          <p>Publish announcements, launches, and campaigns to franchisees.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Close' : 'New announcement'}
        </button>
      </div>

      <div className="pc-kpi-row">
        <div className="pc-kpi-card">
          <span className="pc-kpi-icon pc-kpi-icon--amber">
            <Megaphone size={18} />
          </span>
          <div className="pc-kpi-body">
            <span className="pc-kpi-label">Published</span>
            <span className="pc-kpi-value">{items.length}</span>
          </div>
        </div>
        <div className="pc-kpi-card">
          <span className="pc-kpi-icon pc-kpi-icon--blue">
            <Pin size={18} />
          </span>
          <div className="pc-kpi-body">
            <span className="pc-kpi-label">Pinned</span>
            <span className="pc-kpi-value">{pinnedCount}</span>
          </div>
        </div>
        <div className="pc-kpi-card">
          <span className="pc-kpi-icon pc-kpi-icon--green">
            <Rocket size={18} />
          </span>
          <div className="pc-kpi-body">
            <span className="pc-kpi-label">Launches</span>
            <span className="pc-kpi-value">{items.filter((i) => i.tag === 'launch').length}</span>
          </div>
        </div>
        <div className="pc-kpi-card">
          <span className="pc-kpi-icon pc-kpi-icon--purple">
            <Sparkles size={18} />
          </span>
          <div className="pc-kpi-body">
            <span className="pc-kpi-label">Promos</span>
            <span className="pc-kpi-value">{items.filter((i) => i.tag === 'promo').length}</span>
          </div>
        </div>
      </div>

      {showForm && (
        <form className="pc-form" onSubmit={(e) => void handleCreate(e)}>
          <div className="pc-form-heading">
            <h2>New announcement</h2>
          </div>
          <label className="pc-field">
            <span>Title</span>
            <input placeholder="e.g. Summer Duo Promo — July 8–31" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="pc-field">
            <span>Body</span>
            <textarea placeholder="Write the announcement details…" value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
          </label>
          <div className="pc-form-row">
            <div className="pc-tag-picker">
              {TAGS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`pc-tag-chip pc-tag-${t.key}${tag === t.key ? ' is-active' : ''}`}
                  onClick={() => setTag(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="pc-pin-toggle">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              <Pin size={14} /> Pin to top
            </label>
          </div>
          <div className="pc-form-footer">
            <button type="button" className="pc-cancel-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} /> Publish
            </button>
          </div>
        </form>
      )}

      <div className="pc-filter-bar">
        <button
          type="button"
          className={`pc-filter-chip${filter === 'all' ? ' is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <Tag size={13} /> All
        </button>
        {TAGS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`pc-filter-chip${filter === t.key ? ' is-active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="pc-empty">
          <Megaphone size={28} />
          <p>No announcements yet. Publish one to reach your franchisees.</p>
        </div>
      ) : (
        <div className="pc-feed">
          {visible.map((item) => (
            <article key={item.id} className={`pc-card${item.pinned ? ' is-pinned' : ''}`}>
              <span className={`pc-card-avatar pc-tag-${item.tag}`}>{initials(item.title)}</span>
              <div className="pc-card-body">
                <div className="pc-card-head">
                  <h3>{item.title}</h3>
                  <div className="pc-card-meta">
                    {item.pinned && (
                      <span className="pc-pinned-badge">
                        <Pin size={11} /> Pinned
                      </span>
                    )}
                    <span className={`pc-tag-badge pc-tag-${item.tag}`}>{item.tag}</span>
                  </div>
                </div>
                <p className="pc-card-text">{item.body}</p>
                <div className="pc-card-footer">
                  <span className="pc-card-date">
                    {new Date(item.publishedAt).toLocaleDateString('en-PH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {item.source === 'fallback' ? (
                    <span className="pc-sample-tag">Sample</span>
                  ) : (
                    <button
                      type="button"
                      className="pc-delete-btn"
                      onClick={() => void deleteAnnouncement(item.id).then(reload)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
