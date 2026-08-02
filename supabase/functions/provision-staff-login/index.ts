// Supabase Edge Function: provision-staff-login
// Creates or repairs login for a staff_access row that has no auth_user_id,
// or resets password for staff that already has auth linked.
// Deploy: supabase functions deploy provision-staff-login

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProvisionStaffLoginPayload {
  staffAccessId?: string;
  password?: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
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

  const callerRole = callerProfile?.role ?? '';
  const isHqAdmin = callerRole === 'hq_admin';
  const isFranchiseOwner = callerRole === 'franchise_owner';

  if (!isHqAdmin && !isFranchiseOwner) {
    return jsonResponse({ error: 'Only HQ or franchise owners can provision staff login.' }, 403);
  }

  let payload: ProvisionStaffLoginPayload;
  try {
    payload = (await req.json()) as ProvisionStaffLoginPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const staffAccessId = payload.staffAccessId?.trim() ?? '';
  const password = payload.password ?? '';

  if (!staffAccessId) {
    return jsonResponse({ error: 'Staff record ID is required.' }, 400);
  }
  if (password.length < 6) {
    return jsonResponse({ error: 'Password must be at least 6 characters.' }, 400);
  }

  const { data: staffRow, error: staffError } = await admin
    .from('staff_access')
    .select('id, auth_user_id, brand_id, branch_id, full_name, email, phone, role, status, account_level')
    .eq('id', staffAccessId)
    .maybeSingle();

  if (staffError || !staffRow) {
    return jsonResponse({ error: 'Staff record not found.' }, 404);
  }

  if (isFranchiseOwner) {
    const { data: ownedBranch } = await admin
      .from('branch')
      .select('id')
      .eq('owner_user_id', caller.id)
      .maybeSingle();

    if (!ownedBranch || staffRow.branch_id !== ownedBranch.id) {
      return jsonResponse({ error: 'You can only provision login for your own branch staff.' }, 403);
    }
  }

  const email = (staffRow.email as string).trim().toLowerCase();
  const fullName = (staffRow.full_name as string).trim();
  const brandId = staffRow.brand_id as string;
  const branchId = (staffRow.branch_id as string | null) ?? null;
  const role = (staffRow.role as string) ?? 'barista';

  let authUserId = staffRow.auth_user_id as string | null;

  if (authUserId) {
    const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created?.user) {
      const message = createError?.message ?? 'Failed to create auth user.';
      const isDuplicate = message.toLowerCase().includes('already');

      if (isDuplicate) {
        const existingUser = await findUserByEmail(admin, email);
        if (!existingUser) {
          return jsonResponse({ error: 'A user with this email already exists but could not be linked.' }, 409);
        }
        authUserId = existingUser.id;
        const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
          password,
          email_confirm: true,
        });
        if (updateError) {
          return jsonResponse({ error: updateError.message }, 400);
        }
      } else {
        return jsonResponse({ error: message }, 400);
      }
    } else {
      authUserId = created.user.id;
    }

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
      return jsonResponse({ error: `Profile sync failed: ${profileError.message}` }, 400);
    }

    const { error: linkError } = await admin
      .from('staff_access')
      .update({ auth_user_id: authUserId })
      .eq('id', staffAccessId);

    if (linkError) {
      return jsonResponse({ error: `Staff link failed: ${linkError.message}` }, 400);
    }
  }

  return jsonResponse(
    {
      staff: {
        id: staffAccessId,
        authUserId,
        email,
        fullName,
        linked: !staffRow.auth_user_id,
        passwordReset: Boolean(staffRow.auth_user_id),
      },
    },
    200
  );
});
