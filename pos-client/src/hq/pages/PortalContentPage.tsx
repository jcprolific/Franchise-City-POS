import { useCallback, useEffect, useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  type AnnouncementTag,
  type PortalAnnouncement,
} from '../../lib/portalService';

export default function PortalContentPage() {
  const { brand } = useBrand();
  const [items, setItems] = useState<PortalAnnouncement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<AnnouncementTag>('update');
  const [pinned, setPinned] = useState(false);

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
    await reload();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Portal Content</h1>
          <p>Publish announcements, launches, and campaigns to franchisees.</p>
        </div>
      </div>

      <form className="admin-table-container" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => void handleCreate(e)}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required />
        <select value={tag} onChange={(e) => setTag(e.target.value as AnnouncementTag)}>
          <option value="update">Update</option>
          <option value="launch">Launch</option>
          <option value="campaign">Campaign</option>
          <option value="promo">Promo</option>
          <option value="policy">Policy</option>
          <option value="reminder">Reminder</option>
        </select>
        <label><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top</label>
        <button type="submit" className="btn-primary">Publish</button>
      </form>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Tag</th><th>Date</th><th /></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.tag}</td>
                <td>{new Date(item.publishedAt).toLocaleDateString('en-PH')}</td>
                <td>
                  <button type="button" onClick={() => void deleteAnnouncement(item.id).then(reload)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
