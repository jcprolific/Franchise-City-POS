import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  Lock,
  MapPin,
  Minus,
  PackageX,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import type { PosOutletContext } from '../App';
import { getCurrentBranch } from '../lib/branchContext';
import { readStoredAuthSession } from '../lib/authSessionStore';
import { hasPermission } from '../lib/permissions';
import {
  fetchBranchInventory,
  updateBranchStock,
  type BranchInventoryItem,
} from '../lib/inventoryService';
import { startSupplyOrderPayment } from '../lib/hitpaySupplyPayment';
import {
  EMPTY_CUSTOMER,
  cartSignature,
  clearCartDraft,
  minDeliveryDate,
  normalizePhMobile,
  readCartDraft,
  readSavedContact,
  saveContact,
  validateCustomer,
  writeCartDraft,
  type SupplyCustomerDetails,
  type SupplyCustomerErrors,
} from '../lib/supplyCheckout';
import { fetchStockMovements, downloadMovementsCsv, logStockMovement, type StockMovement } from '../lib/stockMovementService';
import { cofteaRawMaterials, RAW_MATERIAL_CATEGORY_ORDER } from '../data/cofteaRawMaterials';
import './InventoryPage.css';

type StockSource = 'live' | 'local';
type StockFilter = 'all' | 'low' | 'out';
type CheckoutStep = 'items' | 'details';

interface CartLine {
  item: BranchInventoryItem;
  qty: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'COF/TEA SYRUPS': 'Syrups',
  'COF/TEA FRUIT SERIES': 'Fruit Series',
  'COF/TEA POWDERED BASE': 'Powdered Base',
  'COF/TEA SINKERS AND ETC': 'Sinkers & Supplies',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

function localFallbackItems(): BranchInventoryItem[] {
  return cofteaRawMaterials.map((m, index) => ({
    branchInventoryId: null,
    rawMaterialId: m.id,
    name: m.name,
    category: m.category,
    packaging: m.packaging,
    unit: m.unit,
    price: m.price,
    icon: m.icon,
    onHandQty: m.onHandQty,
    lowStockQty: m.lowStockQty,
    sortOrder: index,
  }));
}

function stockState(item: BranchInventoryItem): 'out' | 'low' | 'ok' {
  if (item.onHandQty <= 0) return 'out';
  return item.onHandQty <= item.lowStockQty ? 'low' : 'ok';
}

const STOCK_LABELS = { out: 'Out of stock', low: 'Low stock', ok: 'In stock' };

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const pesoExact = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FIELD_ORDER: (keyof SupplyCustomerDetails)[] = [
  'contactName',
  'mobile',
  'email',
  'address',
  'city',
  'preferredDate',
];

export default function InventoryPage() {
  const { brand } = useBrand();
  const { role } = useOutletContext<PosOutletContext>();
  const branch = useMemo(() => getCurrentBranch(), []);
  const canManageInventory = hasPermission(role, 'inventory');
  const viewOnly = !canManageInventory && hasPermission(role, 'inventory_view');

  const [items, setItems] = useState<BranchInventoryItem[]>(() => localFallbackItems());
  const [source, setSource] = useState<StockSource>('local');
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Reorder cart: rawMaterialId -> line
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [cartRestored, setCartRestored] = useState(false);
  const pendingOrder = useRef<{ orderId: string; signature: string } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('items');
  const [customer, setCustomer] = useState<SupplyCustomerDetails>(() => ({
    ...EMPTY_CUSTOMER,
    contactName: readStoredAuthSession()?.userName ?? '',
    ...readSavedContact(branch.id),
  }));
  const [customerErrors, setCustomerErrors] = useState<SupplyCustomerErrors>({});
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [pageTab, setPageTab] = useState<'stock' | 'history'>('stock');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pendingAdjust, setPendingAdjust] = useState<{
    item: BranchInventoryItem;
    previous: number;
    next: number;
  } | null>(null);
  const [adjustReason, setAdjustReason] = useState('Count correction');

