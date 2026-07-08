import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { fetchDocuments, type PortalDocument } from '../../lib/portalService';
import PortalLayout, { PortalPlaceholderNote, PortalTag } from '../PortalLayout';

function watchDoc(doc: PortalDocument) {
  if (doc.fileUrl) {
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  if (doc.description.includes('Coming soon')) return;
  window.alert(`"${doc.title}" video player will open here once HQ uploads the file.`);
}

export default function TrainingModule() {
  const { brand } = useBrand();
  const [docs, setDocs] = useState<PortalDocument[]>([]);

  useEffect(() => {
    void fetchDocuments(brand.dbBrandId, 'training').then(setDocs);
  }, [brand.dbBrandId]);

  return (
    <PortalLayout icon={Video} title="Training Videos" subtitle="Staff training library">
      {docs.some((d) => d.source === 'fallback') && (
        <PortalPlaceholderNote>
          Training content is loaded from HQ Document Library when available.
        </PortalPlaceholderNote>
      )}

      <div className="portal-video-list">
        {docs.map((video) => {
          const isSoon = video.description.includes('Coming soon');
          return (
            <div key={video.id} className={`portal-video-row${isSoon ? ' is-soon' : ''}`}>
              <div className="portal-video-thumb" aria-hidden="true">{isSoon ? '…' : '▶'}</div>
              <div className="portal-video-info">
                <strong>{video.title}</strong>
                <span>{video.description || video.section}</span>
              </div>
              {isSoon ? (
                <PortalTag variant="soon">Soon</PortalTag>
              ) : (
                <button type="button" className="portal-btn-ghost" onClick={() => watchDoc(video)}>
                  Watch
                </button>
              )}
            </div>
          );
        })}
      </div>
    </PortalLayout>
  );
}
