/**
 * Smoke test: partner enterprise backlog (schema + shift order + order charge + presence)
 * Usage (from pos-client/):
 *   node scripts/smoke-test-partner-backlog.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  } catch {
    console.error('Could not read pos-client/.env.local');
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const brandId = 'a1000000-0000-4000-8000-000000000002';

if (!url || !key) {
  console.error('FAIL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function request(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, json };
}

async function rpc(fn, args) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, json };
}

function pass(label) {
  console.log(`PASS ${label}`);
}

function fail(label, detail) {
  console.error(`FAIL ${label}:`, detail);
  process.exit(1);
}

async function main() {
  console.log('Partner enterprise backlog smoke test');
  console.log('Supabase URL:', url);

  const branchRes = await request(
    'GET',
    `branch?select=id,name&brand_id=eq.${brandId}&is_active=eq.true&limit=1`
  );
  if (!branchRes.ok || !Array.isArray(branchRes.json) || branchRes.json.length === 0) {
    fail('load branch', branchRes.json);
  }
  const branchId = branchRes.json[0].id;
  pass(`branch loaded (${branchRes.json[0].name})`);

  const colsRes = await request(
    'GET',
    `pos_order?select=customer_name,order_note,charged_by_name,completed_at,promo_percent,shift_id&limit=1`
  );
  if (!colsRes.ok) fail('pos_order new columns', colsRes.json);
  pass('pos_order extended columns readable');

  const shiftCols = await request(
    'GET',
    `pos_shift?select=beginning_cups,ending_cups,last_order_number&limit=1`
  );
  if (!shiftCols.ok) fail('pos_shift cup columns', shiftCols.json);
  pass('pos_shift cup columns readable');

  const presenceProbe = await request(
    'GET',
    `staff_presence?select=id,staff_name,status&limit=1`
  );
  if (!presenceProbe.ok) fail('staff_presence table', presenceProbe.json);
  pass('staff_presence table readable');

  const legacyCheck = await request(
    'GET',
    `pos_order?select=id&status=eq.NEW&payment_status=eq.PAID&limit=1`
  );
  if (!legacyCheck.ok) fail('legacy NEW+PAID check', legacyCheck.json);
  if (Array.isArray(legacyCheck.json) && legacyCheck.json.length > 0) {
    fail('legacy NEW+PAID backfill', `still ${legacyCheck.json.length} row(s)`);
  }
  pass('no legacy NEW+PAID rows remain');

  const terminalId = `SMOKE-${Date.now()}`;
  const shiftInsert = await request('POST', 'pos_shift', {
    branch_id: branchId,
    terminal_id: terminalId,
    cashier_name: 'Smoke Tester',
    status: 'open',
    opening_cash: 500,
    beginning_cups: { small: 10, medium: 20 },
    last_order_number: 0,
  });
  if (!shiftInsert.ok) fail('open shift', shiftInsert.json);
  const shift = Array.isArray(shiftInsert.json) ? shiftInsert.json[0] : shiftInsert.json;
  pass('shift opened with beginning cups');

  const orderNo1 = await rpc('get_next_shift_order_number', { p_shift_id: shift.id });
  const orderNo2 = await rpc('get_next_shift_order_number', { p_shift_id: shift.id });
  if (!orderNo1.ok || orderNo1.json !== 1) fail('shift order number 1', orderNo1);
  if (!orderNo2.ok || orderNo2.json !== 2) fail('shift order number 2', orderNo2);
  pass('get_next_shift_order_number returns 1 then 2');

  const orderInsert = await request('POST', 'pos_order', {
    branch_id: branchId,
    brand_id: brandId,
    order_number: orderNo2.json,
    status: 'COMPLETED',
    payment_status: 'PAID',
    payment_method: 'CASH',
    subtotal: 120,
    discount_amount: 0,
    total_amount: 120,
    item_count: 1,
    customer_name: 'Smoke Customer',
    order_note: 'Smoke test order',
    charged_by_name: 'Smoke Tester',
    shift_id: shift.id,
    terminal_id: terminalId,
    completed_at: new Date().toISOString(),
  });
  if (!orderInsert.ok) fail('completed order insert', orderInsert.json);
  const order = Array.isArray(orderInsert.json) ? orderInsert.json[0] : orderInsert.json;
  pass('COMPLETED+PAID order with customer fields');

  const presenceUpsert = await request(
    'POST',
    'staff_presence',
    {
      user_id: 'smoke-tester',
      staff_name: 'Smoke Tester',
      branch_id: branchId,
      role: 'barista',
      status: 'online',
      terminal_id: terminalId,
      last_seen_at: new Date().toISOString(),
    },
    { Prefer: 'return=representation,resolution=merge-duplicates' }
  );
  if (!presenceUpsert.ok) fail('staff_presence upsert', presenceUpsert.json);
  pass('staff_presence upsert');

  await request('DELETE', `pos_order?id=eq.${order.id}`);
  await request('PATCH', `pos_shift?id=eq.${shift.id}`, {
    status: 'closed',
    closing_cash: 620,
    ending_cups: { small: 8, medium: 18 },
    closed_at: new Date().toISOString(),
  });
  await request('DELETE', `staff_presence?user_id=eq.smoke-tester&branch_id=eq.${branchId}`);
  pass('cleanup test rows');

  console.log('\nAll partner backlog smoke tests passed.');
}

main().catch((err) => {
  console.error('FAIL network/runtime:', err.message);
  process.exit(1);
});
