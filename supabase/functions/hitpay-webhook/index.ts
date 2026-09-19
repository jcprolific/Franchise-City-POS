// Confirms HitPay supply-order payments. Deploy with verify_jwt = false.
// Auth: HMAC-SHA256 of the raw JSON body using HITPAY_SALT (Hitpay-Signature).
//
// Register in HitPay Dashboard → Developers → Webhook Endpoints:
//   payment_request.completed
//
// Required secrets:
//   HITPAY_SALT

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, hitpay-signature, hitpay-event-type, hitpay-event-object',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface HitPayPayment {
  id?: string;
  status?: string;
}

interface HitPayPayload {
  id?: string;
  status?: string;
  reference_number?: string;
  payments?: HitPayPayment[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256Hex(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const salt = Deno.env.get('HITPAY_SALT')?.trim();
  if (!salt) {
    return jsonResponse({ error: 'HITPAY_SALT is not configured' }, 500);
  }

  const rawBody = await req.text();
  const provided = (req.headers.get('Hitpay-Signature') ?? '').trim().toLowerCase();
  if (!provided) {
    return jsonResponse({ error: 'Missing Hitpay-Signature' }, 401);
  }

  const computed = (await hmacSha256Hex(rawBody, salt)).toLowerCase();
  if (!timingSafeEqual(computed, provided)) {
    return jsonResponse({ error: 'Invalid signature' }, 401);
  }

  const eventType = (req.headers.get('Hitpay-Event-Type') ?? '').toLowerCase();
  let payload: HitPayPayload;
  try {
    payload = JSON.parse(rawBody) as HitPayPayload;
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  const status = String(payload.status ?? '').toLowerCase();
  const isCompleted = eventType === 'completed' || status === 'completed';
  if (!isCompleted) {
    return jsonResponse({ skipped: true, reason: 'not_completed' });
  }

  const referenceNo = payload.reference_number?.trim() ?? '';
  const requestId = payload.id?.trim() ?? '';
  if (!referenceNo && !requestId) {
    return jsonResponse({ error: 'Missing payment reference' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = admin
    .from('supply_order')
    .select('id, status, payment_status, reference_no, hitpay_payment_request_id');

  if (referenceNo) {
    query = query.eq('reference_no', referenceNo);
  } else {
    query = query.eq('hitpay_payment_request_id', requestId);
  }

  const { data: order, error: orderError } = await query.maybeSingle();
  if (orderError) {
    return jsonResponse({ error: orderError.message }, 500);
  }
  if (!order) {
    return jsonResponse({ skipped: true, reason: 'order_not_found' });
  }

  if (order.payment_status === 'paid') {
    return jsonResponse({ ok: true, idempotent: true, orderId: order.id });
  }

  const paymentId =
    payload.payments?.find((payment) => payment.id)?.id ?? requestId ?? '';

  const { error: updateError } = await admin
    .from('supply_order')
    .update({
      payment_status: 'paid',
      status: 'pending',
      paid_at: new Date().toISOString(),
      payment_reference: paymentId || null,
      hitpay_payment_request_id: requestId || order.hitpay_payment_request_id,
      payment_method: 'hitpay',
    })
    .eq('id', order.id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ ok: true, orderId: order.id, referenceNo: order.reference_no });
});
