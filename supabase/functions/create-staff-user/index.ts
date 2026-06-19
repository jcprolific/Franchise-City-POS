// Supabase Edge Function: create-staff-user
// Creates a real Supabase Auth user for a franchisee POS staff member, then
// syncs the profiles + staff_access rows. Uses the service-role key, which is
// only available server-side, so this can never run from the browser bundle.
//
// Deploy:
//   supabase functions deploy create-staff-user
// Required secrets (set once):
//   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected for deployed
//  functions, but are listed here for local `supabase functions serve`.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ROLES = ['cashier', 'branch_manager', 'hq_admin'] as const;
type StaffRole = (typeof ALLOWED_ROLES)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateStaffPayload {
  email?: string;
  password?: string;
  fullName?: string;
  brandId?: string;
  branchId?: string | null;
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

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: 'Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' },
      500
    );
  }

  let payload: CreateStaffPayload;
  try {
    payload = (await req.json()) as CreateStaffPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? '';
  const fullName = payload.fullName?.trim() ?? '';
  const brandId = payload.brandId?.trim() ?? '';
  const branchId = payload.branchId?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const role = (payload.role?.trim() ?? 'cashier') as StaffRole;

  if (!email || !email.includes('@')) {
    return jsonResponse({ error: 'A valid email is required.' }, 400);
  }
  if (password.length < 6) {
    return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
  }
  if (!fullName) {
    return jsonResponse({ error: 'Full name is required.' }, 400);
  }
  if (!brandId) {
    return jsonResponse({ error: 'A brand is required.' }, 400);
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return jsonResponse({ error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}.` }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create the Auth user (email confirmed so they can log in immediately).
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

  // 2. Upsert the profile that drives role/brand/branch access on login.
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
    // Roll back the auth user so we don't leave an orphaned login.
    await admin.auth.admin.deleteUser(authUserId);
    return jsonResponse({ error: `Profile sync failed: ${profileError.message}` }, 400);
  }

  // 3. Upsert the HQ-facing staff_access directory row.
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
