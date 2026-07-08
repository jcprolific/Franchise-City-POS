// Supabase Edge Function: provision-franchise-owner
// HQ creates the Level-1 franchise owner account for a branch.
// Deploy: supabase functions deploy provision-franchise-owner

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProvisionPayload {
  branchId?: string;
  email?: string;
  password?: string;
  fullName?: string;
  brandId?: string;
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
    return jsonResponse({ error: 'Only HQ admins can provision franchise owners.' }, 403);
  }

  let payload: ProvisionPayload;
  try {
    payload = (await req.json()) as ProvisionPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const branchId = payload.branchId?.trim() ?? '';
  const email = payload.email?.trim().toLowerCase() ?? '';
  const password = payload.password ?? '';
  const fullName = payload.fullName?.trim() ?? '';
  const brandId = payload.brandId?.trim() ?? '';

  if (!branchId) return jsonResponse({ error: 'Branch ID is required.' }, 400);
  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'A valid owner email is required.' }, 400);
  }
  if (password.length < 6) {
    return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
  }
  if (!fullName) return jsonResponse({ error: 'Owner full name is required.' }, 400);

  const { data: branch, error: branchError } = await admin
    .from('branch')
    .select('id, name, owner_user_id, brand_id, franchisee_email')
    .eq('id', branchId)
    .maybeSingle();

  if (branchError || !branch) {
    return jsonResponse({ error: 'Branch not found.' }, 404);
  }

  if (branch.owner_user_id) {
    return jsonResponse(
      { error: 'This branch already has a registered owner. Use Transfer Ownership to change.' },
      409
    );
  }

  const resolvedBrandId = brandId || ((branch.brand_id as string | null) ?? '');
  if (!resolvedBrandId) {
    return jsonResponse({ error: 'Brand ID is required.' }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? 'Failed to create auth user.';
    const isDuplicate = message.toLowerCase().includes('already');
    return jsonResponse(
      { error: isDuplicate ? 'A user with this email already exists.' : message },
      isDuplicate ? 409 : 400
    );
  }

  const authUserId = created.user.id;

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: authUserId,
      role: 'franchise_owner',
      full_name: fullName,
      brand_id: resolvedBrandId,
      branch_id: branchId,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(authUserId);
    return jsonResponse({ error: `Profile sync failed: ${profileError.message}` }, 400);
  }

  const { error: branchUpdateError } = await admin
    .from('branch')
    .update({
      owner_user_id: authUserId,
      franchisee_email: email,
      franchisee_name: fullName,
    })
    .eq('id', branchId);

  if (branchUpdateError) {
    await admin.auth.admin.deleteUser(authUserId);
    return jsonResponse({ error: `Branch link failed: ${branchUpdateError.message}` }, 400);
  }

  return jsonResponse(
    {
      owner: {
        authUserId,
        email,
        fullName,
        branchId,
        branchName: branch.name,
      },
    },
    200
  );
});
