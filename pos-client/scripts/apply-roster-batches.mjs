#!/usr/bin/env node
/** Print SQL upsert batches for roster JSON (for Supabase SQL / MCP). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = path.join(ROOT, 'data/private/roster-import.json');

function sqlStr(v) {
  if (v == null || v === '') return 'null';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlBool(v) {
  if (v == null) return 'null';
  return v ? 'true' : 'false';
}

function sqlDate(v) {
  if (!v) return 'null';
  return `${sqlStr(v)}::date`;
}

const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const batchSize = 80;
const batchNum = Number(process.argv[2] || 0);

function buildSql(batch) {
  const values = batch
    .map(
      (r) =>
        `(${sqlStr(r.brand_id)}::uuid, ${sqlStr(r.name)}, ${sqlStr(r.address)}, ${sqlStr(r.city)}, ${r.is_active}, ${sqlStr(r.branch_code)}, ${sqlStr(r.franchisee_name)}, ${sqlStr(r.franchisee_phone)}, ${sqlStr(r.franchisee_email)}, ${sqlStr(r.business_name)}, ${sqlDate(r.opening_date)}, ${sqlDate(r.contract_start_date)}, ${sqlStr(r.franchise_package)}, ${sqlStr(r.onboarding_status)}, ${sqlStr(r.home_address)}, ${sqlStr(r.store_status)}, ${sqlStr(r.order_cadence)}, ${sqlDate(r.last_po_date)}, ${sqlStr(r.contract_status)}, ${sqlBool(r.contract_signed)}, ${sqlStr(r.agent_name)}, ${sqlBool(r.viber_added)}, ${sqlStr(r.notes)}, ${sqlStr(r.source_sheet)}, ${r.source_row})`
    )
    .join(',\n');

  return `
insert into public.branch (
  brand_id, name, address, city, is_active, branch_code,
  franchisee_name, franchisee_phone, franchisee_email, business_name,
  opening_date, contract_start_date, franchise_package, onboarding_status,
  home_address, store_status, order_cadence, last_po_date,
  contract_status, contract_signed, agent_name, viber_added, notes,
  source_sheet, source_row
)
values ${values}
on conflict (brand_id, source_sheet, source_row)
do update set
  name = excluded.name,
  address = excluded.address,
  city = excluded.city,
  is_active = excluded.is_active,
  branch_code = excluded.branch_code,
  franchisee_name = excluded.franchisee_name,
  franchisee_phone = excluded.franchisee_phone,
  franchisee_email = excluded.franchisee_email,
  business_name = excluded.business_name,
  opening_date = excluded.opening_date,
  contract_start_date = excluded.contract_start_date,
  franchise_package = excluded.franchise_package,
  onboarding_status = excluded.onboarding_status,
  home_address = excluded.home_address,
  store_status = excluded.store_status,
  order_cadence = excluded.order_cadence,
  last_po_date = excluded.last_po_date,
  contract_status = excluded.contract_status,
  contract_signed = excluded.contract_signed,
  agent_name = excluded.agent_name,
  viber_added = excluded.viber_added,
  notes = excluded.notes,
  updated_at = now();
`;
}

if (batchNum > 0) {
  const start = (batchNum - 1) * batchSize;
  const batch = rows.slice(start, start + batchSize);
  if (!batch.length) process.exit(0);
  process.stdout.write(buildSql(batch));
} else {
  const total = Math.ceil(rows.length / batchSize);
  for (let b = 1; b <= total; b += 1) {
    console.log(`---BATCH ${b}/${total}---`);
  }
}
