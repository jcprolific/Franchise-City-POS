import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Store, AlertTriangle, Ban, Activity, ClipboardList } from 'lucide-react';
import { ROSTER_BRANDS } from '../../brands/rosterBrands';
import {
  fetchRosterBranches,
  summarizeRoster,
  storeStatusLabel,
  STORE_STATUS_LABELS,
  type RosterBranchRow,
  type StoreStatus,
} from '../lib/brandRosterService';
import './BranchManagement.css';
import './BrandRosterPage.css';

type BrandFilter = 'all' | string;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusClass(status: StoreStatus): string {
  if (status === 'active') return 'roster-pill roster-pill--active';
  if (status === 'inactive' || status === 'relocating') return 'roster-pill roster-pill--muted';
  if (status === 'breach' || status === 'for_termination') return 'roster-pill roster-pill--warn';
  if (status === 'terminated' || status === 'closed') return 'roster-pill roster-pill--closed';
  return 'roster-pill roster-pill--pipeline';
}

function filterBySearch(rows: RosterBranchRow[], query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => {
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

export default function BrandRosterPage() {
  const [allRows, setAllRows] = useState<RosterBranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StoreStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<RosterBranchRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const data = await fetchRosterBranches({});
    if (!data) {
      setError('Could not load roster. Sign in as HQ and confirm franchise tables are migrated.');
      setAllRows([]);
    } else {
      setAllRows(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rosterTabs = useMemo(
    () => [
      { id: 'all' as const, label: 'All Brands' },
      ...ROSTER_BRANDS.filter((b) => b.slug !== 'potato-corner').map((b) => ({
        id: b.dbBrandId,
        label: b.shortName,
      })),
    ],
    []
  );

  const countByBrandId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) {
      counts.set(row.brand_id, (counts.get(row.brand_id) ?? 0) + 1);
    }
    return counts;
  }, [allRows]);

  const brandScopedRows = useMemo(() => {
    if (brandFilter === 'all') return allRows;
    return allRows.filter((row) => row.brand_id === brandFilter);
  }, [allRows, brandFilter]);

  const summary = useMemo(() => summarizeRoster(brandScopedRows), [brandScopedRows]);

  const tableRows = useMemo(() => {
    let list = brandScopedRows;
    if (statusFilter !== 'all') {
      list = list.filter((row) => row.store_status === statusFilter);
    }
    return filterBySearch(list, search);
  }, [brandScopedRows, statusFilter, search]);

  const selectedBrandLabel = useMemo(() => {
    if (brandFilter === 'all') return 'All brands';
    return rosterTabs.find((t) => t.id === brandFilter)?.label ?? 'Brand';
  }, [brandFilter, rosterTabs]);

  const tabCount = useCallback(
    (tabId: BrandFilter) => {
      if (tabId === 'all') return allRows.length;
      return countByBrandId.get(tabId) ?? 0;
    },
    [allRows.length, countByBrandId]
  );

  return (
    <div className="page-container brand-roster-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Brand Roster</h1>
          <p>Network-wide franchise store list imported from the 2025 all-brand roster workbook.</p>
        </div>
      </div>

      <div className="roster-brand-tabs" role="tablist" aria-label="Brand filter">
        {rosterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={brandFilter === tab.id}
            className={`roster-brand-tab ${brandFilter === tab.id ? 'active' : ''}`}
            onClick={() => {
              setBrandFilter(tab.id);
              setSelected(null);
            }}
          >
            <span>{tab.label}</span>
            <span className="roster-brand-tab-count">{tabCount(tab.id)}</span>
          </button>
        ))}
      </div>

      <p className="roster-kpi-context">
        Showing stats for <strong>{selectedBrandLabel}</strong> · {summary.total} stores
      </p>

      <div className="branch-kpi-row roster-kpi-row">
        <div className="branch-kpi-card">
          <span className="branch-kpi-icon branch-kpi-icon--green">
            <Store size={18} />
          </span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Active</span>
            <span className="branch-kpi-value">{summary.active}</span>
          </div>
        </div>
        <div className="branch-kpi-card">
          <span className="branch-kpi-icon">
            <Activity size={18} />
          </span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Inactive</span>
            <span className="branch-kpi-value">{summary.inactive}</span>
          </div>
        </div>
        <div className="branch-kpi-card">
          <span className="branch-kpi-icon branch-kpi-icon--amber">
            <AlertTriangle size={18} />
          </span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Breach / For term</span>
            <span className="branch-kpi-value">
              {summary.breach + (summary.byStatus.for_termination ?? 0)}
            </span>
          </div>
        </div>
        <div className="branch-kpi-card">
          <span className="branch-kpi-icon branch-kpi-icon--red">
            <Ban size={18} />
          </span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Terminated / Closed</span>
            <span className="branch-kpi-value">{summary.terminated}</span>
          </div>
        </div>
        <div className="branch-kpi-card">
          <span className="branch-kpi-icon">
            <ClipboardList size={18} />
          </span>
          <div className="branch-kpi-body">
            <span className="branch-kpi-label">Pipeline</span>
            <span className="branch-kpi-value">{summary.pipeline}</span>
          </div>
        </div>
      </div>

      <div className="branch-toolbar">
        <div className="branch-search">
          <Search size={16} className="branch-search-icon" />
          <input
            type="search"
            placeholder="Search store, franchisee, email, phone, address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="branch-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StoreStatus | 'all')}
          aria-label="Store status filter"
        >
          <option value="all">All statuses</option>
          {Object.entries(STORE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="roster-error">{error}</div>}

      <div className="admin-table-container roster-table-wrap">
        {loading ? (
          <div className="roster-loading">Loading roster…</div>
        ) : (
          <table className="admin-table roster-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Store</th>
                <th>Franchisee</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last PO</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="roster-empty">
                    No stores match your filters.
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr
                    key={row.id}
                    className={selected?.id === row.id ? 'roster-row-selected' : ''}
                    onClick={() => setSelected(row)}
                  >
                    <td>{row.brand_name}</td>
                    <td>
                      <div className="roster-store-cell">
                        <strong>{row.name}</strong>
                        {row.branch_code && <span className="roster-meta">{row.branch_code}</span>}
                      </div>
                    </td>
                    <td>{row.franchisee_name ?? '—'}</td>
                    <td>
                      <div className="roster-contact-cell">
                        {row.franchisee_phone && <span>{row.franchisee_phone}</span>}
                        {row.franchisee_email && <span>{row.franchisee_email}</span>}
                        {!row.franchisee_phone && !row.franchisee_email && '—'}
                      </div>
                    </td>
                    <td className="roster-location">{row.address ?? row.city ?? '—'}</td>
                    <td>
                      <span className={statusClass(row.store_status)}>
                        {storeStatusLabel(row.store_status)}
                      </span>
                    </td>
                    <td>{formatDate(row.last_po_date)}</td>
                    <td>{row.agent_name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <aside className="roster-drawer" aria-label="Store details">
          <div className="roster-drawer-header">
            <div>
              <h2>{selected.name}</h2>
              <p>
                {selected.brand_name} · {storeStatusLabel(selected.store_status)}
              </p>
            </div>
            <button type="button" className="roster-drawer-close" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <dl className="roster-drawer-grid">
            <dt>Franchisee</dt>
            <dd>{selected.franchisee_name ?? '—'}</dd>
            <dt>Phone</dt>
            <dd>{selected.franchisee_phone ?? '—'}</dd>
            <dt>Email</dt>
            <dd>{selected.franchisee_email ?? '—'}</dd>
            <dt>Home address</dt>
            <dd>{selected.home_address ?? '—'}</dd>
            <dt>Store address</dt>
            <dd>{selected.address ?? '—'}</dd>
            <dt>Package</dt>
            <dd>{selected.franchise_package ?? '—'}</dd>
            <dt>Contract</dt>
            <dd>
              {selected.contract_status ?? '—'}
              {selected.contract_signed != null && (
                <span>{selected.contract_signed ? ' · Signed' : ' · Not signed'}</span>
              )}
            </dd>
            <dt>Viber</dt>
            <dd>
              {selected.viber_added == null ? '—' : selected.viber_added ? 'Yes' : 'No'}
            </dd>
            <dt>Last PO</dt>
            <dd>{formatDate(selected.last_po_date)}</dd>
            <dt>Agent</dt>
            <dd>{selected.agent_name ?? '—'}</dd>
            <dt>Source</dt>
            <dd>
              {selected.source_sheet ?? '—'}
              {selected.source_row != null ? ` row ${selected.source_row}` : ''}
            </dd>
            <dt>Notes</dt>
            <dd>{selected.notes ?? '—'}</dd>
          </dl>
        </aside>
      )}
    </div>
  );
}
