import { useCallback, useEffect, useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import {
  createSystemNotice,
  fetchAllSystemNotices,
  type SystemNotice,
} from '../../lib/portalService';

export default function SystemNoticesPage() {
  const { brand } = useBrand();
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [noticeType, setNoticeType] = useState<SystemNotice['noticeType']>('update');

  const reload = useCallback(async () => {
    setNotices(await fetchAllSystemNotices(brand.dbBrandId));
  }, [brand.dbBrandId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    await createSystemNotice({ brandId: brand.dbBrandId, title, body, noticeType });
    setTitle('');
    setBody('');
    await reload();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>System Notices</h1>
          <p>Software updates, maintenance windows, and security advisories.</p>
        </div>
      </div>

      <form className="admin-table-container" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => void handleCreate(e)}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required />
        <select value={noticeType} onChange={(e) => setNoticeType(e.target.value as SystemNotice['noticeType'])}>
          <option value="update">Software update</option>
          <option value="maintenance">Maintenance</option>
          <option value="security">Security</option>
        </select>
        <button type="submit" className="btn-primary">Publish notice</button>
      </form>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Type</th><th>Title</th><th>Active from</th></tr>
          </thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id}>
                <td>{n.noticeType}</td>
                <td>{n.title}</td>
                <td>{new Date(n.activeFrom).toLocaleString('en-PH')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
