import { useEffect, useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { fetchDocuments, type PortalDocument } from '../../lib/portalService';
import PortalLayout, { PortalPlaceholderNote } from '../PortalLayout';

function openDoc(doc: PortalDocument) {
  if (doc.fileUrl) {
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  window.alert(`"${doc.title}" will open here once HQ uploads the file.`);
}

export default function ManualModule() {
  const { brand } = useBrand();
  const [docs, setDocs] = useState<PortalDocument[]>([]);

  useEffect(() => {
    void fetchDocuments(brand.dbBrandId, 'manual').then(setDocs);
  }, [brand.dbBrandId]);

  const sections = useMemo(() => {
    const map = new Map<string, PortalDocument[]>();
    for (const doc of docs) {
      const key = doc.section ?? 'General';
      const list = map.get(key) ?? [];
      list.push(doc);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [docs]);

  const usingFallback = docs.some((d) => d.source === 'fallback');

  return (
    <PortalLayout icon={BookOpen} title="Operations Manual" subtitle="SOPs, recipes, and store guides">
      {usingFallback && (
        <PortalPlaceholderNote>
          Document links use placeholder data until HQ uploads files via Document Library.
        </PortalPlaceholderNote>
      )}

      {sections.map(([section, items]) => (
        <section key={section} className="portal-manual-section">
          <h2>{section}</h2>
          <ul className="portal-manual-list">
            {items.map((item) => (
              <li key={item.id} className="portal-manual-item">
                <div className="portal-manual-item-info">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <button type="button" className="portal-btn-ghost" onClick={() => openDoc(item)}>
                  View
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PortalLayout>
  );
}
