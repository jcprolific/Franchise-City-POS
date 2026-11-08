/** Shared roster import normalizers (used by import script + vitest). */

export const BRAND_IDS = {
  coftea: 'a1000000-0000-4000-8000-000000000002',
  'la-lemon': 'a1000000-0000-4000-8000-000000000003',
  keki: 'a1000000-0000-4000-8000-000000000004',
  'meow-meow': 'a1000000-0000-4000-8000-000000000005',
  'pizza-pocholo': 'a1000000-0000-4000-8000-000000000006',
};

export const ROSTER_SHEETS = [
  { sheet: 'Coftea Roster', brandSlug: 'coftea' },
  { sheet: 'La Lemon Roster', brandSlug: 'la-lemon' },
  { sheet: 'Keki Roster', brandSlug: 'keki' },
  { sheet: 'Meow Roster', brandSlug: 'meow-meow' },
  { sheet: 'Pizza Pocholo Roster', brandSlug: 'pizza-pocholo' },
];

const NA_VALUES = new Set(['na', 'n/a', 'n.a', '-', '—', '']);

export function cleanCell(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (NA_VALUES.has(s.toLowerCase())) return '';
  return s;
}

export function normalizePhone(raw) {
  const s = cleanCell(raw);
  if (!s) return null;
  if (/[eE]/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 1e8) {
      return normalizePhone(String(Math.round(n)));
    }
  }
  let digits = s.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = `0${digits}`;
  }
  if (digits.length < 10 || digits.length > 13) return s.slice(0, 32);
  return digits;
}

export function excelSerialToIso(raw) {
  const s = cleanCell(raw);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 30000 || n > 60000) {
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
    return null;
  }
  const utc = Date.UTC(1899, 11, 30) + n * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

export function mapStoreStatus(primary, secondary, remarks) {
  const blob = [primary, secondary, remarks]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (!blob) return { storeStatus: 'inactive', unmapped: null };

  const rules = [
    [/waiting for loi|loi pending/, 'loi_pending'],
    [/for contract signing/, 'for_contract_signing'],
    [/downpayment|down payment|no dp yet/, 'downpayment'],
    [/for termination|for term\b/, 'for_termination'],
    [/\bbreach\b/, 'breach'],
    [/terminated|contract ended|contract released.*terminated/, 'terminated'],
    [/\bclosed\b|closing the shop|store is still open.*closed/, 'closed'],
    [/relocating|still looking for location|no location|transferring/, 'relocating'],
    [/under construction|not yet open|new- not yet open|newly open/, 'not_yet_open'],
    [/signed contract|contract signed/, 'signed_contract'],
    [/inactive|did not order|no order|temporarily closed/, 'inactive'],
    [/\bactive\b|daily orders|ordered 0-2|ordered 1 month|daily\/frequent/, 'active'],
  ];

  for (const [re, status] of rules) {
    if (re.test(blob)) return { storeStatus: status, unmapped: null };
  }

  return { storeStatus: 'inactive', unmapped: blob.slice(0, 120) };
}

export function mapOrderCadence(text) {
  const t = cleanCell(text).toLowerCase();
  if (!t) return null;
  if (t.includes('daily')) return 'daily';
  if (t.includes('0-2') || t.includes('0_2')) return '0_2_weeks';
  if (t.includes('1 month') || t.includes('1_month')) return '1_month';
  if (t.includes('2 month') || t.includes('2_month')) return '2_months';
  if (t.includes('3 month') || t.includes('more than 3')) return 'over_3_months';
  return 'unknown';
}

export function mapOnboardingStatus(storeStatus) {
  switch (storeStatus) {
    case 'active':
    case 'inactive':
    case 'relocating':
      return 'active';
    case 'breach':
    case 'for_termination':
      return 'suspended';
    case 'terminated':
    case 'closed':
      return 'suspended';
    case 'under_construction':
    case 'not_yet_open':
      return 'under_construction';
    case 'signed_contract':
    case 'for_contract_signing':
      return 'signed_contract';
    case 'downpayment':
    case 'loi_pending':
      return 'onboarding';
    default:
      return 'onboarding';
  }
}

export function isActiveFromStoreStatus(storeStatus) {
  return [
    'active',
    'inactive',
    'relocating',
    'loi_pending',
    'downpayment',
    'for_contract_signing',
    'signed_contract',
    'no_location',
    'under_construction',
    'not_yet_open',
  ].includes(storeStatus);
}

