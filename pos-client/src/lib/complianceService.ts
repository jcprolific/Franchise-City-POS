import { supabase, isSupabaseConfigured } from './supabase';

export type ComplianceRefType = 'announcement' | 'task' | 'document';

export async function acknowledgeComplianceItem(input: {
  brandId: string;
  branchId: string;
  refType: ComplianceRefType;
  refId: string;
  acknowledgedBy?: string;
  evidenceUrl?: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };

  const { error } = await supabase.from('branch_compliance_ack').upsert(
    {
      brand_id: input.brandId,
      branch_id: input.branchId,
      ref_type: input.refType,
      ref_id: input.refId,
      acknowledged_by: input.acknowledgedBy ?? null,
      evidence_url: input.evidenceUrl ?? null,
      acknowledged_at: new Date().toISOString(),
    },
    { onConflict: 'branch_id,ref_type,ref_id' }
  );

  return { error: error?.message ?? null };
}

export async function fetchComplianceAcks(
  brandId: string,
  branchId: string,
  refType?: ComplianceRefType
): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();

  let query = supabase
    .from('branch_compliance_ack')
    .select('ref_id')
    .eq('brand_id', brandId)
    .eq('branch_id', branchId);

  if (refType) query = query.eq('ref_type', refType);

  const { data, error } = await query;
  if (error || !data) return new Set();
  return new Set(data.map((row) => String(row.ref_id)));
}

export async function markTrainingComplete(input: {
  brandId: string;
  branchId: string;
  assignmentId?: string;
  documentId: string;
  completedBy?: string;
}): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'not-configured' };

  const { data: existing } = await supabase
    .from('training_completion')
    .select('id')
    .eq('brand_id', input.brandId)
    .eq('branch_id', input.branchId)
    .eq('document_id', input.documentId)
    .maybeSingle();

  if (existing) return { error: null };

  const { error } = await supabase.from('training_completion').insert({
    brand_id: input.brandId,
    branch_id: input.branchId,
    assignment_id: input.assignmentId ?? null,
    document_id: input.documentId,
    completed_by: input.completedBy ?? null,
    completed_at: new Date().toISOString(),
  });

  return { error: error?.message ?? null };
}

export async function fetchTrainingCompletions(
  brandId: string,
  branchId: string
): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();

  const { data, error } = await supabase
    .from('training_completion')
    .select('document_id,assignment_id')
    .eq('brand_id', brandId)
    .eq('branch_id', branchId);

  if (error || !data) return new Set();

  const ids = new Set<string>();
  for (const row of data) {
    if (row.document_id) ids.add(String(row.document_id));
    if (row.assignment_id) ids.add(String(row.assignment_id));
  }
  return ids;
}

export async function seedTrainingAssignmentsFromDocuments(brandId: string) {
  if (!isSupabaseConfigured()) return;

  const { data: docs } = await supabase
    .from('portal_document')
    .select('id,title')
    .eq('brand_id', brandId)
    .eq('doc_type', 'training');

  if (!docs?.length) return;

  const { count } = await supabase
    .from('training_assignment')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId);

  if ((count ?? 0) > 0) return;

  await supabase.from('training_assignment').insert(
    docs.map((doc) => ({
      brand_id: brandId,
      branch_id: null,
      document_id: doc.id,
      title: doc.title,
      required: true,
    }))
  );
}
