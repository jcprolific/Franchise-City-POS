/** Coftea Inventory 2026 xlsx → Supabase payloads (shared by CLI + vitest). */

import { buildHeaderFinder, cleanCell, excelSerialToIso } from './rosterImportCore.mjs';

export { buildHeaderFinder, cleanCell, excelSerialToIso };

export const COFTEA_BRAND_ID = 'a1000000-0000-4000-8000-000000000002';

export const INVENTORY_BRANCHES = {
  tayug: {
    sheetKey: 'Tayug_Inventory',
    dailySheet: 'Tayug Daily Total',
    branchId: '38ae617a-c7c0-461f-b7d7-0cf1b579d78b',
    label: 'Tayug',
  },
  apricot: {
    sheetKey: 'Apricot_Inventory',
    dailySheet: 'Apricot Daily Total',
    branchId: 'afde73d4-c2c7-4446-951a-b284db2e3a4c',
    label: 'Apricot',
  },
};

const PLACEHOLDER_SKUS = new Set(['item', 'easy', '338', '339', '340', '341']);

/** Legacy Stock_Movements SKU codes → catalog item name */
export const LEGACY_MOVEMENT_SKU_NAMES = {
  'MT-PEARL-01': 'Tapioca',
  'MT-TEA-01': 'Assam Tea',
  'MT-CUP-22': '22oz Plastic Cups',
};

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/** Name → { packaging, icon } from PO Form fallback catalog */
export const PO_FORM_ENRICHMENTS = {
  'brown sugar': { packaging: '2.5kg', icon: '🍯' },
  'caramel drizzle (brown)': { packaging: '2.5kg', icon: '🍮' },
  chocolate: { packaging: '2.5kg', icon: '🍫' },
  'coffee extract': { packaging: '2L', icon: '☕' },
  tapioca: { packaging: '1kg', icon: '⚫' },
  'whipping cream': { packaging: '1kg', icon: '🍦' },
  matcha: { packaging: '1kg', icon: '🍵' },
  'countertop menu': { packaging: '1pc', icon: '📋' },
  'sealing machine': { packaging: '1pc', icon: '⚙️' },
};

const CATEGORY_ICONS = {
  'Easy Syrup': '🍯',
  'Millim Syrup': '🍏',
  'Easy Powder': '🥛',
  Powder: '🥤',
  HYX: '🔴',
  Jam: '🫙',
  Sauce: '🍫',
  Sinkers: '⚫',
  Toppings: '🧁',
  Packaging: '📦',
  Supplies: '🛠️',
  Signage: '🪧',
  GE: '🍦',
  TnUs: '🔧',
};

export function normalizeNameKey(name) {
  return cleanCell(name).toLowerCase().replace(/\s+/g, ' ');
}

export function materialKey(category, name) {
  return `${cleanCell(category)}::${normalizeNameKey(name)}`;
}

