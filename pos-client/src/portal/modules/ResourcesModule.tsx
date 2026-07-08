import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { fetchDocuments, type PortalDocument } from '../../lib/portalService';
import PortalLayout, { PortalCard, PortalPlaceholderNote } from '../PortalLayout';

export default function ResourcesModule() {
  const { brand } = useBrand();
  const [docs, setDocs] = useState<PortalDocument[]>([]);

  useEffect(() => {
    void fetchDocuments(brand.dbBrandId, 'resource').then(setDocs);
  }, [brand.dbBrandId]);

  return (
    <PortalLayout icon={FolderOpen} title="Business Resources" subtitle="Brand assets and reference materials">
      {docs.some((d) => d.source === 'fallback') && (
        <PortalPlaceholderNote>
          HQ-published resources appear here when uploaded to Document Library.
        </PortalPlaceholderNote>
      )}

      <PortalCard>
        {docs.length === 0 ? (
          <p className="portal-announcement-body">No business resources published yet.</p>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="portal-form-row">
              <div>
                <strong>{doc.title}</strong>
                <p>{doc.description}</p>
              </div>
              <button
                type="button"
                className="portal-btn-ghost"
                onClick={() => doc.fileUrl && window.open(doc.fileUrl, '_blank')}
              >
                Open
              </button>
            </div>
          ))
        )}
      </PortalCard>
    </PortalLayout>
  );
}
