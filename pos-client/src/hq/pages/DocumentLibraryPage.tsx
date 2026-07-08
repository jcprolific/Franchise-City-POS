import { useCallback, useEffect, useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import {
  createDocument,
  deleteDocument,
  fetchDocuments,
  type PortalDocType,
  type PortalDocument,
} from '../../lib/portalService';

export default function DocumentLibraryPage() {
  const { brand } = useBrand();
  const [docType, setDocType] = useState<PortalDocType>('manual');
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [section, setSection] = useState('');

  const reload = useCallback(async () => {
    setDocs(await fetchDocuments(brand.dbBrandId, docType));
  }, [brand.dbBrandId, docType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createDocument({
      brandId: brand.dbBrandId,
      docType,
      title,
      description,
      fileUrl: fileUrl || undefined,
      section: section || undefined,
    });
    setTitle('');
    setDescription('');
    setFileUrl('');
    setSection('');
    await reload();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Document Library</h1>
          <p>Manuals, forms, training, and business resources for franchisees.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['manual', 'form', 'training', 'resource'] as PortalDocType[]).map((t) => (
          <button key={t} type="button" className={docType === t ? 'btn-primary' : ''} onClick={() => setDocType(t)}>
            {t}
          </button>
        ))}
      </div>

      <form className="admin-table-container" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }} onSubmit={(e) => void handleCreate(e)}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input placeholder="File URL (Supabase Storage)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
        <input placeholder="Section (optional)" value={section} onChange={(e) => setSection(e.target.value)} />
        <button type="submit" className="btn-primary">Add document</button>
      </form>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Section</th><th>URL</th><th /></tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.title}</td>
                <td>{doc.section ?? '—'}</td>
                <td>{doc.fileUrl ? 'Linked' : 'Placeholder'}</td>
                <td><button type="button" onClick={() => void deleteDocument(doc.id).then(reload)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
