// Supabase Edge Function: create-branch-staff
// Franchise owners create Level-2 staff for their branch.
// Deploy: supabase functions deploy create-branch-staff

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Franchisee portal staff: barista only (POS + Orders). */
const ALLOWED_ROLES = ['barista'] as const;
type BranchStaffRole = (typeof ALLOWED_ROLES)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateBranchStaffPayload {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  phone?: string | null;
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
    .select('role, brand_id, branch_id')
    .eq('id', caller.id)
    .maybeSingle();

  if (callerProfile?.role !== 'franchise_owner') {
    return jsonResponse({ error: 'Only franchise owners can create branch staff.' }, 403);
  }

  const { data: ownedBranch } = await admin
    .from('branch')
    .select('id, brand_id')
    .eq('owner_user_id', caller.id)
    .maybeSingle();

  if (!ownedBranch) {
    return jsonResponse({ error: 'No branch linked to your owner account.' }, 403);
  }

  let payload: CreateBranchStaffPayload;
  try {
    payload = (await req.json()) as CreateBranchStaffPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? '';
  const fullName = payload.fullName?.trim() ?? '';
  const phone = payload.phone?.trim() || null;
  const role = (payload.role?.trim() ?? 'barista') as BranchStaffRole;

  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'A valid email is required.' }, 400);
  }
  if (password.length < 6) {
    return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
  }
  if (!fullName) {
    return jsonResponse({ error: 'Full name is required.' }, 400);
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return jsonResponse({ error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.` }, 400);
  }

  const brandId = (ownedBranch.brand_id as string) || (callerProfile.brand_id as string);
  const branchId = ownedBranch.id as string;

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
      role,
      full_name: fullName,
      brand_id: brandId,
      branch_id: branchId,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(authUserId);
    return jsonResponse({ error: `Profile sync failed: ${profileError.message}` }, 400);
  }

  const { data: staffRow, error: staffError } = await admin
    .from('staff_access')
    .upsert(
      {
        auth_user_id: authUserId,
        brand_id: brandId,
        branch_id: branchId,
        full_name: fullName,
        email,
        phone,
        role,
        status: 'active',
        account_level: 'staff',
        created_by: caller.id,
      },
      { onConflict: 'brand_id,email' }
    )
    .select()
    .single();

  if (staffError) {
    return jsonResponse({ error: `Staff record sync failed: ${staffError.message}` }, 400);
  }

  return jsonResponse({ staff: staffRow }, 200);
});
