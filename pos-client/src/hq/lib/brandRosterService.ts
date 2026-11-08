import { supabase } from '../../lib/supabase';
import { rosterBrandName } from '../../brands/rosterBrands';

export type StoreStatus =
  | 'loi_pending'
  | 'downpayment'
  | 'for_contract_signing'
  | 'signed_contract'
  | 'no_location'
  | 'under_construction'
  | 'not_yet_open'
  | 'active'
  | 'inactive'
  | 'relocating'
  | 'breach'
  | 'for_termination'
  | 'terminated'
  | 'closed';

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  loi_pending: 'LOI Pending',
  downpayment: 'Downpayment',
  for_contract_signing: 'For Contract Signing',
  signed_contract: 'Signed Contract',
  no_location: 'No Location',
  under_construction: 'Under Construction',
  not_yet_open: 'Not Yet Open',
  active: 'Active',
  inactive: 'Inactive',
  relocating: 'Relocating',
  breach: 'Breach',
  for_termination: 'For Termination',
  terminated: 'Terminated',
  closed: 'Closed',
};

export const PIPELINE_STATUSES: StoreStatus[] = [
  'loi_pending',
  'downpayment',
  'for_contract_signing',
  'signed_contract',
  'no_location',
  'under_construction',
  'not_yet_open',
];

export interface RosterBranchRow {
  id: string;
  brand_id: string;
  brand_name: string;
  name: string;
  branch_code: string | null;
  franchisee_name: string | null;
  franchisee_phone: string | null;
  franchisee_email: string | null;
  address: string | null;
  home_address: string | null;
  city: string | null;
  store_status: StoreStatus;
  is_active: boolean;
  franchise_package: string | null;
  agent_name: string | null;
  contract_status: string | null;
  contract_signed: boolean | null;
  last_po_date: string | null;
  order_cadence: string | null;
  viber_added: boolean | null;
  notes: string | null;
  termination_reason: string | null;
  terminated_at: string | null;
  opening_date: string | null;
  source_sheet: string | null;
  source_row: number | null;
}

const SELECT_FIELDS =
  'id,brand_id,name,branch_code,franchisee_name,franchisee_phone,franchisee_email,address,home_address,city,store_status,is_active,franchise_package,agent_name,contract_status,contract_signed,last_po_date,order_cadence,viber_added,notes,termination_reason,terminated_at,opening_date,source_sheet,source_row';

export interface FetchRosterOptions {
  brandId?: string | null;
  storeStatus?: StoreStatus | 'all';
  search?: string;
}

export async function fetchRosterBranches(
  options: FetchRosterOptions = {}
): Promise<RosterBranchRow[] | null> {
  let query = supabase.from('branch').select(SELECT_FIELDS).order('name', { ascending: true });

  if (options.brandId) {
    query = query.eq('brand_id', options.brandId);
  }

  if (options.storeStatus && options.storeStatus !== 'all') {
    query = query.eq('store_status', options.storeStatus);
  }

  const { data, error } = await query.limit(2000);
  if (error) {
    console.error('fetchRosterBranches', error);
    return null;
  }

  const rows = (data ?? []) as Omit<RosterBranchRow, 'brand_name'>[];
  const search = options.search?.trim().toLowerCase() ?? '';

  return rows
    .map((row) => ({
      ...row,
      brand_name: rosterBrandName(row.brand_id),
      store_status: row.store_status as StoreStatus,
    }))
    .filter((row) => {
      if (!search) return true;
      const hay = [
        row.name,
        row.franchisee_name,
        row.franchisee_email,
        row.franchisee_phone,
        row.address,
        row.city,
        row.branch_code,
        row.brand_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(search);
    });
}

export function summarizeRoster(rows: RosterBranchRow[]) {
  const byStatus: Partial<Record<StoreStatus, number>> = {};
  let active = 0;
  let inactive = 0;
  let breach = 0;
  let terminated = 0;
  let pipeline = 0;

  for (const row of rows) {
    byStatus[row.store_status] = (byStatus[row.store_status] ?? 0) + 1;
    if (row.store_status === 'active') active += 1;
    if (row.store_status === 'inactive') inactive += 1;
    if (row.store_status === 'breach') breach += 1;
    if (row.store_status === 'terminated' || row.store_status === 'closed') terminated += 1;
    if (PIPELINE_STATUSES.includes(row.store_status)) pipeline += 1;
  }

  return {
    total: rows.length,
    active,
    inactive,
    breach,
    terminated,
    pipeline,
    byStatus,
  };
}

export function storeStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  if (status in STORE_STATUS_LABELS) {
    return STORE_STATUS_LABELS[status as StoreStatus];
  }
  return status.replace(/_/g, ' ');
}
