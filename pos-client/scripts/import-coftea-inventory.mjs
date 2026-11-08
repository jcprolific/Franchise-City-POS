#!/usr/bin/env node
/**
 * Import COFTEA INVENTORY 2026.xlsx into raw_material, branch_inventory, etc.
 *
 * Usage:
 *   node scripts/import-coftea-inventory.mjs --dry-run
 *   node scripts/import-coftea-inventory.mjs --write-ts
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-coftea-inventory.mjs --apply
 *
 * Default xlsx: data/private/coftea-inventory-2026.xlsx
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  COFTEA_BRAND_ID,
  INVENTORY_BRANCHES,
  parseInventoryWorkbook,
} from './inventoryImportCore.mjs';
import { loadWorkbookSheets } from './xlsxSheetLoader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || (!args.has('--apply') && !args.has('--write-ts'));
const writeTs = args.has('--write-ts');

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim();
  }
}

function resolveXlsxPath() {
  const candidates = [
    path.join(ROOT, 'data/private/coftea-inventory-2026.xlsx'),
    process.env.INVENTORY_XLSX,
    '/Users/jcprolific/Downloads/COFTEA INVENTORY 2026.xlsx',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Inventory xlsx not found. Copy to ${candidates[0]}`);
}

function writeCofteaRawMaterialsTs(catalog) {
  const active = catalog.filter((c) => c.is_active);
  const categories = [...new Set(active.map((c) => c.category))];
  const lines = [
    '// Auto-generated from COFTEA INVENTORY 2026 import. Do not edit by hand.',
    '',
    'export interface CofteaRawMaterial {',
    '  id: string;',
    '  name: string;',
    '  category: string;',
    '  packaging: string;',
    '  unit: string;',
    '  price: number;',
    '  icon: string;',
    '  onHandQty: number;',
    '  lowStockQty: number;',
    '}',
    '',
    'export const RAW_MATERIAL_CATEGORY_ORDER = [',
    ...categories.map((c) => `  ${JSON.stringify(c)},`),
    '] as const;',
    '',
    'export const cofteaRawMaterials: CofteaRawMaterial[] = [',
    ...active.map(
      (m) =>
        `  { id: ${JSON.stringify(m.sku)}, name: ${JSON.stringify(m.name)}, category: ${JSON.stringify(m.category)}, packaging: ${JSON.stringify(m.packaging || '')}, unit: ${JSON.stringify(m.unit)}, price: ${m.price || 0}, icon: ${JSON.stringify(m.icon)}, onHandQty: 0, lowStockQty: ${m.low_stock_qty || 0} },`
    ),
    '];',
    '',
  ];
  const out = path.join(ROOT, 'src/data/cofteaRawMaterials.ts');
  fs.writeFileSync(out, lines.join('\n'));
  console.log(`Wrote ${active.length} items to ${out}`);
}

async function applyImport(payload) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || (!anonKey && !serviceKey)) {
    throw new Error('Set VITE_SUPABASE_URL and keys for --apply');
  }

  const supabase = createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false },
  });

  if (!serviceKey) {
    const email = process.env.HQ_IMPORT_EMAIL || 'hq@coftea.com';
    const password = process.env.HQ_IMPORT_PASSWORD || '123456';
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw new Error(`HQ login failed: ${authError.message}`);
  }

  const supplierIdByName = new Map();
  for (const s of payload.suppliers) {
    const { data, error } = await supabase
      .from('supplier')
      .upsert(
        {
          brand_id: s.brand_id,
          name: s.name,
          tin: s.tin,
          tax_type: s.tax_type,
          address: s.address,
          is_active: s.is_active,
        },
        { onConflict: 'brand_id,name' }
      )
      .select('id,name')
      .single();
    if (error) throw error;
    supplierIdByName.set(s.name, data.id);
  }
  console.log(`Suppliers upserted: ${supplierIdByName.size}`);

  const materialIdByKey = new Map();
  const batchSize = 40;
  for (let i = 0; i < payload.catalog.length; i += batchSize) {
    const batch = payload.catalog.slice(i, i + batchSize).map((m) => ({
      brand_id: m.brand_id,
      sku: m.sku,
      category: m.category,
      name: m.name,
      unit: m.unit,
      packaging: m.packaging,
      price: m.price,
      srp_price: m.srp_price ?? null,
      supplier_price: m.supplier_price ?? null,
      shipping_fee: m.shipping_fee ?? null,
      low_stock_qty: m.low_stock_qty,
      on_hand_qty: 0,
      icon: m.icon,
      sort_order: m.sort_order,
      is_active: m.is_active,
      source_sheet: m.source_sheet,
      source_row: m.source_row,
      supplier_id: m.preferred_supplier
        ? supplierIdByName.get(m.preferred_supplier) ?? null
        : null,
    }));
    const { data, error } = await supabase
      .from('raw_material')
      .upsert(batch, { onConflict: 'brand_id,category,name' })
      .select('id,category,name,sku');
    if (error) throw error;
    for (const row of data ?? []) {
      const key = `${row.category}::${row.name.toLowerCase().replace(/\s+/g, ' ')}`;
      materialIdByKey.set(key, row.id);
    }
    console.log(`Materials upserted: ${Math.min(i + batchSize, payload.catalog.length)}/${payload.catalog.length}`);
  }

  const { data: allMaterials, error: matErr } = await supabase
    .from('raw_material')
    .select('id,category,name')
    .eq('brand_id', COFTEA_BRAND_ID);
  if (matErr) throw matErr;
  for (const row of allMaterials ?? []) {
    const key = `${row.category}::${row.name.toLowerCase().replace(/\s+/g, ' ')}`;
    materialIdByKey.set(key, row.id);
  }

  const stockRows = [];
  for (const row of payload.branchStock) {
    const mid = materialIdByKey.get(row.material_key);
    if (!mid) continue;
    stockRows.push({
      brand_id: row.brand_id,
      branch_id: row.branch_id,
      raw_material_id: mid,
      on_hand_qty: row.on_hand_qty,
      low_stock_qty: row.low_stock_qty,
    });
  }

  const stockByPair = new Map();
  for (const row of stockRows) {
    stockByPair.set(`${row.branch_id}:${row.raw_material_id}`, row);
  }
  const dedupedStock = [...stockByPair.values()];
  for (let i = 0; i < dedupedStock.length; i += batchSize) {
    const batch = dedupedStock.slice(i, i + batchSize);
    const { error } = await supabase
      .from('branch_inventory')
      .upsert(batch, { onConflict: 'branch_id,raw_material_id' });
    if (error) throw error;
  }
  console.log(`Branch inventory rows upserted: ${dedupedStock.length}`);

  const movementRows = [];
  for (const mv of payload.movements) {
    const mid = materialIdByKey.get(mv.material_key);
    if (!mid) continue;
    movementRows.push({
      brand_id: mv.brand_id,
      branch_id: mv.branch_id,
      raw_material_id: String(mid),
      material_name: mv.material_name,
      movement_type: mv.movement_type,
      qty_before: 0,
      qty_delta: mv.qty_delta,
      qty_after: Math.max(0, mv.qty_delta),
      reason: mv.reason,
      created_by: 'inventory-import',
      created_at: mv.created_at,
    });
  }
  if (movementRows.length) {
    const { error } = await supabase.from('stock_movement').insert(movementRows);
    if (error) throw error;
  }
  console.log(`Stock movements inserted: ${movementRows.length}`);

  const usageByKey = new Map();
  for (const u of payload.usage) {
    const mid = materialIdByKey.get(u.material_key);
    if (!mid) continue;
    const key = `${u.branch_id}:${mid}:${u.usage_date}`;
    const prev = usageByKey.get(key);
    const qty = (prev?.qty ?? 0) + u.qty;
    usageByKey.set(key, {
      brand_id: u.brand_id,
      branch_id: u.branch_id,
      raw_material_id: mid,
      usage_date: u.usage_date,
      qty,
    });
  }
  const usageRows = [...usageByKey.values()];
  for (let i = 0; i < usageRows.length; i += batchSize) {
    const batch = usageRows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('inventory_usage_daily')
      .upsert(batch, { onConflict: 'branch_id,raw_material_id,usage_date' });
    if (error) throw error;
  }
  console.log(`Daily usage rows upserted: ${usageRows.length}`);
  console.log('Import complete.');
}

async function main() {
  loadEnvLocal();
  const xlsxPath = resolveXlsxPath();
  console.log(`Reading ${xlsxPath}`);
  const sheets = loadWorkbookSheets(fs.readFileSync(xlsxPath));
  const payload = parseInventoryWorkbook(sheets);

  console.log('\n--- Dry-run summary ---');
  console.log('Catalog items:', payload.catalog.length);
  console.log('Suppliers:', payload.suppliers.length);
  console.log('Branch stock rows (Tayug+Apricot):', payload.branchStock.length);
  console.log('Stock movements:', payload.movements.length);
  console.log('Unmatched movements:', payload.unmatchedMovements.length);
  console.log('Daily usage facts:', payload.usage.length);
  console.log('Unmatched usage names:', payload.unmatchedUsage.length);

  if (writeTs) {
    writeCofteaRawMaterialsTs(payload.catalog);
    return;
  }

  if (dryRun) {
    console.log('\nDry run only. Re-run with --apply to upsert into Supabase.');
    return;
  }

  await applyImport(payload);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
