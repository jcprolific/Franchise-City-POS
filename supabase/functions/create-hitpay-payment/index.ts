// Creates a franchisee supply order and a HitPay payment request.
// Order stays pending_payment until hitpay-webhook confirms payment.
//
// Required secrets:
//   HITPAY_API_KEY
//   HITPAY_BASE_URL (optional, defaults to production)
//   HITPAY_REDIRECT_URL (optional fallback)
//   HITPAY_PAYMENT_METHODS (optional comma list, e.g. gcash,card)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INVENTORY_ROLES = new Set([
  'hq_admin',
  'franchise_owner',
  'franchisee',
  'manager',
  'supervisor',
  'inventory_staff',
  'branch_manager',
]);

const ALLOWED_REDIRECT_ORIGINS = new Set([
  'http://localhost:5199',
  'http://127.0.0.1:5199',
  'https://pos.franchisecity.ph',
  'https://www.franchisecity.ph',
  'https://franchisecity.ph',
]);

interface LineInput {
  rawMaterialId?: string;
  name?: string;
  packaging?: string;
  unit?: string;
  unitPrice?: number;
  quantity?: number;
}

interface Payload {
  brandId?: string;
  branchId?: string;
  notes?: string;
  placedBy?: string;
  origin?: string;
  orderId?: string;
  lines?: LineInput[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function makeReferenceNo(): string {
  const y = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SO-${y}-${rand}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveRedirectBase(origin: string | undefined): string {
  const fromOrigin = origin?.replace(/\/$/, '');
  if (fromOrigin && ALLOWED_REDIRECT_ORIGINS.has(fromOrigin)) {
    return fromOrigin;
  }
  const envRedirect = Deno.env.get('HITPAY_REDIRECT_URL')?.trim();
  const envOrigin = originFromUrl(envRedirect);
  if (envOrigin) return envOrigin;
  return 'https://pos.franchisecity.ph';
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
  const hitpayKey = Deno.env.get('HITPAY_API_KEY')?.trim();
  const hitpayBase = (
    Deno.env.get('HITPAY_BASE_URL')?.trim() || 'https://api.hit-pay.com/v1'
  ).replace(/\/$/, '');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server is missing Supabase credentials.' }, 500);
  }
  if (!hitpayKey) {
    return jsonResponse(
      { error: 'HitPay is not configured. Set HITPAY_API_KEY in Supabase secrets.' },
      500
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return jsonResponse({ error: 'Sign in is required to pay for a supply order.' }, 401);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const brandId = payload.brandId?.trim() ?? '';
  const branchId = payload.branchId?.trim() ?? '';
  const notes = payload.notes?.trim() ?? '';
  const existingOrderId = payload.orderId?.trim() || null;
  if (!brandId || !branchId) {
    return jsonResponse({ error: 'Brand and branch are required.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return jsonResponse({ error: 'Your session expired. Please sign in again.' }, 401);
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role, brand_id, branch_id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(profile?.role ?? '').toLowerCase();
  if (!INVENTORY_ROLES.has(role)) {
    return jsonResponse({ error: 'You do not have permission to order supplies.' }, 403);
  }

  const { data: branch, error: branchError } = await admin
    .from('branch')
    .select('id, name, owner_user_id, brand_id')
    .eq('id', branchId)
    .maybeSingle();

  if (branchError || !branch) {
    return jsonResponse({ error: 'Branch not found.' }, 404);
  }
  if (String(branch.brand_id) !== brandId) {
    return jsonResponse({ error: 'This branch does not belong to the selected brand.' }, 403);
  }

  const isOwner = branch.owner_user_id === user.id;
  const isAssigned = profile?.branch_id === branchId;
  const isHq = role === 'hq_admin';
  if (!isOwner && !isAssigned && !isHq) {
    const { data: staff } = await admin
      .from('staff_access')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('branch_id', branchId)
      .eq('status', 'active')
      .maybeSingle();
    if (!staff) {
      return jsonResponse({ error: 'You can only pay for orders for your own branch.' }, 403);
    }
  }

  const placedBy =
    payload.placedBy?.trim() ||
    profile?.full_name?.trim() ||
    user.email ||
    'Franchisee';
  const payerName = profile?.full_name?.trim() || placedBy;
  const payerEmail = user.email?.trim() || '';

  let orderId = existingOrderId;
  let referenceNo = '';
  let totalAmount = 0;

  if (existingOrderId) {
    const { data: existing, error: existingError } = await admin
      .from('supply_order')
      .select('id, reference_no, status, payment_status, total_amount, branch_id, brand_id')
      .eq('id', existingOrderId)
      .maybeSingle();
    if (existingError || !existing) {
      return jsonResponse({ error: 'Supply order not found.' }, 404);
    }
    if (existing.branch_id !== branchId || existing.brand_id !== brandId) {
      return jsonResponse({ error: 'This order does not belong to your branch.' }, 403);
    }
    if (existing.status !== 'pending_payment' || existing.payment_status === 'paid') {
      return jsonResponse(
        { error: 'This order is no longer awaiting payment.' },
        409
      );
    }
    orderId = existing.id;
    referenceNo = existing.reference_no;
    totalAmount = roundMoney(Number(existing.total_amount) || 0);
  } else {
    const lines = (payload.lines ?? [])
      .map((line) => {
        const quantity = Math.max(0, Math.round(Number(line.quantity) || 0));
        const unitPrice = roundMoney(Math.max(0, Number(line.unitPrice) || 0));
        const name = line.name?.trim() ?? '';
        return {
          rawMaterialId: line.rawMaterialId?.trim() || null,
          name,
          packaging: line.packaging?.trim() || '',
          unit: line.unit?.trim() || 'unit',
          unitPrice,
          quantity,
          lineTotal: roundMoney(quantity * unitPrice),
        };
      })
      .filter((line) => line.name && line.quantity > 0);

    if (lines.length === 0) {
      return jsonResponse({ error: 'Add at least one item before paying.' }, 400);
    }

    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    totalAmount = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    if (totalAmount <= 0) {
      return jsonResponse({ error: 'Order total must be greater than zero.' }, 400);
    }

    let inserted: { id: string; reference_no: string } | null = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      const candidate = makeReferenceNo();
      const { data: orderRow, error: orderError } = await admin
        .from('supply_order')
        .insert({
          brand_id: brandId,
          branch_id: branchId,
          reference_no: candidate,
          status: 'pending_payment',
          payment_status: 'unpaid',
          item_count: itemCount,
          total_amount: totalAmount,
          notes,
          placed_by: placedBy,
          payment_method: 'hitpay',
        })
        .select('id, reference_no')
        .single();

      if (!orderError && orderRow) {
        inserted = orderRow as { id: string; reference_no: string };
        break;
      }
      const isDuplicate = (orderError?.message ?? '').toLowerCase().includes('duplicate');
      if (!isDuplicate) {
        return jsonResponse(
          { error: orderError?.message ?? 'Could not create the supply order.' },
          400
        );
      }
    }

    if (!inserted) {
      return jsonResponse({ error: 'Could not generate a unique order reference.' }, 500);
    }

    orderId = inserted.id;
    referenceNo = inserted.reference_no;

    const { error: itemsError } = await admin.from('supply_order_item').insert(
      lines.map((line) => ({
        supply_order_id: orderId,
        raw_material_id: line.rawMaterialId,
        name: line.name,
        packaging: line.packaging,
        unit: line.unit,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        line_total: line.lineTotal,
      }))
    );
    if (itemsError) {
      await admin.from('supply_order').delete().eq('id', orderId);
      return jsonResponse({ error: itemsError.message }, 400);
    }
  }

  const redirectBase = resolveRedirectBase(payload.origin);
  const redirectUrl = `${redirectBase}/portal/orders/payment-success?ref=${encodeURIComponent(referenceNo)}`;

  const form = new URLSearchParams();
  form.set('amount', totalAmount.toFixed(2));
  form.set('currency', 'PHP');
  form.set('reference_number', referenceNo);
  form.set('redirect_url', redirectUrl);
  form.set('purpose', `Coftea Supply Order ${referenceNo}`);
  form.set('name', payerName);
  if (payerEmail) form.set('email', payerEmail);

  const methods = (Deno.env.get('HITPAY_PAYMENT_METHODS') ?? '')
    .split(',')
    .map((method) => method.trim())
    .filter(Boolean);
  for (const method of methods) {
    form.append('payment_methods[]', method);
  }

  let hitpayResponse: Response;
  try {
    hitpayResponse = await fetch(`${hitpayBase}/payment-requests`, {
      method: 'POST',
      headers: {
        'X-BUSINESS-API-KEY': hitpayKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: form,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HitPay request failed.';
    return jsonResponse({ error: message, referenceNo, orderId }, 502);
  }

  const hitpayText = await hitpayResponse.text();
  let hitpayJson: { id?: string; url?: string; error?: string } = {};
  try {
    hitpayJson = JSON.parse(hitpayText) as { id?: string; url?: string; error?: string };
  } catch {
    /* keep empty */
  }

  if (!hitpayResponse.ok || !hitpayJson.url || !hitpayJson.id) {
    const message =
      hitpayJson.error ||
      `HitPay could not create the payment (${hitpayResponse.status}).`;
    return jsonResponse({ error: message, referenceNo, orderId }, 502);
  }

  await admin
    .from('supply_order')
    .update({ hitpay_payment_request_id: hitpayJson.id })
    .eq('id', orderId);

  return jsonResponse({
    checkoutUrl: hitpayJson.url,
    referenceNo,
    orderId,
  });
});