export function parsePeso(raw) {
  const s = cleanCell(raw);
  if (!s || s.startsWith('#')) return 0;
  const n = Number(s.replace(/[₱,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function parseQty(raw) {
  const s = cleanCell(raw);
  if (!s || s.startsWith('#')) return 0;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function parseActive(raw) {
  const s = cleanCell(raw).toLowerCase();
  if (!s) return true;
  return s === 'yes' || s === 'y' || s === 'true' || s === '1';
}

export function normalizeSku(raw, category, name) {
  const s = cleanCell(raw);
  if (s && !PLACEHOLDER_SKUS.has(s.toLowerCase()) && !/^\d+$/.test(s)) {
    return s.slice(0, 64);
  }
  return slugSku(category, name);
}

export function slugSku(category, name) {
  const base = `${cleanCell(category)}-${cleanCell(name)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 64) || 'item';
}

export function mapMovementType(excelType) {
  const t = cleanCell(excelType).toLowerCase();
  if (t.includes('opening')) return 'receive';
  if (t.includes('transfer out') || t.includes('usage')) return 'issue';
  if (t.includes('adjustment')) return 'adjustment';
  if (t.includes('transfer in') || t.includes('receive')) return 'receive';
  return null;
}

export function branchIdFromLabel(label) {
  const t = cleanCell(label).toLowerCase();
  if (t.includes('tayug')) return INVENTORY_BRANCHES.tayug.branchId;
  if (t.includes('apricot')) return INVENTORY_BRANCHES.apricot.branchId;
  return null;
}

function findHeaderRow(sheetRows, ...needles) {
  const nums = Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b);
  for (const rowNum of nums) {
    const blob = Object.values(sheetRows[rowNum]).join(' ').toLowerCase();
    if (needles.every((n) => blob.includes(n.toLowerCase()))) return rowNum;
  }
  return null;
}

function rowVal(row, col) {
  if (col == null) return '';
  return row[col] ?? '';
}

function enrichItem(category, name, packaging) {
  const key = normalizeNameKey(name);
  const po = PO_FORM_ENRICHMENTS[key];
  const icon = po?.icon ?? CATEGORY_ICONS[category] ?? '📦';
  const pack = cleanCell(packaging) || po?.packaging || '';
  return { packaging: pack, icon };
}

export function parseItemSetup(sheetRows) {
  const headerRowNum = findHeaderRow(sheetRows, 'item name', 'category');
  if (!headerRowNum) return [];

  const hf = buildHeaderFinder(sheetRows[headerRowNum]);
  const colSku = hf.col('sku') ?? 1;
  const colCategory = hf.col('category') ?? 2;
  const colName = hf.col('item name') ?? 3;
  const colUnit = hf.col('unit') ?? 4;
  const colMaintaining = hf.col('maintaining stocks') ?? hf.col('maintaining') ?? 5;
  const colBasePrice = hf.col('base price') ?? 6;
  const colSupplier = hf.col('preferred supplier') ?? hf.col('supplier') ?? 7;
  const colActive = hf.col('active') ?? 8;

  const items = [];
  let sortOrder = 0;
  for (const rowNum of Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (rowNum <= headerRowNum) continue;
    const row = sheetRows[rowNum];
    const name = cleanCell(rowVal(row, colName));
    const category = cleanCell(rowVal(row, colCategory));
    if (!name || !category) continue;
    if (name.toLowerCase() === 'item name') continue;

    const { packaging, icon } = enrichItem(category, name, '');
    sortOrder += 1;
    items.push({
      brand_id: COFTEA_BRAND_ID,
      sku: normalizeSku(rowVal(row, colSku), category, name),
      category,
      name,
      unit: cleanCell(rowVal(row, colUnit)) || 'pcs',
      low_stock_qty: parseQty(rowVal(row, colMaintaining)),
      price: parsePeso(rowVal(row, colBasePrice)),
      preferred_supplier: cleanCell(rowVal(row, colSupplier)),
      is_active: parseActive(rowVal(row, colActive)),
      packaging,
      icon,
      sort_order: sortOrder,
      source_sheet: 'Item_Setup',
      source_row: rowNum,
      key: materialKey(category, name),
    });
  }
  return items;
}

export function parseBasePriceSheet(sheetRows) {
  const headerRowNum = findHeaderRow(sheetRows, 'srp price', 'base price');
  if (!headerRowNum) return new Map();

  const hf = buildHeaderFinder(sheetRows[headerRowNum]);
  const colSrp = hf.col('srp price') ?? hf.colExact('SRP Price') ?? 2;
  const colBase = hf.col('base price') ?? 3;
  const colSupplierPrice = hf.col('supplier price') ?? 5;
  const colShipping = hf.col('transpo / shipping fee') ?? hf.col('shipping') ?? 6;

  const byRow = new Map();
  for (const rowNum of Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (rowNum <= headerRowNum) continue;
    const row = sheetRows[rowNum];
    const srp = parsePeso(rowVal(row, colSrp));
    const base = parsePeso(rowVal(row, colBase));
    if (srp === 0 && base === 0) continue;
    byRow.set(rowNum, {
      srp_price: srp || null,
      price: base || srp,
      supplier_price: parsePeso(rowVal(row, colSupplierPrice)) || null,
      shipping_fee: parsePeso(rowVal(row, colShipping)) || null,
    });
  }
  return byRow;
}

export function mergeBasePrices(catalog, priceByRow) {
  const rows = [...priceByRow.keys()].sort((a, b) => a - b);
  for (let i = 0; i < catalog.length && i < rows.length; i++) {
    const p = priceByRow.get(rows[i]);
    if (!p) continue;
    if (p.price > 0) catalog[i].price = p.price;
    catalog[i].srp_price = p.srp_price;
    catalog[i].supplier_price = p.supplier_price;
    catalog[i].shipping_fee = p.shipping_fee;
  }
  return catalog;
}

export function parseSupplierTin(sheetRows) {
  const suppliers = [];
  const seen = new Set();
  for (const rowNum of Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)) {
    const row = sheetRows[rowNum];
    const cells = Object.values(row).map((c) => cleanCell(c));
    const tin = cells.find((c) => /^\d{3}-\d{3}-\d{3}-\d{3}$/.test(c));
    if (!tin) continue;
    const taxType = cells.find((c) => /vat/i.test(c)) ?? null;
    const address = cells.find((c) => c.length > 20 && !/vat/i.test(c)) ?? '';
    const name =
      cells.find((c) => /global pacific|top creamery|local supplier|fresco|valenzuela|pasig/i.test(c)) ??
      `Supplier ${tin}`;
    const key = normalizeNameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    suppliers.push({
      brand_id: COFTEA_BRAND_ID,
      name: name.slice(0, 120),
      tin,
      tax_type: taxType,
      address: address.slice(0, 500),
      is_active: true,
    });
  }

  for (const pref of ['Global Pacific', 'Local Supplier', 'Top Creamery']) {
    if (!seen.has(normalizeNameKey(pref))) {
      suppliers.push({
        brand_id: COFTEA_BRAND_ID,
        name: pref,
        tin: null,
        tax_type: null,
        address: null,
        is_active: true,
      });
    }
  }
  return suppliers;
}

export function parseBranchInventorySheet(sheetRows, branchId, sheetName, catalogByKey) {
  const headerRowNum = findHeaderRow(sheetRows, 'item name', 'ending qty');
  if (!headerRowNum) return [];

  const hf = buildHeaderFinder(sheetRows[headerRowNum]);
  const colCategory = hf.col('category') ?? 2;
  const colName = hf.col('item name') ?? 3;
  const colMaintaining = hf.col('maintaining stocks') ?? 5;
  const colEnding =
    hf.col('ending qty') ?? hf.colExact('Ending Qty') ?? hf.col('current stocks (formula)') ?? 11;

  const rows = [];
  for (const rowNum of Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (rowNum <= headerRowNum) continue;
    const row = sheetRows[rowNum];
    const name = cleanCell(rowVal(row, colName));
    const category = cleanCell(rowVal(row, colCategory));
    if (!name) continue;
    const key = materialKey(category, name);
    if (!catalogByKey.has(key)) continue;

    let onHand = parseQty(rowVal(row, colEnding));
    if (onHand === 0) {
      const manualCol = hf.col('current stocks (manual)');
      const formulaCol = hf.col('current stocks (formula)');
      onHand = parseQty(rowVal(row, formulaCol)) || parseQty(rowVal(row, manualCol));
    }

    rows.push({
      brand_id: COFTEA_BRAND_ID,
      branch_id: branchId,
      material_key: key,
      on_hand_qty: onHand,
      low_stock_qty: parseQty(rowVal(row, colMaintaining)),
      source_sheet: sheetName,
      source_row: rowNum,
    });
  }
  return rows;
}

export function parseStockMovements(sheetRows, catalogByKey, catalogByName) {
  const headerRowNum = findHeaderRow(sheetRows, 'movement type', 'branch');
  if (!headerRowNum) return { movements: [], unmatched: [] };

  const hf = buildHeaderFinder(sheetRows[headerRowNum]);
  const colDate = hf.col('date') ?? 1;
  const colBranch = hf.col('branch') ?? 2;
  const colType = hf.col('movement type') ?? 3;
  const colSku = hf.col('sku') ?? 4;
  const colName = hf.col('item name') ?? 5;
  const colQtyIn = hf.col('qty in') ?? 6;
  const colQtyOut = hf.col('qty out') ?? 7;
  const colAdjust = hf.col('adjustment (+/-)') ?? hf.col('adjustment') ?? 8;
  const colRef = hf.col('reference') ?? 9;
  const colRemarks = hf.col('remarks') ?? 10;

  const movements = [];
  const unmatched = [];
  let lastBranchId = INVENTORY_BRANCHES.tayug.branchId;
  let lastDate = '2026-04-01';

  for (const rowNum of Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (rowNum <= headerRowNum) continue;
    const row = sheetRows[rowNum];
    const branchLabel = cleanCell(rowVal(row, colBranch));
    if (branchLabel) {
      const bid = branchIdFromLabel(branchLabel);
      if (bid) lastBranchId = bid;
    }
    const dateRaw = cleanCell(rowVal(row, colDate));
    if (dateRaw) {
      const iso = excelSerialToIso(dateRaw) ?? (dateRaw.match(/^\d{4}-\d{2}-\d{2}/) ? dateRaw.slice(0, 10) : null);
      if (iso) lastDate = iso;
    }

    const movementType = mapMovementType(rowVal(row, colType));
    if (!movementType) continue;

    const itemName = cleanCell(rowVal(row, colName));
    const sku = cleanCell(rowVal(row, colSku));
    let material = null;
    if (itemName) {
      material = catalogByName.get(normalizeNameKey(itemName));
    }
    if (!material && sku) {
      const legacyName = LEGACY_MOVEMENT_SKU_NAMES[sku];
      if (legacyName) {
        material = catalogByName.get(normalizeNameKey(legacyName));
      }
      if (!material) {
        for (const m of catalogByKey.values()) {
          if (m.sku === sku) {
            material = m;
            break;
          }
        }
      }
    }
    if (!material) {
      unmatched.push({ rowNum, sku, itemName: itemName || sku });
      continue;
    }

    const qtyIn = parseQty(rowVal(row, colQtyIn));
    const qtyOut = parseQty(rowVal(row, colQtyOut));
    const adjust = parseQty(rowVal(row, colAdjust));
    let qtyDelta = 0;
    if (movementType === 'receive') qtyDelta = qtyIn || adjust;
    else if (movementType === 'issue') qtyDelta = -(qtyOut || qtyIn);
    else qtyDelta = adjust || qtyIn - qtyOut;

    const reason = [cleanCell(rowVal(row, colRef)), cleanCell(rowVal(row, colRemarks))]
      .filter(Boolean)
      .join(' — ');

    movements.push({
      brand_id: COFTEA_BRAND_ID,
      branch_id: lastBranchId,
      material_key: material.key,
      material_name: material.name,
      movement_type: movementType,
      qty_delta: qtyDelta,
      reason,
      created_at: `${lastDate}T08:00:00.000Z`,
      source_row: rowNum,
    });
  }
  return { movements, unmatched };
}

function monthAtColumn(sheetRows, headerRowNum, col) {
  const monthByCol = {};
  for (let r = 1; r < headerRowNum; r++) {
    const row = sheetRows[r] ?? {};
    for (const [c, val] of Object.entries(row)) {
      const label = cleanCell(val);
      const month = MONTHS[label.toLowerCase()];
      if (month) monthByCol[Number(c)] = month;
    }
  }
  let month = 4;
  const cols = Object.keys(monthByCol)
    .map(Number)
    .sort((a, b) => a - b);
  for (const c of cols) {
    if (c <= col) month = monthByCol[c];
  }
  return month;
}

function dayColumnDate(sheetRows, headerRowNum, col, dayNum) {
  const row3 = sheetRows[headerRowNum - 1] ?? {};
  const weekday = cleanCell(row3[col]).toLowerCase();
  if (weekday === 'total') return null;
  const month = monthAtColumn(sheetRows, headerRowNum, col);
  const day = Math.round(dayNum);
  if (day < 1 || day > 31) return null;
  const iso = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) return null;
  return iso;
}

/** Parse daily usage grid (Item Name + day-of-month columns under month headers). */
export function parseDailyUsageSheet(sheetRows, branchId, sheetName, catalogByName) {
  const headerRowNum = findHeaderRow(sheetRows, 'item name');
  if (!headerRowNum) return { usage: [], unmatched: [] };

  const headerRow = sheetRows[headerRowNum];
  const dayCols = [];
  for (const [col, val] of Object.entries(headerRow)) {
    const n = Number(cleanCell(val));
    if (Number.isFinite(n) && n > 40000 && n < 60000) {
      const iso = excelSerialToIso(String(n));
      if (iso) dayCols.push({ col: Number(col), usage_date: iso });
      continue;
    }
    if (Number.isFinite(n) && n >= 1 && n <= 31) {
      const iso = dayColumnDate(sheetRows, headerRowNum, Number(col), n);
      if (iso) dayCols.push({ col: Number(col), usage_date: iso });
    }
  }

  const colName =
    Object.entries(headerRow).find(([, v]) => normalizeNameKey(v) === 'item name')?.[0] ?? 1;

  const usage = [];
  const unmatched = [];
  for (const rowNum of Object.keys(sheetRows)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (rowNum <= headerRowNum) continue;
    const row = sheetRows[rowNum];
    const name = cleanCell(rowVal(row, Number(colName)));
    if (!name) continue;
    const material = catalogByName.get(normalizeNameKey(name));
    if (!material) {
      unmatched.push({ rowNum, name });
      continue;
    }
    for (const { col, usage_date } of dayCols) {
      const qty = parseQty(rowVal(row, col));
      if (qty <= 0) continue;
      usage.push({
        brand_id: COFTEA_BRAND_ID,
        branch_id: branchId,
        material_key: material.key,
        usage_date,
        qty,
        source_sheet: sheetName,
        source_row: rowNum,
      });
    }
  }
  return { usage, unmatched };
}

export function buildCatalogIndexes(catalog) {
  const catalogByKey = new Map();
  const catalogByName = new Map();
  for (const item of catalog) {
    catalogByKey.set(item.key, item);
    catalogByName.set(normalizeNameKey(item.name), item);
  }
  return { catalogByKey, catalogByName };
}

export function dedupeCatalog(catalog) {
  const byKey = new Map();
  for (const item of catalog) {
    byKey.set(item.key, item);
  }
  return [...byKey.values()].sort((a, b) => a.sort_order - b.sort_order);
}

export function parseInventoryWorkbook(sheets) {
  const catalog = dedupeCatalog(parseItemSetup(sheets['Item_Setup'] ?? {}));
  const priceByRow = parseBasePriceSheet(sheets['Base Price vs SRP Sheet'] ?? {});
  mergeBasePrices(catalog, priceByRow);

  const { catalogByKey, catalogByName } = buildCatalogIndexes(catalog);
  const suppliers = parseSupplierTin(sheets['SUPPLIER TIN'] ?? {});

  const branchStock = [];
  for (const cfg of Object.values(INVENTORY_BRANCHES)) {
    const sheet = sheets[cfg.sheetKey];
    if (sheet) {
      branchStock.push(
        ...parseBranchInventorySheet(sheet, cfg.branchId, cfg.sheetKey, catalogByKey)
      );
    }
  }

  const { movements, unmatched: unmatchedMovements } = parseStockMovements(
    sheets['Stock_Movements'] ?? {},
    catalogByKey,
    catalogByName
  );

  const usage = [];
  const unmatchedUsage = [];
  for (const cfg of Object.values(INVENTORY_BRANCHES)) {
    const sheet = sheets[cfg.dailySheet];
    if (!sheet) continue;
    const parsed = parseDailyUsageSheet(sheet, cfg.branchId, cfg.dailySheet, catalogByName);
    usage.push(...parsed.usage);
    unmatchedUsage.push(...parsed.unmatched);
  }

  return {
    catalog,
    suppliers,
    branchStock,
    movements,
    usage,
    unmatchedMovements,
    unmatchedUsage,
  };
}