  // Orders are priced by the server from the live catalog, so the offline list can't be ordered from.
  const canOrder = canManageInventory && source === 'live';

  useEffect(() => {
    let cancelled = false;

    // Show the local catalog immediately so production never blocks on Supabase.
    setItems(localFallbackItems());
    setSource('local');
    setSyncing(true);

    fetchBranchInventory(brand.dbBrandId, branch.id)
      .then((live) => {
        if (cancelled || !live?.length) return;
        setItems(live);
        setSource('live');
      })
      .catch(() => {
        /* keep local catalog */
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [brand.dbBrandId, branch.id]);

  useEffect(() => {
    void fetchStockMovements(branch.id).then(setMovements);
  }, [branch.id, items]);

  // Bring back the cart after a cancelled HitPay checkout or a page refresh.
  useEffect(() => {
    if (source !== 'live' || cartRestored) return;
    const draft = readCartDraft(branch.id);
    if (draft) {
      const restored: Record<string, CartLine> = {};
      for (const item of items) {
        const qty = draft.quantities[item.rawMaterialId];
        if (qty > 0 && item.price > 0) restored[item.rawMaterialId] = { item, qty };
      }
      setCart(restored);
      if (draft.orderId && draft.signature) {
        pendingOrder.current = { orderId: draft.orderId, signature: draft.signature };
      }
    }
    setCartRestored(true);
  }, [source, items, cartRestored, branch.id]);

  useEffect(() => {
    if (!cartRestored) return;
    const lines = Object.values(cart);
    if (lines.length === 0) {
      clearCartDraft(branch.id);
      return;
    }
    writeCartDraft(branch.id, {
      quantities: Object.fromEntries(lines.map((l) => [l.item.rawMaterialId, l.qty])),
      orderId: pendingOrder.current?.orderId,
      signature: pendingOrder.current?.signature,
    });
  }, [cart, cartRestored, branch.id]);

  const categoryOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const cat = item.category?.trim();
      if (!cat || seen.has(cat)) continue;
      seen.add(cat);
      order.push(cat);
    }
    if (order.length > 0) return order;
    return [...RAW_MATERIAL_CATEGORY_ORDER];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const itemCategory = item.category?.trim() || 'Uncategorized';
      const matchesCategory =
        activeCategory === 'all' || itemCategory === activeCategory;
      const matchesStock = stockFilter === 'all' || stockState(item) === stockFilter;
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q) ||
        item.packaging.toLowerCase().includes(q);
      return matchesCategory && matchesStock && matchesSearch;
    });
  }, [items, search, activeCategory, stockFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, BranchInventoryItem[]>();
    for (const item of filtered) {
      const key = item.category?.trim() || 'Uncategorized';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    const order =
      categoryOrder.length > 0
        ? categoryOrder
        : [...map.keys()].sort((a, b) => a.localeCompare(b));
    const sections = order
      .filter((c) => map.has(c))
      .map((c) => ({
        category: c,
        items: map.get(c) as BranchInventoryItem[],
      }));
    if (sections.length > 0) return sections;
    if (filtered.length === 0) return [];
    return [{ category: 'Uncategorized', items: filtered }];
  }, [filtered, categoryOrder]);

  const lowStockCount = useMemo(
    () => items.filter((i) => stockState(i) === 'low').length,
    [items]
  );
  const outOfStockCount = useMemo(
    () => items.filter((i) => stockState(i) === 'out').length,
    [items]
  );

  const totalValue = useMemo(
    () => items.reduce((sum, i) => sum + i.onHandQty * i.price, 0),
    [items]
  );

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartCount = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.qty, 0),
    [cartLines]
  );
  const cartTotal = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.qty * l.item.price, 0),
    [cartLines]
  );

  const commitQty = async (
    item: BranchInventoryItem,
    nextQty: number,
    reason = 'Count correction'
  ) => {
    if (!canManageInventory) return;
    const qty = Math.max(0, Math.round(nextQty));
    const previous = item.onHandQty;

    setItems((prev) =>
      prev.map((i) =>
        i.rawMaterialId === item.rawMaterialId ? { ...i, onHandQty: qty } : i
      )
    );

    if (source === 'live') {
      setSavingId(item.rawMaterialId);
      const { error, branchInventoryId } = await updateBranchStock(
        item.branchInventoryId,
        qty,
        {
          brandDbId: brand.dbBrandId,
          branchId: branch.id,
          rawMaterialId: item.rawMaterialId,
          lowStockQty: item.lowStockQty,
        }
      );
      if (!error) {
        if (branchInventoryId) {
          setItems((prev) =>
            prev.map((i) =>
              i.rawMaterialId === item.rawMaterialId
                ? { ...i, branchInventoryId }
                : i
            )
          );
        }
        const session = readStoredAuthSession();
        await logStockMovement({
          brandId: brand.dbBrandId,
          branchId: branch.id,
          rawMaterialId: item.rawMaterialId,
          materialName: item.name,
          movementType: qty > previous ? 'receive' : 'adjustment',
          qtyBefore: previous,
          qtyAfter: qty,
          reason,
          createdBy: session?.userName ?? 'Staff',
        });
        setMovements(await fetchStockMovements(branch.id));
      }
      setSavingId(null);
      if (error) {
        setItems((prev) =>
          prev.map((i) =>
            i.rawMaterialId === item.rawMaterialId
              ? { ...i, onHandQty: previous }
              : i
          )
        );
      }
    }
  };

  // `previous` is passed by the typed field, whose item already holds the typed value.
  const requestAdjust = (item: BranchInventoryItem, nextQty: number, previous = item.onHandQty) => {
    if (!canManageInventory) return;
    const qty = Math.max(0, Math.round(Number.isFinite(nextQty) ? nextQty : 0));
    if (qty === previous) {
      setQtyLocal(item.rawMaterialId, previous);
      return;
    }
    setPendingAdjust({ item: { ...item, onHandQty: previous }, previous, next: qty });
    setAdjustReason('Count correction');
  };

  const setQtyLocal = (rawMaterialId: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.rawMaterialId === rawMaterialId ? { ...i, onHandQty: qty } : i))
    );
  };

  const cancelAdjust = () => {
    if (pendingAdjust) setQtyLocal(pendingAdjust.item.rawMaterialId, pendingAdjust.previous);
    setPendingAdjust(null);
  };

  const confirmAdjust = async () => {
    if (!pendingAdjust) return;
    await commitQty(pendingAdjust.item, pendingAdjust.next, adjustReason);
    setPendingAdjust(null);
  };

  const addToCart = (item: BranchInventoryItem) => {
    if (!canOrder || item.price <= 0) return;
    setCart((prev) => {
      const existing = prev[item.rawMaterialId];
      return {
        ...prev,
        [item.rawMaterialId]: { item, qty: (existing?.qty ?? 0) + 1 },
      };
    });
  };

  const setCartQty = (rawMaterialId: string, qty: number) => {
    setCart((prev) => {
      const line = prev[rawMaterialId];
      if (!line) return prev;
      const next = Math.max(0, Math.round(qty));
      if (next === 0) {
        const clone = { ...prev };
        delete clone[rawMaterialId];
        return clone;
      }
      return { ...prev, [rawMaterialId]: { ...line, qty: next } };
    });
  };

  const clearCart = () => setCart({});

  const openCheckout = () => {
    setCheckoutStep('items');
    setOrderError(null);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (!placing) setCheckoutOpen(false);
  };

  useEffect(() => {
    if (!checkoutOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !placing) setCheckoutOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checkoutOpen, placing]);

  useEffect(() => {
    if (checkoutOpen && cartLines.length === 0) setCheckoutStep('items');
  }, [checkoutOpen, cartLines.length]);

  const updateCustomer = (field: keyof SupplyCustomerDetails, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    setCustomerErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validateField = (field: keyof SupplyCustomerDetails) => {
    if (!customer[field]) return;
    setCustomerErrors((prev) => ({ ...prev, [field]: validateCustomer(customer)[field] }));
  };

  const handlePlaceOrder = async () => {
    if (!canOrder || cartLines.length === 0 || placing) return;

    const errors = validateCustomer(customer);
    setCustomerErrors(errors);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(`supply-checkout-${firstInvalid}`)?.focus();
      return;
    }

    setPlacing(true);
    setOrderError(null);
    const session = readStoredAuthSession();
    const lines = cartLines.map((l) => ({
      rawMaterialId: l.item.rawMaterialId,
      name: l.item.name,
      packaging: l.item.packaging,
      unit: l.item.unit,
      unitPrice: l.item.price,
      quantity: l.qty,
    }));
    const signature = cartSignature(lines);
    const cleanCustomer = {
      ...customer,
      mobile: normalizePhMobile(customer.mobile) ?? customer.mobile,
    };
    const reuseOrderId =
      pendingOrder.current?.signature === signature ? pendingOrder.current.orderId : undefined;

    const { checkoutUrl, orderId, error } = await startSupplyOrderPayment({
      brandId: brand.dbBrandId,
      branchId: branch.id,
      placedBy: session?.userName ?? 'Franchisee',
      notes,
      lines,
      customer: cleanCustomer,
      orderId: reuseOrderId,
    });

    // Remember the unpaid order so retrying the same cart doesn't create a duplicate.
    if (orderId) {
      pendingOrder.current = { orderId, signature };
      writeCartDraft(branch.id, {
        quantities: Object.fromEntries(lines.map((l) => [l.rawMaterialId, l.quantity])),
        orderId,
        signature,
      });
    }

    if (error || !checkoutUrl) {
      setPlacing(false);
      setOrderError(
        error === 'not-configured'
          ? 'Supabase is not configured on this device. Check VITE_SUPABASE_URL in pos-client/.env.local.'
          : error ?? 'Could not open HitPay checkout. Please try again.'
      );
      return;
    }

    saveContact(branch.id, customer);
    window.location.href = checkoutUrl;
  };

  const renderField = (
    field: keyof SupplyCustomerDetails,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div className={`supply-checkout-field ${customerErrors[field] ? 'has-error' : ''}`}>
      <label htmlFor={`supply-checkout-${field}`}>{label}</label>
      <input
        id={`supply-checkout-${field}`}
        value={customer[field]}
        onChange={(e) => updateCustomer(field, e.target.value)}
        onBlur={() => validateField(field)}
        aria-invalid={Boolean(customerErrors[field])}
        aria-describedby={customerErrors[field] ? `supply-checkout-${field}-error` : undefined}
        {...props}
      />
      {customerErrors[field] && (
        <span className="supply-checkout-field-error" id={`supply-checkout-${field}-error`}>
          {customerErrors[field]}
        </span>
      )}
    </div>
  );

  const toggleStockFilter = (next: StockFilter) =>
    setStockFilter((current) => (current === next ? 'all' : next));

  return (
    <div className="inventory-page" id="inventory-page">
      <header className="inv-hero">
        <div>
          <p className="inv-eyebrow">
            <span className={`inv-sync-dot ${source === 'live' ? 'is-live' : ''}`} />
            {syncing ? 'Syncing stock…' : source === 'live' ? 'Live stock' : 'Offline catalog'}
          </p>
          <h1>Inventory</h1>
          <p className="inv-subtitle">{branch.name}</p>
        </div>
        {canManageInventory && (
          <button
            type="button"
            className="inv-cart-button"
            onClick={openCheckout}
            disabled={cartCount === 0}
          >
            <ShoppingBag size={18} aria-hidden />
            <span>{cartCount > 0 ? `${pesoExact.format(cartTotal)}` : 'Order is empty'}</span>
            {cartCount > 0 && <span className="inv-cart-count">{cartCount}</span>}
          </button>
        )}
      </header>

      <div className="inv-stats">
        <div className="inv-stat">
          <span className="inv-stat-icon"><Wallet size={18} aria-hidden /></span>
          <div>
            <strong>{peso.format(totalValue)}</strong>
            <span>Stock value</span>
          </div>
        </div>
        <button
          type="button"
          className={`inv-stat is-button ${stockFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setStockFilter('all')}
        >
          <span className="inv-stat-icon"><Boxes size={18} aria-hidden /></span>
          <div>
            <strong>{items.length}</strong>
            <span>Materials tracked</span>
          </div>
        </button>
        <button
          type="button"
          className={`inv-stat is-button is-warn ${stockFilter === 'low' ? 'is-active' : ''}`}
          onClick={() => toggleStockFilter('low')}
          aria-pressed={stockFilter === 'low'}
        >
          <span className="inv-stat-icon"><AlertTriangle size={18} aria-hidden /></span>
          <div>
            <strong>{lowStockCount}</strong>
            <span>Low stock</span>
          </div>
        </button>
        <button
          type="button"
          className={`inv-stat is-button is-danger ${stockFilter === 'out' ? 'is-active' : ''}`}
          onClick={() => toggleStockFilter('out')}
          aria-pressed={stockFilter === 'out'}
        >
          <span className="inv-stat-icon"><PackageX size={18} aria-hidden /></span>
          <div>
            <strong>{outOfStockCount}</strong>
            <span>Out of stock</span>
          </div>
        </button>
      </div>

      {viewOnly && (
        <div className="inv-note is-info" role="status">
          View only. Ask a franchisee or manager to adjust counts or place supply orders.
        </div>
      )}

      {source === 'local' && !syncing && (
        <div className="inv-note" role="status">
          {viewOnly
            ? 'Showing the standard Coftea catalog. Live stock will appear when this branch is connected.'
            : 'Showing the standard Coftea catalog. Stock edits and supply orders are unavailable until this branch is connected.'}
        </div>
      )}

      <div className="inv-toolbar">
        <div className="inv-toolbar-row">
          <div className="inv-tabs" role="tablist" aria-label="Inventory view">
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === 'stock'}
              className={pageTab === 'stock' ? 'active' : ''}
              onClick={() => setPageTab('stock')}
            >
              Current stock
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pageTab === 'history'}
              className={pageTab === 'history' ? 'active' : ''}
              onClick={() => setPageTab('history')}
            >
              Movement history
            </button>
          </div>
          {pageTab === 'stock' && (
            <label className="inv-search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                placeholder="Search raw materials"
                aria-label="Search raw materials"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="inventory-search"
              />
            </label>
          )}
        </div>
        {pageTab === 'stock' && (
          <div className="inv-chips" aria-label="Filter by category">
            <button
              type="button"
              className={activeCategory === 'all' ? 'active' : ''}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {categoryOrder.map((c) => (
              <button
                type="button"
                key={c}
                className={activeCategory === c ? 'active' : ''}
                onClick={() => setActiveCategory(c)}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        )}
      </div>

      {pageTab === 'history' ? (
        <div className="inventory-movement-list">
          <div className="inventory-history-actions">
            <button
              type="button"
              className="inventory-export-btn"
              disabled={movements.length === 0}
              onClick={() => downloadMovementsCsv(movements, `stock-movements-${branch.id}.csv`)}
            >
              Export CSV
            </button>
          </div>
          {movements.length === 0 ? (
            <div className="inventory-empty">No stock movements logged yet.</div>
          ) : (
            movements.map((m) => (
              <div key={m.id} className="inventory-movement-row">
                <strong>{m.materialName}</strong>
                <span className={m.qtyDelta >= 0 ? 'is-up' : 'is-down'}>
                  {m.movementType} · {m.qtyDelta >= 0 ? '+' : ''}{m.qtyDelta}
                </span>
                <span>{m.reason}</span>
                <span>{m.createdBy}</span>
                <span>{new Date(m.createdAt).toLocaleString('en-PH')}</span>
              </div>
            ))
          )}
        </div>
      ) : grouped.length === 0 ? (
        <div className="inventory-empty">
          <Search size={28} aria-hidden />
          <p>No raw materials match these filters.</p>
          <button
            type="button"
            className="inventory-export-btn"
            onClick={() => {
              setSearch('');
              setActiveCategory('all');
              setStockFilter('all');
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        grouped.map(({ category, items: catItems }) => (
          <section className="inv-section" key={category}>
            <div className="inv-section-head">
              <h2>{categoryLabel(category)}</h2>
              <span>{catItems.length} items</span>
            </div>
            <div className="inv-grid">
              {catItems.map((item) => {
                const state = stockState(item);
                const isSaving = savingId === item.rawMaterialId;
                const inCart = cart[item.rawMaterialId]?.qty ?? 0;
                const meta = [item.packaging, item.price > 0 ? peso.format(item.price) : 'Price pending']
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <article
                    key={item.rawMaterialId}
                    className={`inv-card is-${state} ${inCart > 0 ? 'in-order' : ''}`}
                  >
                    <div className="inv-card-top">
                      <div className="inv-card-icon" aria-hidden>{item.icon || '📦'}</div>
                      <div className="inv-card-info">
                        <h3 title={item.name}>{item.name}</h3>
                        <p>{meta}</p>
                      </div>
                      <span className={`inv-pill is-${state}`}>{STOCK_LABELS[state]}</span>
                    </div>
                    <div className="inv-card-bottom">
                      {canManageInventory ? (
                        <>
                          <div className="inv-onhand">
                            <span className="inv-control-label">On hand</span>
                            <div className="inv-stepper">
                              <button
                                type="button"
                                onClick={() => requestAdjust(item, item.onHandQty - 1)}
                                disabled={isSaving || item.onHandQty <= 0}
                                aria-label={`Remove one ${item.unit} of ${item.name}`}
                              >
                                <Minus size={14} aria-hidden />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={item.onHandQty}
                                aria-label={`${item.name} on hand`}
                                data-previous={item.onHandQty}
                                onFocus={(e) => {
                                  e.currentTarget.dataset.previous = String(item.onHandQty);
                                  e.currentTarget.select();
                                }}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setQtyLocal(item.rawMaterialId, Number.isFinite(v) ? v : 0);
                                }}
                                onBlur={(e) =>
                                  requestAdjust(
                                    item,
                                    Number(e.target.value),
                                    Number(e.target.dataset.previous)
                                  )
                                }
                              />
                              <button
                                type="button"
                                onClick={() => requestAdjust(item, item.onHandQty + 1)}
                                disabled={isSaving}
                                aria-label={`Add one ${item.unit} of ${item.name}`}
                              >
                                <Plus size={14} aria-hidden />
                              </button>
                            </div>
                            <span className="inv-unit">{item.unit}</span>
                          </div>
                          {inCart > 0 ? (
                            <div className="inv-order-stepper">
                              <button
                                type="button"
                                onClick={() => setCartQty(item.rawMaterialId, inCart - 1)}
                                aria-label={`Order one less ${item.name}`}
                              >
                                <Minus size={14} aria-hidden />
                              </button>
                              <span aria-live="polite">{inCart} in order</span>
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                aria-label={`Order one more ${item.name}`}
                              >
                                <Plus size={14} aria-hidden />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="inv-add"
                              onClick={() => addToCart(item)}
                              disabled={!canOrder || item.price <= 0}
                            >
                              <Plus size={15} aria-hidden /> Add to order
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="inv-readonly">
                          <strong>{item.onHandQty}</strong> {item.unit} on hand
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      {canManageInventory && cartCount > 0 && !checkoutOpen && (
        <div className="reorder-bar">
          <div className="reorder-bar-info">
            <span className="reorder-bar-count">
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
            <span className="reorder-bar-total">{pesoExact.format(cartTotal)}</span>
          </div>
          <div className="reorder-bar-actions">
            <button type="button" className="reorder-bar-clear" onClick={clearCart}>
              Clear
            </button>
            <button type="button" className="reorder-bar-review" onClick={openCheckout}>
              Checkout <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}

      {canManageInventory && checkoutOpen && (
        <div className="supply-checkout-overlay" onClick={closeCheckout}>
          <aside
            className="supply-checkout-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supply-checkout-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="supply-checkout-head">
              <div>
                <h2 id="supply-checkout-title">
                  {checkoutStep === 'items' ? 'Review your order' : 'Delivery details'}
                </h2>
                <span className="supply-checkout-branch">{branch.name}</span>
              </div>
              <button
                type="button"
                className="supply-checkout-close"
                onClick={closeCheckout}
                disabled={placing}
                aria-label="Close checkout"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <ol className="supply-checkout-steps" aria-label="Checkout progress">
              <li
                className={checkoutStep === 'items' ? 'is-current' : 'is-done'}
                aria-current={checkoutStep === 'items' ? 'step' : undefined}
              >
                <span>{checkoutStep === 'items' ? '1' : <Check size={13} aria-hidden />}</span>
                Items
              </li>
              <li
                className={checkoutStep === 'details' ? 'is-current' : ''}
                aria-current={checkoutStep === 'details' ? 'step' : undefined}
              >
                <span>2</span>
                Details
              </li>
              <li>
                <span>3</span>
                Pay
              </li>
            </ol>

            <div className="supply-checkout-body">
              {checkoutStep === 'items' ? (
                cartLines.length === 0 ? (
                  <div className="supply-checkout-empty">Your order is empty.</div>
                ) : (
                  cartLines.map(({ item, qty }) => (
                    <div className="supply-checkout-line" key={item.rawMaterialId}>
                      <div className="supply-checkout-line-icon" aria-hidden>{item.icon || '📦'}</div>
                      <div className="supply-checkout-line-info">
                        <div className="supply-checkout-line-name">{item.name}</div>
                        <div className="supply-checkout-line-meta">
                          {[item.packaging, peso.format(item.price)].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <div className="inv-stepper is-small">
                        <button
                          type="button"
                          onClick={() => setCartQty(item.rawMaterialId, qty - 1)}
                          aria-label={`Order one less ${item.name}`}
                          disabled={qty <= 1}
                        >
                          <Minus size={13} aria-hidden />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={qty}
                          aria-label={`${item.name} order quantity`}
                          onChange={(e) =>
                            setCartQty(item.rawMaterialId, Math.max(1, Number(e.target.value) || 1))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setCartQty(item.rawMaterialId, qty + 1)}
                          aria-label={`Order one more ${item.name}`}
                        >
                          <Plus size={13} aria-hidden />
                        </button>
                      </div>
                      <div className="supply-checkout-line-total">{pesoExact.format(qty * item.price)}</div>
                      <button
                        type="button"
                        className="supply-checkout-line-remove"
                        onClick={() => setCartQty(item.rawMaterialId, 0)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  ))
                )
              ) : (
                <form
                  className="supply-checkout-form"
                  id="supply-checkout-details-form"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handlePlaceOrder();
                  }}
                >
                  <section className="supply-checkout-card">
                    <div className="supply-checkout-card-head">
                      <h3>Order summary</h3>
                      <button type="button" onClick={() => setCheckoutStep('items')} disabled={placing}>
                        Edit
                      </button>
                    </div>
                    <ul className="supply-checkout-summary">
                      {cartLines.map(({ item, qty }) => (
                        <li key={item.rawMaterialId}>
                          <span className="supply-checkout-summary-qty">{qty}×</span>
                          <span className="supply-checkout-summary-name">{item.name}</span>
                          <span>{pesoExact.format(qty * item.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="supply-checkout-card">
                    <div className="supply-checkout-card-head">
                      <h3><UserRound size={16} aria-hidden /> Contact</h3>
                    </div>
                    {renderField('contactName', 'Contact person', {
                      autoComplete: 'name',
                      placeholder: 'Full name',
                    })}
                    <div className="supply-checkout-form-row">
                      {renderField('mobile', 'Mobile number', {
                        type: 'tel',
                        inputMode: 'tel',
                        autoComplete: 'tel',
                        placeholder: '0917 123 4567',
                      })}
                      {renderField('email', 'Email for receipt', {
                        type: 'email',
                        inputMode: 'email',
                        autoComplete: 'email',
                        placeholder: 'name@email.com',
                      })}
                    </div>
                  </section>

                  <section className="supply-checkout-card">
                    <div className="supply-checkout-card-head">
                      <h3><MapPin size={16} aria-hidden /> Delivery</h3>
                    </div>
                    {renderField('address', 'Delivery address', {
                      autoComplete: 'street-address',
                      placeholder: 'Unit, street, barangay',
                    })}
                    <div className="supply-checkout-form-row">
                      {renderField('city', 'City / municipality', {
                        autoComplete: 'address-level2',
                        placeholder: 'City and province',
                      })}
                      {renderField('preferredDate', 'Preferred delivery (optional)', {
                        type: 'date',
                        min: minDeliveryDate(),
                      })}
                    </div>
                    <div className="supply-checkout-field">
                      <label htmlFor="supply-checkout-notes-input">Notes for HQ (optional)</label>
                      <textarea
                        id="supply-checkout-notes-input"
                        placeholder="Landmark, receiving hours, or special requests"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </section>
                </form>
              )}
            </div>

            {orderError && <div className="supply-checkout-error" role="alert">{orderError}</div>}

            <div className="supply-checkout-footer">
              <div className="supply-checkout-total-row">
                <span>{cartCount} item{cartCount !== 1 ? 's' : ''} · Total</span>
                <strong>{pesoExact.format(cartTotal)}</strong>
              </div>
              {checkoutStep === 'items' ? (
                <button
                  type="button"
                  className="supply-checkout-place-btn"
                  disabled={cartLines.length === 0}
                  onClick={() => setCheckoutStep('details')}
                >
                  Continue to details <ArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <div className="supply-checkout-footer-actions">
                  <button
                    type="button"
                    className="supply-checkout-back-btn"
                    onClick={() => setCheckoutStep('items')}
                    disabled={placing}
                    aria-label="Back to items"
                  >
                    <ArrowLeft size={16} aria-hidden />
                  </button>
                  <button
                    type="submit"
                    form="supply-checkout-details-form"
                    className="supply-checkout-place-btn"
                    disabled={placing || cartLines.length === 0}
                  >
                    {!placing && <Lock size={15} aria-hidden />}
                    {placing ? 'Opening HitPay…' : `Pay ${pesoExact.format(cartTotal)}`}
                  </button>
                </div>
              )}
              {checkoutStep === 'details' && (
                <p className="supply-checkout-secure">
                  Secured by HitPay. HQ receives your order once payment is confirmed.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}

      {canManageInventory && pendingAdjust && (
        <div className="inventory-adjust-overlay" role="dialog" aria-modal="true" aria-labelledby="adjust-title">
          <div className="inventory-adjust-modal">
            <h3 id="adjust-title">Adjust stock</h3>
            <p>
              {pendingAdjust.item.name}: {pendingAdjust.previous} → {pendingAdjust.next}{' '}
              {pendingAdjust.item.unit}
            </p>
            <label htmlFor="adjust-reason">Reason</label>
            <select
              id="adjust-reason"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            >
              <option>Count correction</option>
              <option>Received delivery</option>
              <option>Spoilage / waste</option>
              <option>Used in production</option>
              <option>Other</option>
            </select>
            <div className="inventory-adjust-actions">
              <button type="button" onClick={cancelAdjust}>Cancel</button>
              <button type="button" className="inventory-adjust-save" onClick={() => void confirmAdjust()}>
                Save adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
