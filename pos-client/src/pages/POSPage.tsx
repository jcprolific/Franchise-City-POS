import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Product,
  ProductVariant,
  CartItem,
  DiscountType,
  PaymentMethod,
  OrderType,
  IceLevel,
  CartItemAddon,
} from '../types';
import { useBrand } from '../context/BrandContext';
import { supabase } from '../lib/supabase';
import { getInsertPayloadForPosOrder, preloadPosOrderColumns, resolvePosOrderColumns } from '../lib/dashboardRealtime';
import { getCurrentBranch, isSeedBranchId } from '../lib/branchContext';
import { logAuditEvent } from '../lib/auditLogService';
import { createLocalOrderId } from '../lib/offline/offlineOrderQueue';
import { queueAndSyncOrder } from '../lib/offline/orderSyncService';
import { getNextOrderNumber } from '../lib/terminalOrderService';
import { getTerminalId } from '../lib/terminalContext';
import {
  fetchMenuCatalog,
  shouldPreferRemoteCatalog,
  type CatalogBundle,
} from '../hq/lib/menuCatalogService';
import CategoryBar from '../components/CategoryBar';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import CheckoutModal from '../components/CheckoutModal';
import CustomizationModal from '../components/CustomizationModal';
import './POSPage.css';

type OrderSnapshot = {
  orderNumber: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
};