export function parseViber(raw) {
  const s = cleanCell(raw).toUpperCase();
  if (!s) return null;
  if (s === 'YES' || s === 'Y') return true;
  if (s === 'NO' || s === 'N') return false;
  return null;
}

export function parseContractSigned(raw) {
  const s = cleanCell(raw).toUpperCase();
  if (!s) return null;
  if (s === 'YES' || s === 'Y') return true;
  if (s === 'NO' || s === 'N') return false;
  return null;
}

/** Column finder from header row (supports duplicate labels via exact match). */
export function buildHeaderFinder(rowObj) {
  const entries = [];
  for (const [col, label] of Object.entries(rowObj)) {
    const exact = cleanCell(label);
    if (!exact) continue;
    entries.push({ col: Number(col), exact, lower: exact.toLowerCase() });
  }
  return {
    col(...lowerNames) {
      for (const name of lowerNames) {
        const hit = entries.find((e) => e.lower === name.toLowerCase());
        if (hit) return hit.col;
      }
      return null;
    },
    colExact(label) {
      const hit = entries.find((e) => e.exact === label);
      return hit ? hit.col : null;
    },
  };
}

function cell(row, colIndex) {
  if (colIndex == null) return '';
  return cleanCell(row[colIndex]);
}

export function mapRosterRow({ brandSlug, brandId, sheetName, rowNumber, row, headerFinder: h }) {
  const franchiseeName = cell(row, h.col('franchisee name', 'name'));
  const franchiseName = cell(row, h.col('franchise name', 'branch name'));
  const statusPrimary = cell(row, h.colExact('Status') ?? h.col('status'));
  const statusSecondary = cell(row, h.colExact('STATUS') ?? h.col('store status'));
  const remarks = cell(row, h.col('remarks', 'store update'));

  const storeName = franchiseName || franchiseeName;
  if (!storeName) return null;

  const { storeStatus, unmapped } = mapStoreStatus(statusPrimary, statusSecondary, remarks);

  const branchCodeRaw = cell(row, h.colExact('F') ?? h.col('f', '#'));
  const branchCode =
    branchCodeRaw && /^\d/.test(branchCodeRaw)
      ? `${brandSlug.toUpperCase().slice(0, 2)}-${branchCodeRaw.replace(/\.0$/, '')}`
      : null;

  const address = cell(
    row,
    h.col('branch address', 'store address', 'branch mapping')
  );
  const homeAddress = cell(row, h.col('home address'));
  const email = cell(row, h.col('email address')).toLowerCase();
  const phone = normalizePhone(cell(row, h.col('contact number')));
  const franchisePackage = cell(row, h.col('franchise package'));
  const agentName = cell(row, h.col('agent name', 'agent created telegram'));
  const contractStatus = cell(row, h.col('contract status'));
  const contractSigned = parseContractSigned(cell(row, h.col('contract signed')));
  const viberAdded = parseViber(cell(row, h.col('added on viber')));
  const paymentDate = excelSerialToIso(cell(row, h.col('date of payment', 'date of contract')));
  const lastPo = excelSerialToIso(cell(row, h.col('date of last p.o', 'date of last po')));
  const orderCadence = mapOrderCadence(remarks || statusSecondary);

  const notesParts = [remarks, unmapped ? `unmapped:${unmapped}` : ''].filter(Boolean);

  return {
    brand_id: brandId,
    name: storeName,
    business_name: franchiseName || storeName,
    franchisee_name: franchiseeName || storeName,
    franchisee_phone: phone,
    franchisee_email: email || null,
    address: address || null,
    home_address: homeAddress || null,
    city: null,
    branch_code: branchCode,
    franchise_package: franchisePackage || null,
    contract_start_date: paymentDate,
    opening_date: paymentDate,
    store_status: storeStatus,
    onboarding_status: mapOnboardingStatus(storeStatus),
    is_active: isActiveFromStoreStatus(storeStatus),
    order_cadence: orderCadence,
    last_po_date: lastPo,
    contract_status: contractStatus || null,
    contract_signed: contractSigned,
    agent_name: agentName || null,
    viber_added: viberAdded,
    source_sheet: sheetName,
    source_row: rowNumber,
    notes: notesParts.join(' | ') || null,
  };
}
