import { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Search } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  fetchBranchStockForHq,
  fetchCatalogMaterials,
  fetchUsageByDay,
  type HqCatalogMaterialRow,
} from '../lib/inventoryCatalogService';
import './HqInventoryPage.css';

const INVENTORY_BRANCH_OPTIONS = [
  {
    id: '38ae617a-c7c0-461f-b7d7-0cf1b579d78b',
    label: 'Quezon Blvd Tayug (Tayug sheet)',
  },
  {
    id: 'afde73d4-c2c7-4446-951a-b284db2e3a4c',
    label: 'PFCI San Andres Cainta (Apricot sheet)',
  },
];

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
});

function stockStatus(onHand: number, low: number): 'ok' | 'low' | 'out' {
  if (onHand <= 0) return 'out';
  if (onHand <= low) return 'low';
  return 'ok';
}

export default function HqInventoryPage() {
  const { brand } = useBrand();
  const [catalog, setCatalog] = useState<HqCatalogMaterialRow[]>([]);
  const [branchId, setBranchId] = useState(INVENTORY_BRANCH_OPTIONS[0].id);
  const [stockByMaterial, setStockByMaterial] = useState<
    Map<string, { on_hand_qty: number; low_stock_qty: number }>
  >(new Map());
  const [usageDays, setUsageDays] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [materials, stock, usage] = await Promise.all([
        fetchCatalogMaterials(brand.dbBrandId),
        fetchBranchStockForHq(brand.dbBrandId, branchId),
        fetchUsageByDay(brand.dbBrandId, branchId, 14),
      ]);
      setCatalog(materials);
      const map = new Map<string, { on_hand_qty: number; low_stock_qty: number }>();
      for (const row of stock) {
        map.set(row.raw_material_id, {
          on_hand_qty: row.on_hand_qty,
          low_stock_qty: row.low_stock_qty,
        });
      }
      setStockByMaterial(map);
      setUsageDays(usage.reduce((s, u) => s + u.total_qty, 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [brand.dbBrandId, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set(catalog.map((m) => m.category));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((m) => {
      if (category !== 'all' && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.sku ?? '').toLowerCase().includes(q)
      );
    });
  }, [catalog, search, category]);

  const lowCount = useMemo(() => {
    let n = 0;
    for (const m of catalog) {
      const s = stockByMaterial.get(m.id);
      const onHand = s?.on_hand_qty ?? 0;
      const low = s?.low_stock_qty ?? m.low_stock_qty;
      if (onHand <= low) n += 1;
    }
    return n;
  }, [catalog, stockByMaterial]);

  return (
    <div className="hq-inventory-page">
      <header className="hq-page-header">
        <div>
          <h1>
            <Package size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Supply Inventory
          </h1>
          <p className="hq-page-subtitle">
            Live catalog from COFTEA INVENTORY 2026 — branch stock for Tayug & PFCI pilot stores.
          </p>
        </div>
      </header>

      <div className="hq-inventory-toolbar">
        <label>
          Branch
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {INVENTORY_BRANCH_OPTIONS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="hq-inventory-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="hq-error-banner">{error}</p>}

      <div className="hq-inventory-stats">
        <div className="hq-inventory-stat">
          <span>Catalog SKUs</span>
          <strong>{catalog.length}</strong>
        </div>
        <div className="hq-inventory-stat">
          <span>Low / out (branch)</span>
          <strong>{lowCount}</strong>
        </div>
        <div className="hq-inventory-stat">
          <span>Usage (14d)</span>
          <strong>{usageDays.toLocaleString()}</strong>
        </div>
      </div>

      <div className="hq-inventory-table-wrap">
        <table className="hq-inventory-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>SKU</th>
              <th>Unit</th>
              <th>Base price</th>
              <th>On hand</th>
              <th>Maintaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>Loading…</td>
              </tr>
            ) : (
              filtered.map((m) => {
                const s = stockByMaterial.get(m.id);
                const onHand = s?.on_hand_qty ?? 0;
                const low = s?.low_stock_qty ?? m.low_stock_qty;
                const status = stockStatus(onHand, low);
                return (
                  <tr key={m.id}>
                    <td>{m.category}</td>
                    <td>{m.name}</td>
                    <td>{m.sku ?? '—'}</td>
                    <td>{m.unit}</td>
                    <td>{peso.format(m.price)}</td>
                    <td>{onHand}</td>
                    <td>{low}</td>
                    <td>
                      <span className={`hq-inventory-pill hq-inventory-pill--${status}`}>
                        {status === 'out' ? 'OUT' : status === 'low' ? 'LOW' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="hq-inventory-usage">
        Re-import: copy xlsx to <code>pos-client/data/private/coftea-inventory-2026.xlsx</code>, then{' '}
        <code>npm run import:inventory:apply</code>.
      </p>
    </div>
  );
}