export default function POSPage() {
  const { brand } = useBrand();
  const { searchPlaceholder, emptyIcon } = brand.menu;

  // Prefer the Supabase-managed HQ catalog; fall back to the static brand menu
  // when the catalog tables are missing/empty or Supabase is unreachable.
  const [catalog, setCatalog] = useState<CatalogBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCatalog(null);
    fetchMenuCatalog(brand.dbBrandId)
      .then((bundle) => {
        if (!cancelled && shouldPreferRemoteCatalog(brand.menu.products, bundle)) {
          setCatalog(bundle);
        }
      })
      .catch(() => {
        /* keep static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [brand.dbBrandId]);

  const categories = catalog?.categories ?? brand.menu.categories;
  const products = catalog?.products ?? brand.menu.products;
  const variants = catalog?.variants ?? brand.menu.variants;
  const addons = catalog?.addons ?? brand.menu.addons;

  const defaultCategoryId = useMemo(() => {
    const latte = categories.find((c) => /cafe\s*latte/i.test(c.name));
    return latte?.id ?? categories[0]?.id ?? '';
  }, [categories]);

  const [activeCategoryId, setActiveCategoryId] = useState(defaultCategoryId);
  const [categoryInitialized, setCategoryInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [orderNumber, setOrderNumber] = useState(5000);

  useEffect(() => {
    preloadPosOrderColumns();
    void getNextOrderNumber().then((next) => setOrderNumber(next));
  }, []);

  useEffect(() => {
    if (!defaultCategoryId) return;
    if (!categoryInitialized) {
      setActiveCategoryId(defaultCategoryId);
      setCategoryInitialized(true);
      return;
    }
    if (!categories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(defaultCategoryId);
    }
  }, [categories, activeCategoryId, defaultCategoryId, categoryInitialized]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.is_active) return false;
      if (query) {
        return (
          p.name.toLowerCase().includes(query) ||
          (p.description?.toLowerCase().includes(query) ?? false)
        );
      }
      return p.category_id === activeCategoryId;
    });
  }, [activeCategoryId, searchQuery, products]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.line_total, 0),
    [cartItems]
  );

  const itemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const discountAmount = useMemo(() => {
    if (discountType === 'NONE' || subtotal === 0) return 0;
    const rate = discountType === 'PROMO' ? 0.1 : 0.2;
    return subtotal * rate;
  }, [discountType, subtotal]);

  const total = Math.max(0, subtotal - discountAmount);

  const addCartItem = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (entry) =>
          entry.product.id === item.product.id &&
          entry.variant?.id === (item.variant?.id ?? null) &&
          entry.ice_level === item.ice_level &&
          entry.addons.map((a) => a.addon.id).join(',') === item.addons.map((a) => a.addon.id).join(',')
      );

      if (existing) {
        const unitPrice = existing.line_total / existing.quantity;
        return prev.map((entry) =>
          entry.id === existing.id
            ? {
                ...entry,
                quantity: entry.quantity + item.quantity,
                line_total: unitPrice * (entry.quantity + item.quantity),
              }
            : entry
        );
      }

      return [...prev, item];
    });
  }, []);

  const handleAddProduct = useCallback((product: Product, variant: ProductVariant | null) => {
    if (product.customizable) {
      setCustomizingProduct(product);
      return;
    }

    const lineTotal = product.base_price + (variant?.additional_price ?? 0);
    addCartItem({
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product,
      variant,
      quantity: 1,
      ice_level: 'NONE',
      addons: [],
      line_total: lineTotal,
    });
  }, [addCartItem]);

  const handleAddCustomized = useCallback((
    product: Product,
    variant: ProductVariant | null,
    ice: IceLevel,
    selectedAddons: CartItemAddon[]
  ) => {
    const addonTotal = selectedAddons.reduce((sum, entry) => sum + entry.price, 0);
    const lineTotal = product.base_price + (variant?.additional_price ?? 0) + addonTotal;

    addCartItem({
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product,
      variant,
      quantity: 1,
      ice_level: ice,
      addons: selectedAddons,
      line_total: lineTotal,
    });
    setCustomizingProduct(null);
  }, [addCartItem]);

  const handleChangeQuantity = useCallback((itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== itemId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          const unitPrice = item.line_total / item.quantity;
          return { ...item, quantity: newQty, line_total: unitPrice * newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      setShowCheckout(true);
    }
  };

  const clearCartForSuccess = useCallback(() => {
    setCartItems([]);
    setDiscountType('NONE');
    setPaymentMethod('CASH');
    setOrderType('DINE_IN');
  }, []);

  const persistOrder = useCallback(async (snapshot: OrderSnapshot) => {
    const [columns, userResult] = await Promise.all([
      resolvePosOrderColumns(),
      supabase.auth.getUser(),
    ]);
    const branch = getCurrentBranch();
    const cashierId = userResult.data.user?.id;

    if (!brand.dbBrandId) {
      return { synced: false as const, error: 'Missing brand. Re-login and try again.' };
    }

    if (!branch.id || isSeedBranchId(branch.id)) {
      return {
        synced: false as const,
        error: cashierId
          ? 'No branch linked to this account. Ask HQ/franchisee to assign your barista profile to a branch, then re-login.'
          : 'Demo seed branch cannot sync to cloud. Sign in with a barista account linked to a store.',
      };
    }

    const clientOrderId = createLocalOrderId();

    const payload = getInsertPayloadForPosOrder(columns, {
      orderNumber: snapshot.orderNumber,
      paymentMethod: snapshot.paymentMethod,
      paymentReference: snapshot.paymentReference,
      subtotal: snapshot.subtotal,
      discountAmount: snapshot.discountAmount,
      discountType,
      total: snapshot.total,
      itemCount: snapshot.itemCount,
      branchValue: branch.id,
      cashierId,
      brandId: brand.dbBrandId,
      brandName: brand.name,
      status: 'NEW',
      orderType,
    });

    payload.client_order_id = clientOrderId;
    payload.terminal_id = getTerminalId();

    const cartSnapshot = [...cartItems];
    const result = await queueAndSyncOrder(clientOrderId, payload, cartSnapshot);

    void logAuditEvent({
      action: 'order_created',
      entityType: 'pos_order',
      entityId: result.remoteOrderId ?? clientOrderId,
      brandId: brand.dbBrandId,
      branchId: branch.id,
      userId: cashierId,
      afterData: {
        orderNumber: snapshot.orderNumber,
        total: snapshot.total,
        paymentMethod: snapshot.paymentMethod,
        synced: result.synced,
        error: result.error ?? null,
      },
      metadata: { clientOrderId, terminalId: getTerminalId() },
    });

    return result;
  }, [brand.dbBrandId, brand.name, cartItems, discountType, orderType]);

  const handleConfirmCheckout = async ({ paymentReference }: { paymentReference?: string }): Promise<boolean> => {
    if (cartItems.length === 0 || isSavingOrder) {
      return false;
    }

    const snapshot: OrderSnapshot = {
      orderNumber,
      paymentMethod,
      paymentReference,
      subtotal,
      discountAmount,
      total,
      itemCount,
    };

    try {
      setIsSavingOrder(true);
      const result = await persistOrder(snapshot);

      if (!result.synced && result.error === 'offline') {
        clearCartForSuccess();
        window.alert('You are offline. Order saved locally and will sync when connection returns.');
        setShowCheckout(false);
        setOrderNumber((n) => n + 1);
        return true;
      }

      if (!result.synced) {
        window.alert(
          `Order did not sync to the cloud.\n\n${result.error ?? 'Unknown sync error'}\n\nCart kept so you can retry.`
        );
        return false;
      }

      clearCartForSuccess();
      setShowCheckout(false);
      setOrderNumber((n) => n + 1);
      return true;
    } catch (error) {
      console.error('Failed to save order:', error);
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Please try again.';
      if (message === 'offline') {
        clearCartForSuccess();
        window.alert('You are offline. Order saved locally and will sync when connection returns.');
        setShowCheckout(false);
        setOrderNumber((n) => n + 1);
        return true;
      }
      window.alert(`Order did not sync to the cloud.\n\n${message}\n\nCart kept so you can retry.`);
      return false;
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleStartNewOrder = () => {
    void getNextOrderNumber().then((next) => setOrderNumber(next));
    setShowCheckout(false);
  };

  const isSearching = searchQuery.trim().length > 0;
  const customizingVariants = customizingProduct
    ? variants.filter((v) => v.product_id === customizingProduct.id)
    : [];

  return (
    <div className="pos-page" id="pos-page">
      <div className="pos-search">
        <svg
          className="pos-search-icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          className="pos-search-input"
          id="pos-search-input"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search menu"
        />
        {searchQuery && (
          <button
            type="button"
            className="pos-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {!isSearching && (
        <CategoryBar
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
        />
      )}

      <div className="pos-body">
        <ProductGrid
          products={filteredProducts}
          variants={variants}
          categoryName={isSearching ? `"${searchQuery}"` : activeCategory?.name || ''}
          isSearching={isSearching}
          emptyIcon={emptyIcon}
          onAddProduct={handleAddProduct}
        />

        <Cart
          items={cartItems}
          orderNumber={orderNumber}
          orderType={orderType}
          discountType={discountType}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          discountAmount={discountAmount}
          total={total}
          itemCount={itemCount}
          onChangeQuantity={handleChangeQuantity}
          onRemoveItem={handleRemoveItem}
          onSetDiscount={setDiscountType}
          onSetPayment={setPaymentMethod}
          onSetOrderType={setOrderType}
          onCheckout={handleCheckout}
        />
      </div>

      {showCheckout && (
        <CheckoutModal
          total={total}
          paymentMethod={paymentMethod}
          orderNumber={orderNumber}
          onConfirm={handleConfirmCheckout}
          onNewOrder={handleStartNewOrder}
          onCancel={() => setShowCheckout(false)}
          isProcessing={isSavingOrder}
        />
      )}

      {customizingProduct && (
        <CustomizationModal
          product={customizingProduct}
          variants={customizingVariants}
          addons={addons}
          onAddToCart={handleAddCustomized}
          onClose={() => setCustomizingProduct(null)}
        />
      )}
    </div>
  );
}
