import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
import { placeSupplyOrder } from '../lib/supplyOrderService';
import { fetchStockMovements, downloadMovementsCsv, logStockMovement, type StockMovement } from '../lib/stockMovementService';
import {
  cofteaRawMaterials,
  RAW_MATERIAL_CATEGORY_ORDER,
} from '../data/cofteaRawMaterials';
import './InventoryPage.css';

type StockSource = 'live' | 'local';
type PaymentMethod = 'gcash' | 'bank_transfer';

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

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const pesoExact = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  const [savingId, setSavingId] = useState<string | null>(null);

  // Reorder cart: rawMaterialId -> line
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [pageTab, setPageTab] = useState<'stock' | 'history'>('stock');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pendingAdjust, setPendingAdjust] = useState<{
    item: BranchInventoryItem;
    previous: number;
    next: number;
  } | null>(null);
  const [adjustReason, setAdjustReason] = useState('Count correction');

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

  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return RAW_MATERIAL_CATEGORY_ORDER.filter((c) => present.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q) ||
        item.packaging.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, BranchInventoryItem[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return RAW_MATERIAL_CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c) as BranchInventoryItem[],
    }));
  }, [filtered]);

  const lowStockCount = useMemo(
    () => items.filter((i) => i.onHandQty <= i.lowStockQty).length,
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
    if (qty === previous) return;

    setItems((prev) =>
      prev.map((i) =>
        i.rawMaterialId === item.rawMaterialId ? { ...i, onHandQty: qty } : i
      )
    );

    if (item.branchInventoryId) {
      setSavingId(item.rawMaterialId);
      const { error } = await updateBranchStock(item.branchInventoryId, qty);
      if (!error) {
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

  const requestAdjust = (item: BranchInventoryItem, nextQty: number) => {
    if (!canManageInventory) return;
    const qty = Math.max(0, Math.round(nextQty));
    if (qty === item.onHandQty) return;
    setPendingAdjust({ item, previous: item.onHandQty, next: qty });
    setAdjustReason('Count correction');
  };

  const confirmAdjust = async () => {
    if (!pendingAdjust) return;
    await commitQty(pendingAdjust.item, pendingAdjust.next, adjustReason);
    setPendingAdjust(null);
  };

  const addToCart = (item: BranchInventoryItem) => {
    if (!canManageInventory) return;
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

  const handlePlaceOrder = async () => {
    if (!canManageInventory || cartLines.length === 0) return;
    setPlacing(true);
    setOrderError(null);
    const session = readStoredAuthSession();
    const { referenceNo, error } = await placeSupplyOrder({
      brandId: brand.dbBrandId,
      branchId: branch.id,
      branchName: branch.name,
      placedBy: session?.userName ?? 'Franchisee',
      notes,
      paymentMethod,
      lines: cartLines.map((l) => ({
        rawMaterialId: l.item.rawMaterialId,
        name: l.item.name,
        packaging: l.item.packaging,
        unit: l.item.unit,
        unitPrice: l.item.price,
        quantity: l.qty,
      })),
    });
    setPlacing(false);

    if (error) {
      setOrderError(
        error === 'not-configured'
          ? 'This branch isn’t connected yet, so the order can’t be sent to HQ.'
          : 'Something went wrong placing the order. Please try again.'
      );
      return;
    }

    setConfirmation(referenceNo);
    clearCart();
    setNotes('');
    setPaymentMethod('gcash');
    setCheckoutOpen(false);
  };

  return (
    <div className="inventory-page" id="inventory-page">
      <div className="inventory-header">
        <div className="inventory-header-left">
          <h1>Inventory</h1>
          <span className="inventory-count">
            {branch.name} · {items.length} raw materials tracked
            {syncing && <span className="inventory-sync-label"> · syncing…</span>}
          </span>
        </div>
        <div className="inventory-header-right">
          {canManageInventory && cartCount > 0 && (
            <button className="inventory-cart-pill" onClick={() => setCheckoutOpen(true)}>
              <span className="inventory-cart-icon">🛒</span>
              <span className="inventory-cart-copy">
                <strong>{cartCount} item{cartCount !== 1 ? 's' : ''}</strong>
                <small>{pesoExact.format(cartTotal)}</small>
              </span>
              <span className="inventory-cart-action">Checkout</span>
            </button>
          )}
          <div className="inventory-stat">
            <span className="inventory-stat-value">{peso.format(totalValue)}</span>
            <span className="inventory-stat-label">stock value</span>
          </div>
          {lowStockCount > 0 && (
            <div className="low-stock-badge">
              <span className="low-stock-badge-icon">⚠️</span>
              {lowStockCount} low stock
            </div>
          )}
        </div>
      </div>

      {confirmation && (
        <div className="inventory-confirm">
          <span>
            ✅ Order <strong>{confirmation}</strong> placed. Track it in Portal → Order History.
          </span>
          <button className="inventory-confirm-close" onClick={() => setConfirmation(null)}>
            Dismiss
          </button>
        </div>
      )}

      {viewOnly && (
        <div className="inventory-view-only-note" role="status">
          View only — you can check stock levels here. Ask a franchisee or manager to adjust counts or place supply orders.
        </div>
      )}

      {source === 'local' && !syncing && (
        <div className="inventory-offline-note">
          {viewOnly
            ? 'Showing the standard Coftea catalog (offline). Live stock will appear when this branch is connected.'
            : 'Showing the standard Coftea catalog (offline). Stock edits and orders won’t be saved until this branch is connected.'}
        </div>
      )}

      <div className="inventory-toolbar">
        <div className="inventory-page-tabs">
          <button
            type="button"
            className={`inventory-filter ${pageTab === 'stock' ? 'active' : ''}`}
            onClick={() => setPageTab('stock')}
          >
            Stock
          </button>
          <button
            type="button"
            className={`inventory-filter ${pageTab === 'history' ? 'active' : ''}`}
            onClick={() => setPageTab('history')}
          >
            Movement History
          </button>
        </div>
        <div className="inventory-search">
          <input
            className="inventory-search-input"
            type="text"
            placeholder="Search raw materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="inventory-search"
          />
        </div>
        <div className="inventory-filters" role="tablist" aria-label="Filter by category">
          <button
            className={`inventory-filter ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`inventory-filter ${activeCategory === c ? 'active' : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {categoryLabel(c)}
            </button>
          ))}
        </div>
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
                <span>{m.movementType} · {m.qtyDelta >= 0 ? '+' : ''}{m.qtyDelta}</span>
                <span>{m.reason}</span>
                <span>{m.createdBy}</span>
                <span>{new Date(m.createdAt).toLocaleString('en-PH')}</span>
              </div>
            ))
          )}
        </div>
      ) : grouped.length === 0 ? (
        <div className="inventory-empty">
          <div className="inventory-empty-icon">🔍</div>
          No raw materials match “{search}”.
        </div>
      ) : (
        grouped.map(({ category, items: catItems }) => (
          <section className="inventory-section" key={category}>
            <div className="inventory-section-head">
              <h2 className="inventory-section-title">{categoryLabel(category)}</h2>
              <span className="inventory-section-count">{catItems.length} items</span>
            </div>
            <div className="inventory-grid">
              {catItems.map((item, index) => {
                const isLow = item.onHandQty <= item.lowStockQty;
                const isSaving = savingId === item.rawMaterialId;
                const inCart = cart[item.rawMaterialId]?.qty ?? 0;
                return (
                  <div
                    key={item.rawMaterialId}
                    className={`inventory-item ${isLow ? 'low-stock' : ''}`}
                    style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                  >
                    <div className="inventory-item-icon">{item.icon || '📦'}</div>
                    <div className="inventory-item-info">
                      <div className="inventory-item-name">{item.name}</div>
                      <div className="inventory-item-meta">
                        {item.packaging} · {peso.format(item.price)}
                        {isLow && <span className="inventory-item-flag">Low</span>}
                      </div>
                    </div>
                    <div className="inventory-item-right">
                      {canManageInventory ? (
                        <>
                          <div className="inventory-qty-editor">
                            <button
                              className="inventory-action-btn minus"
                              onClick={() => requestAdjust(item, item.onHandQty - 1)}
                              disabled={isSaving || item.onHandQty <= 0}
                              aria-label={`Remove one ${item.unit}`}
                            >
                              −
                            </button>
                            <div className="inventory-qty-field">
                              <input
                                className="inventory-qty-input"
                                type="number"
                                min={0}
                                value={item.onHandQty}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setItems((prev) =>
                                    prev.map((i) =>
                                      i.rawMaterialId === item.rawMaterialId
                                        ? { ...i, onHandQty: Number.isFinite(v) ? v : 0 }
                                        : i
                                    )
                                  );
                                }}
                                onBlur={(e) => requestAdjust(item, Number(e.target.value))}
                              />
                              <span className="inventory-qty-unit">{item.unit}</span>
                            </div>
                            <button
                              className="inventory-action-btn plus"
                              onClick={() => requestAdjust(item, item.onHandQty + 1)}
                              disabled={isSaving}
                              aria-label={`Add one ${item.unit}`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            className={`inventory-reorder-btn ${inCart > 0 ? 'in-cart' : ''}`}
                            onClick={() => addToCart(item)}
                            aria-label={`Reorder ${item.name}`}
                          >
                            {inCart > 0 ? `In cart · ${inCart}` : 'Reorder'}
                          </button>
                        </>
                      ) : (
                        <div className="inventory-qty-readonly" aria-label={`${item.onHandQty} ${item.unit} on hand`}>
                          <strong>{item.onHandQty}</strong>
                          <span>{item.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
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
            <button className="reorder-bar-clear" onClick={clearCart}>
              Clear
            </button>
            <button className="reorder-bar-review" onClick={() => setCheckoutOpen(true)}>
              Review Order →
            </button>
          </div>
        </div>
      )}

      {canManageInventory && checkoutOpen && (
        <div className="checkout-overlay" onClick={() => setCheckoutOpen(false)}>
          <aside className="checkout-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-head">
              <div>
                <h2>Review Supply Order</h2>
                <span className="checkout-branch">{branch.name}</span>
              </div>
              <button className="checkout-close" onClick={() => setCheckoutOpen(false)}>
                ✕
              </button>
            </div>

            <div className="checkout-lines">
              {cartLines.length === 0 ? (
                <div className="checkout-empty">Your reorder cart is empty.</div>
              ) : (
                cartLines.map(({ item, qty }) => (
                  <div className="checkout-line" key={item.rawMaterialId}>
                    <div className="checkout-line-icon">{item.icon || '📦'}</div>
                    <div className="checkout-line-info">
                      <div className="checkout-line-name">{item.name}</div>
                      <div className="checkout-line-meta">
                        {item.packaging} · {peso.format(item.price)}
                      </div>
                    </div>
                    <div className="checkout-line-qty">
                      <button
                        className="inventory-action-btn minus"
                        onClick={() => setCartQty(item.rawMaterialId, qty - 1)}
                        aria-label="Decrease"
                      >
                        −
                      </button>
                      <input
                        className="checkout-qty-input"
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setCartQty(item.rawMaterialId, Number(e.target.value))}
                      />
                      <button
                        className="inventory-action-btn plus"
                        onClick={() => setCartQty(item.rawMaterialId, qty + 1)}
                        aria-label="Increase"
                      >
                        +
                      </button>
                    </div>
                    <div className="checkout-line-total">
                      {pesoExact.format(qty * item.price)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="checkout-notes">
              <div className="checkout-payment">
                <span className="checkout-payment-label">Payment method</span>
                <div className="checkout-payment-options">
                  <button
                    className={`checkout-payment-option ${paymentMethod === 'gcash' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('gcash')}
                    type="button"
                  >
                    <span className="checkout-payment-icon">G</span>
                    <span>
                      <strong>GCash</strong>
                      <small>Pay via mobile wallet</small>
                    </span>
                  </button>
                  <button
                    className={`checkout-payment-option ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('bank_transfer')}
                    type="button"
                  >
                    <span className="checkout-payment-icon">🏦</span>
                    <span>
                      <strong>Bank Transfer</strong>
                      <small>Manual bank deposit</small>
                    </span>
                  </button>
                </div>
              </div>

              <label htmlFor="checkout-notes-input">Notes for HQ (optional)</label>
              <textarea
                id="checkout-notes-input"
                placeholder="e.g. Needed before the weekend rush"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {orderError && <div className="checkout-error">{orderError}</div>}

            <div className="checkout-footer">
              <div className="checkout-total-row">
                <span>Total</span>
                <strong>{pesoExact.format(cartTotal)}</strong>
              </div>
              <button
                className="checkout-place-btn"
                onClick={handlePlaceOrder}
                disabled={placing || cartLines.length === 0}
              >
                {placing ? 'Placing order…' : `Place Order · ${pesoExact.format(cartTotal)}`}
              </button>
            </div>
          </aside>
        </div>
      )}

      {canManageInventory && pendingAdjust && (
        <div className="inventory-adjust-overlay" role="dialog" aria-modal="true">
          <div className="inventory-adjust-modal">
            <h3>Adjust Stock</h3>
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
              <button type="button" onClick={() => setPendingAdjust(null)}>Cancel</button>
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
