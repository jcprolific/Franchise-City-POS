import { supabase } from '../../lib/supabase';

async function readEdgeFunctionError(error: {
  message: string;
  context?: Response;
}): Promise<string> {
  let message = error.message;
  try {
    const ctx = error.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) message = body.error;
    }
  } catch {
    /* keep default */
  }
  return message;
}

export interface DeleteFranchiseeBackendInput {
  branchId: string;
  brandId: string;
}

export interface DeleteFranchiseeBackendResult {
  ok: boolean;
  error?: string;
  removedOwner?: boolean;
  removedStaffCount?: number;
}

export async function deleteFranchiseeFromBackend(
  input: DeleteFranchiseeBackendInput
): Promise<DeleteFranchiseeBackendResult> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-franchisee', {
      body: {
        branchId: input.branchId,
        brandId: input.brandId,
      },
    });

    if (error) {
      return { ok: false, error: await readEdgeFunctionError(error) };
    }

    if (data?.error) {
      return { ok: false, error: data.error as string };
    }

    return {
      ok: true,
      removedOwner: Boolean(data?.deleted?.removedOwner),
      removedStaffCount: (data?.deleted?.removedStaffCount as number | undefined) ?? 0,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach delete service.',
    };
  }
}

export interface ProvisionOwnerInput {
  branchId: string;
  email: string;
  password: string;
  fullName: string;
  brandId: string;
}

export interface ProvisionOwnerResult {
  ok: boolean;
  error?: string;
  owner?: {
    authUserId: string;
    email: string;
    fullName: string;
    branchId: string;
    branchName: string;
  };
}

export async function provisionFranchiseOwner(
  input: ProvisionOwnerInput
): Promise<ProvisionOwnerResult> {
  try {
    const { data, error } = await supabase.functions.invoke('provision-franchise-owner', {
      body: {
        branchId: input.branchId,
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        brandId: input.brandId,
      },
    });

    if (error) {
      return { ok: false, error: await readEdgeFunctionError(error) };
    }

    if (data?.error) {
      return { ok: false, error: data.error as string };
    }

    return { ok: true, owner: data?.owner };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not reach provisioning service.',
    };
  }
}

export interface OwnerTransferRequest {
  id: string;
  branch_id: string;
  branch_name?: string;
  previous_owner_id: string | null;
  new_owner_email: string;
  document_refs: { name: string; url?: string }[];
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function createOwnerTransferRequest(input: {
  branchId: string;
  previousOwnerId: string | null;
  newOwnerEmail: string;
  documentRefs: { name: string; url?: string }[];
}): Promise<{ ok: boolean; error?: string; request?: OwnerTransferRequest }> {
  const { data, error } = await supabase
    .from('owner_transfer_requests')
    .insert({
      branch_id: input.branchId,
      previous_owner_id: input.previousOwnerId,
      new_owner_email: input.newOwnerEmail.trim().toLowerCase(),
      document_refs: input.documentRefs,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, request: data as OwnerTransferRequest };
}

export async function fetchOwnerTransferRequests(
  branchId?: string
): Promise<OwnerTransferRequest[]> {
  let query = supabase
    .from('owner_transfer_requests')
    .select('*, branch:branch_id(name)')
    .order('created_at', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) return [];

  return ((data as Record<string, unknown>[]) ?? []).map((row) => {
    const branch = row.branch as { name?: string } | { name?: string }[] | null;
    const branchName = Array.isArray(branch) ? branch[0]?.name : branch?.name;
    return {
      ...(row as Omit<OwnerTransferRequest, 'branch_name'>),
      branch_name: branchName ?? undefined,
      document_refs: (row.document_refs as OwnerTransferRequest['document_refs']) ?? [],
    };
  });
}

export async function processOwnerTransfer(input: {
  requestId: string;
  action: 'approve' | 'reject';
  newOwnerPassword?: string;
  newOwnerFullName?: string;
  notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('transfer-franchise-owner', {
      body: input,
    });

    if (error) {
      return { ok: false, error: await readEdgeFunctionError(error) };
    }

    if (data?.error) {
      return { ok: false, error: data.error as string };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Transfer service unavailable.',
    };
  }
}
