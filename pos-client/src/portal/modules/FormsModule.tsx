import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { fetchDocuments, type PortalDocument } from '../../lib/portalService';
import PortalLayout, { PortalCard, PortalPlaceholderNote } from '../PortalLayout';

function downloadDoc(doc: PortalDocument) {
  if (doc.fileUrl) {
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  window.alert(`"${doc.title}" (${doc.format}) download will be available once HQ enables file hosting.`);
}

export default function FormsModule() {
  const { brand } = useBrand();
  const [docs, setDocs] = useState<PortalDocument[]>([]);

  useEffect(() => {
    void fetchDocuments(brand.dbBrandId, 'form').then(setDocs);
  }, [brand.dbBrandId]);

  return (
    <PortalLayout icon={ClipboardList} title="Download Forms" subtitle="Printable documents for your branch">
      {docs.some((d) => d.source === 'fallback') && (
        <PortalPlaceholderNote>
          Downloads use placeholder links until HQ uploads forms in Document Library.
        </PortalPlaceholderNote>
      )}

      <PortalCard>
        {docs.map((form) => (
          <div key={form.id} className="portal-form-row">
            <div>
              <strong>{form.title}</strong>
              <p>{form.description}</p>
              {form.updatedAt && <div className="portal-form-meta">{form.format} · Updated {form.updatedAt}</div>}
            </div>
            <button type="button" className="portal-btn-ghost" onClick={() => downloadDoc(form)}>
              Download
            </button>
          </div>
        ))}
      </PortalCard>
    </PortalLayout>
  );
}
