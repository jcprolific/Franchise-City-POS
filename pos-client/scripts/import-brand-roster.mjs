#!/usr/bin/env node
/**
 * Import all-brand roster from Excel into public.branch.
 *
 * Usage:
 *   node scripts/import-brand-roster.mjs --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-brand-roster.mjs --apply
 *
 * Default xlsx path (gitignored):
 *   data/private/all-brand-roster-2025.xlsx
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import {
  BRAND_IDS,
  ROSTER_SHEETS,
  buildHeaderFinder,
  mapRosterRow,
} from './rosterImportCore.mjs';
import { loadWorkbookSheets } from './xlsxSheetLoader.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || (!args.has('--apply') && !args.has('--write-json'));
const writeJson = args.has('--write-json');

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
    path.join(ROOT, 'data/private/all-brand-roster-2025.xlsx'),
    process.env.ROSTER_XLSX,
    '/Users/jcprolific/Downloads/!!!UPDATED ALL BRAND ROSTER 2025.xlsx',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Roster xlsx not found. Copy file to ${candidates[0]}`);
}

function collectRows(sheetRows, brandSlug, brandId, sheetName) {
  const headerRowNum = Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)
    .find((r) => {
      const row = sheetRows[r];
      const text = Object.values(row).join(' ').toLowerCase();
      return text.includes('franchisee') || text.includes('franchise name');
    });
  if (!headerRowNum) return [];

  const headerFinder = buildHeaderFinder(sheetRows[headerRowNum]);
  const mapped = [];
  for (const rowNum of Object.keys(sheetRows).map(Number).sort((a, b) => a - b)) {
    if (rowNum <= headerRowNum) continue;
    const row = sheetRows[rowNum];
    const record = mapRosterRow({
      brandSlug,
      brandId,
      sheetName,
      rowNumber: rowNum,
      row,
      headerFinder,
    });
    if (record) mapped.push(record);
  }
  return mapped;
}

async function main() {
  loadEnvLocal();
  const xlsxPath = resolveXlsxPath();
  console.log(`Reading ${xlsxPath}`);
  const { readFileSync } = await import('node:fs');
  const sheets = loadWorkbookSheets(readFileSync(xlsxPath));

  const allRows = [];
  const unmapped = [];
  for (const { sheet, brandSlug } of ROSTER_SHEETS) {
    const brandId = BRAND_IDS[brandSlug];
    const sheetRows = sheets[sheet];
    if (!sheetRows) {
      console.warn(`Missing sheet: ${sheet}`);
      continue;
    }
    const rows = collectRows(sheetRows, brandSlug, brandId, sheet);
    allRows.push(...rows);
    console.log(`${sheet}: ${rows.length} rows`);
  }

  const byBrand = {};
  const byStatus = {};
  let missingEmail = 0;
  for (const row of allRows) {
    byBrand[row.brand_id] = (byBrand[row.brand_id] || 0) + 1;
    byStatus[row.store_status] = (byStatus[row.store_status] || 0) + 1;
    if (!row.franchisee_email) missingEmail += 1;
    if (row.notes?.includes('unmapped:')) unmapped.push(row.notes);
  }

  console.log('\n--- Dry-run summary ---');
  console.log('Total rows:', allRows.length);
  console.log('By status:', byStatus);
  console.log('Missing email:', missingEmail);
  console.log('Sample unmapped notes:', unmapped.slice(0, 5));

  if (writeJson) {
    const outPath = path.join(ROOT, 'data/private/roster-import.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(allRows));
    console.log(`Wrote ${allRows.length} rows to ${outPath}`);
    return;
  }

  if (dryRun) {
    console.log('\nDry run only. Re-run with --apply to upsert into Supabase.');
    return;
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || (!anonKey && !serviceKey)) {
    throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) for --apply');
  }

  const supabase = createClient(url, serviceKey || anonKey, {
    auth: { persistSession: false },
  });

  if (!serviceKey) {
    const email = process.env.HQ_IMPORT_EMAIL || 'hq@coftea.com';
    const password = process.env.HQ_IMPORT_PASSWORD || '123456';
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      throw new Error(`HQ login failed for import: ${authError.message}`);
    }
  }
  const batchSize = 50;
  let upserted = 0;
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize);
    const { error } = await supabase.from('branch').upsert(batch, {
      onConflict: 'brand_id,source_sheet,source_row',
    });
    if (error) throw error;
    upserted += batch.length;
    console.log(`Upserted ${upserted}/${allRows.length}`);
  }
  console.log('Import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
