// Supabase Edge Function: delete-franchisee
// HQ removes a branch and cleans up linked owner/staff auth accounts.
// Deploy: supabase functions deploy delete-franchisee

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeletePayload {
  branchId?: string;
  brandId?: string;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email
    );
    if (match?.id) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function deleteAuthUserIfSafe(
  admin: ReturnType<typeof createClient>,
  userId: string,
  branchId: string
): Promise<void> {
  const { count } = await admin
    .from('branch')
    .select('id', { count: 'exact', head: true })
    .eq('owner_user_id', userId)
    .neq('id', branchId);

  if ((count ?? 0) > 0) return;

  const { data: profile } = await admin
    .from('profiles')
    .select('role, branch_id')
    .eq('id', userId)
    .maybeSingle();

  if (
    profile?.branch_id &&
    profile.branch_id !== branchId &&
    profile.role !== 'hq_admin'
  ) {
    return;
  }

  await admin.auth.admin.deleteUser(userId);
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
    return jsonResponse({ error: 'Only HQ admins can delete franchisees.' }, 403);
  }

  let payload: DeletePayload;
  try {
    payload = (await req.json()) as DeletePayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const branchId = payload.branchId?.trim() ?? '';
  const brandId = payload.brandId?.trim() ?? '';

  if (!branchId) return jsonResponse({ error: 'Branch ID is required.' }, 400);
  if (!brandId) return jsonResponse({ error: 'Brand ID is required.' }, 400);

  let branchQuery = admin
    .from('branch')
    .select('id, name, owner_user_id, franchisee_email, brand_id')
    .eq('id', branchId);

  branchQuery = branchQuery.eq('brand_id', brandId);

  const { data: branch, error: branchError } = await branchQuery.maybeSingle();

  if (branchError || !branch) {
    return jsonResponse({ error: 'Branch not found.' }, 404);
  }

  const ownerUserId = (branch.owner_user_id as string | null) ?? null;
  const franchiseeEmail = (branch.franchisee_email as string | null)?.trim().toLowerCase() ?? '';

  const { data: staffProfiles } = await admin
    .from('profiles')
    .select('id, role')
    .eq('branch_id', branchId)
    .neq('role', 'hq_admin');

  const staffUserIds = (staffProfiles ?? [])
    .map((row) => row.id as string)
    .filter((id) => id !== ownerUserId);

  for (const staffId of staffUserIds) {
    await admin.auth.admin.deleteUser(staffId);
  }

  const { error: deleteBranchError } = await admin
    .from('branch')
    .delete()
    .eq('id', branchId)
    .eq('brand_id', brandId);

  if (deleteBranchError) {
    return jsonResponse({ error: deleteBranchError.message }, 400);
  }

  if (ownerUserId) {
    await deleteAuthUserIfSafe(admin, ownerUserId, branchId);
  } else if (franchiseeEmail) {
    const emailUserId = await findAuthUserIdByEmail(admin, franchiseeEmail);
    if (emailUserId) {
      await deleteAuthUserIfSafe(admin, emailUserId, branchId);
    }
  }

  return jsonResponse(
    {
      deleted: {
        branchId,
        branchName: branch.name,
        removedOwner: Boolean(ownerUserId || franchiseeEmail),
        removedStaffCount: staffUserIds.length,
      },
    },
    200
  );
});
