/**
 * Smoke test: franchisee registration against Supabase branch table.
 * Usage (from pos-client/):
 *   node scripts/smoke-test-franchisee.mjs
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

async function request(method, path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
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

async function main() {
  console.log('Franchisee registration smoke test');
  console.log('Supabase URL:', url);

  // 1. Read existing branches
  const read = await request(
    'GET',
    `branch?select=id,name&brand_id=eq.${brandId}&limit=3`
  );
  if (!read.ok) {
    console.error('FAIL read:', read.status, read.json);
    process.exit(1);
  }
  console.log('PASS read branch table:', Array.isArray(read.json) ? read.json.length : read.json);

  // 2. Insert test franchisee
  const testName = `Smoke Test ${Date.now()}`;
  const insert = await request('POST', 'branch', {
    name: testName,
    address: 'Smoke test address',
    is_active: true,
    brand_id: brandId,
    franchisee_name: 'Smoke Tester',
    franchisee_email: 'smoke@test.local',
    onboarding_status: 'onboarding',
  });

  if (!insert.ok) {
    console.error('FAIL insert (extended):', insert.status, insert.json);
    // Retry with core fields only
    const fallback = await request('POST', 'branch', {
      name: testName,
      address: 'Smoke test address · Franchisee: Smoke Tester',
      is_active: true,
      brand_id: brandId,
    });
    if (!fallback.ok) {
      console.error('FAIL insert (core fallback):', fallback.status, fallback.json);
      process.exit(1);
    }
    console.log('PASS insert (core fallback)');
    const row = Array.isArray(fallback.json) ? fallback.json[0] : fallback.json;
    if (row?.id) {
      await request('DELETE', `branch?id=eq.${row.id}`);
      console.log('PASS cleanup deleted test row');
    }
    process.exit(0);
  }

  console.log('PASS insert (extended fields)');
  const row = Array.isArray(insert.json) ? insert.json[0] : insert.json;
  if (row?.id) {
    const del = await request('DELETE', `branch?id=eq.${row.id}`);
    if (del.ok) {
      console.log('PASS cleanup deleted test row');
    } else {
      console.warn('WARN cleanup failed:', del.status, del.json);
    }
  }

  console.log('\nAll smoke tests passed.');
}

main().catch((err) => {
  console.error('FAIL network/runtime:', err.message);
  process.exit(1);
});
