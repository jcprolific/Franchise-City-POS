import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { supabase } from '../../lib/supabase';
import { fetchDocuments, type PortalDocument } from '../../lib/portalService';
import {
  fetchTrainingCompletions,
  markTrainingComplete,
  seedTrainingAssignmentsFromDocuments,
} from '../../lib/complianceService';
import { resolveFranchiseeBranch } from '../../lib/franchiseeBranch';
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
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: { session } }, trainingDocs] = await Promise.all([
        supabase.auth.getSession(),
        fetchDocuments(brand.dbBrandId, 'training'),
      ]);
      const email = session?.user?.email ?? '';
      const userId = session?.user?.id;
      const resolved = await resolveFranchiseeBranch(email, userId);
      const resolvedBranchId = resolved.branchId;

      await seedTrainingAssignmentsFromDocuments(brand.dbBrandId);

      const done = resolvedBranchId
        ? await fetchTrainingCompletions(brand.dbBrandId, resolvedBranchId)
        : new Set<string>();

      if (!cancelled) {
        setDocs(trainingDocs);
        setBranchId(resolvedBranchId);
        setCompleted(done);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [brand.dbBrandId]);

  const onComplete = async (doc: PortalDocument) => {
    if (!branchId || completed.has(doc.id)) return;
    setSavingId(doc.id);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await markTrainingComplete({
      brandId: brand.dbBrandId,
      branchId,
      documentId: doc.id,
      completedBy: session?.user?.email ?? undefined,
    });
    setSavingId(null);
    if (!error) {
      setCompleted((prev) => new Set(prev).add(doc.id));
    }
  };

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
          const isDone = completed.has(video.id);
          return (
            <div key={video.id} className={`portal-video-row${isSoon ? ' is-soon' : ''}`}>
              <div className="portal-video-thumb" aria-hidden="true">{isSoon ? '…' : '▶'}</div>
              <div className="portal-video-info">
                <strong>{video.title}</strong>
                <span>{video.description || video.section}</span>
              </div>
              {isSoon ? (
                <PortalTag variant="soon">Soon</PortalTag>
              ) : isDone ? (
                <span className="portal-training-done">Completed</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <button type="button" className="portal-btn-ghost" onClick={() => watchDoc(video)}>
                    Watch
                  </button>
                  {branchId ? (
                    <button
                      type="button"
                      className="portal-btn-ack"
                      disabled={savingId === video.id}
                      onClick={() => void onComplete(video)}
                    >
                      {savingId === video.id ? 'Saving…' : 'Mark complete'}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PortalLayout>
  );
}
