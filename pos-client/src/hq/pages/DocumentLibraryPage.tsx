import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Layers,
  Link2,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  createDocument,
  deleteDocument,
  fetchDocuments,
  type PortalDocType,
  type PortalDocument,
} from '../../lib/portalService';
import './DocumentLibraryPage.css';

const DOC_TYPES: { key: PortalDocType; label: string; icon: typeof BookOpen; blurb: string }[] = [
  { key: 'manual', label: 'Manuals', icon: BookOpen, blurb: 'Standard operating procedures' },
  { key: 'form', label: 'Forms', icon: ClipboardList, blurb: 'Printable & downloadable sheets' },
  { key: 'training', label: 'Training', icon: GraduationCap, blurb: 'Onboarding & video guides' },
  { key: 'resource', label: 'Resources', icon: Layers, blurb: 'Marketing & business assets' },
];

function formatIcon(format: string) {
  const f = format.toLowerCase();
  if (f.includes('video')) return Video;
  return FileText;
}

export default function DocumentLibraryPage() {
  const { brand } = useBrand();
  const [docType, setDocType] = useState<PortalDocType>('manual');
  const [docs, setDocs] = useState<PortalDocument[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(false);
    await reload();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        (d.section ?? '').toLowerCase().includes(q)
    );
  }, [docs, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PortalDocument[]>();
    for (const doc of filtered) {
      const key = doc.section ?? 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const linkedCount = docs.filter((d) => d.fileUrl).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Document Library</h1>
          <p>Manuals, forms, training, and business resources for franchisees.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Close' : 'Add document'}
        </button>
      </div>

      <div className="doc-type-grid">
        {DOC_TYPES.map((t) => {
          const Icon = t.icon;
          const active = docType === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`doc-type-card${active ? ' is-active' : ''}`}
              onClick={() => setDocType(t.key)}
            >
              <span className="doc-type-icon">
                <Icon size={20} />
              </span>
              <span className="doc-type-body">
                <span className="doc-type-label">{t.label}</span>
                <span className="doc-type-blurb">{t.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {showForm && (
        <form className="doc-form" onSubmit={(e) => void handleCreate(e)}>
          <div className="doc-form-heading">
            <h2>
              New {DOC_TYPES.find((t) => t.key === docType)?.label.replace(/s$/, '')} document
            </h2>
          </div>
          <div className="doc-form-grid">
            <label className="doc-field doc-field-wide">
              <span>Title</span>
              <input placeholder="e.g. Store Opening Checklist" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="doc-field doc-field-wide">
              <span>Description</span>
              <input placeholder="Short summary of the document" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="doc-field">
              <span>Section</span>
              <input placeholder="e.g. Opening & Closing" value={section} onChange={(e) => setSection(e.target.value)} />
            </label>
            <label className="doc-field">
              <span>File URL (Supabase Storage)</span>
              <input placeholder="https://…" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
            </label>
          </div>
          <div className="doc-form-footer">
            <button type="button" className="doc-cancel-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} /> Add document
            </button>
          </div>
        </form>
      )}

      <div className="doc-toolbar">
        <div className="doc-search">
          <Search size={16} className="doc-search-icon" />
          <input
            className="doc-search-input"
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="doc-stats">
          <span className="doc-stat-pill">{docs.length} total</span>
          <span className="doc-stat-pill doc-stat-pill--linked">{linkedCount} linked</span>
          <span className="doc-stat-pill doc-stat-pill--muted">{docs.length - linkedCount} placeholder</span>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="doc-empty">
          <FileText size={28} />
          <p>No documents found. Add one to get started.</p>
        </div>
      ) : (
        grouped.map(([sectionName, items]) => (
          <section key={sectionName} className="doc-section">
            <div className="doc-section-head">
              <h3>{sectionName}</h3>
              <span className="doc-section-count">{items.length}</span>
            </div>
            <div className="doc-card-grid">
              {items.map((doc) => {
                const Icon = formatIcon(doc.format);
                return (
                  <article key={doc.id} className="doc-card">
                    <span className="doc-card-icon">
                      <Icon size={18} />
                    </span>
                    <div className="doc-card-body">
                      <div className="doc-card-title-row">
                        <h4>{doc.title}</h4>
                        <span className="doc-format-badge">{doc.format}</span>
                      </div>
                      {doc.description && <p className="doc-card-desc">{doc.description}</p>}
                      <div className="doc-card-footer">
                        {doc.fileUrl ? (
                          <a className="doc-card-link" href={doc.fileUrl} target="_blank" rel="noreferrer">
                            <Download size={14} /> Open file
                          </a>
                        ) : (
                          <span className="doc-card-link doc-card-link--muted">
                            <Link2 size={14} /> No file linked
                          </span>
                        )}
                        {doc.source === 'fallback' ? (
                          <span className="doc-sample-tag">Sample</span>
                        ) : (
                          <button
                            type="button"
                            className="doc-delete-btn"
                            onClick={() => void deleteDocument(doc.id).then(reload)}
                            aria-label="Delete document"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
