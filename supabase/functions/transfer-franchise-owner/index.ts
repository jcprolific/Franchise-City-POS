// Supabase Edge Function: transfer-franchise-owner
// HQ-only: transfer branch ownership after document verification.
// Deploy: supabase functions deploy transfer-franchise-owner

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TransferPayload {
  requestId?: string;
  action?: 'approve' | 'reject';
  newOwnerPassword?: string;
  newOwnerFullName?: string;
  notes?: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Authorization required.' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();

  if (callerError || !caller) {
    return jsonResponse({ error: 'Invalid session.' }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .maybeSingle();

  if (callerProfile?.role !== 'hq_admin') {
    return jsonResponse({ error: 'Only HQ admins can transfer ownership.' }, 403);
  }

  let payload: TransferPayload;
  try {
    payload = (await req.json()) as TransferPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const requestId = payload.requestId?.trim() ?? '';
  const action = payload.action;

  if (!requestId || (action !== 'approve' && action !== 'reject')) {
    return jsonResponse({ error: 'requestId and action (approve|reject) are required.' }, 400);
  }

  const { data: transferReq, error: reqError } = await admin
    .from('owner_transfer_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (reqError || !transferReq) {
    return jsonResponse({ error: 'Transfer request not found.' }, 404);
  }

  if (transferReq.status !== 'pending') {
    return jsonResponse({ error: 'This transfer request has already been processed.' }, 409);
  }

  if (action === 'reject') {
    const { error: rejectError } = await admin
      .from('owner_transfer_requests')
      .update({
        status: 'rejected',
        reviewed_by: caller.id,
        reviewed_at: new Date().toISOString(),
        notes: payload.notes?.trim() || null,
      })
      .eq('id', requestId);

    if (rejectError) {
      return jsonResponse({ error: rejectError.message }, 400);
    }
    return jsonResponse({ status: 'rejected' }, 200);
  }

  const newOwnerEmail = (transferReq.new_owner_email as string).trim().toLowerCase();
  const password = payload.newOwnerPassword ?? '';
  const fullName = payload.newOwnerFullName?.trim() ?? '';
  const branchId = transferReq.branch_id as string;
  const previousOwnerId = transferReq.previous_owner_id as string | null;

  if (password.length < 6) {
    return jsonResponse({ error: 'New owner password must be at least 6 characters.' }, 400);
  }
  if (!fullName) {
    return jsonResponse({ error: 'New owner full name is required.' }, 400);
  }

  const { data: branch } = await admin
    .from('branch')
    .select('id, brand_id, name')
    .eq('id', branchId)
    .maybeSingle();

  if (!branch) {
    return jsonResponse({ error: 'Branch not found.' }, 404);
  }

  let newOwnerId: string;

  const { data: usersList } = await admin.auth.admin.listUsers();
  const existingAuthUser = usersList?.users?.find(
    (u) => u.email?.toLowerCase() === newOwnerEmail
  );

  if (existingAuthUser) {
    newOwnerId = existingAuthUser.id;
    await admin.auth.admin.updateUserById(newOwnerId, { password });
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: newOwnerEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created?.user) {
      return jsonResponse({ error: createError?.message ?? 'Failed to create new owner.' }, 400);
    }
    newOwnerId = created.user.id;
  }

  if (previousOwnerId) {
    await admin
      .from('profiles')
      .update({ role: 'cashier', branch_id: null })
      .eq('id', previousOwnerId);

    await admin
      .from('staff_access')
      .update({ status: 'inactive' })
      .eq('auth_user_id', previousOwnerId);
  }

  await admin.from('profiles').upsert(
    {
      id: newOwnerId,
      role: 'franchise_owner',
      full_name: fullName,
      brand_id: branch.brand_id,
      branch_id: branchId,
    },
    { onConflict: 'id' }
  );

  await admin
    .from('branch')
    .update({
      owner_user_id: newOwnerId,
      franchisee_email: newOwnerEmail,
      franchisee_name: fullName,
    })
    .eq('id', branchId);

  const { error: approveError } = await admin
    .from('owner_transfer_requests')
    .update({
      status: 'approved',
      reviewed_by: caller.id,
      reviewed_at: new Date().toISOString(),
      notes: payload.notes?.trim() || null,
    })
    .eq('id', requestId);

  if (approveError) {
    return jsonResponse({ error: approveError.message }, 400);
  }

  return jsonResponse(
    {
      status: 'approved',
      newOwnerId,
      branchId,
      branchName: branch.name,
    },
    200
  );
});
