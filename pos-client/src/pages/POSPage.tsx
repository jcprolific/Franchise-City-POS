import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
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
import { formatShiftOrderNumber, getNextShiftOrderNumber } from '../lib/terminalOrderService';
import { getTerminalId } from '../lib/terminalContext';
import { getActiveShiftLocal } from '../lib/shiftService';
import { computeDiscountAmount, computeOrderTotal } from '../lib/discountService';
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
import PosShiftGateBar from '../components/PosShiftGateBar';
import PosRecentTransactions from '../components/PosRecentTransactions';
import {
  createOpenPosOrder,
  syncOpenPosOrder,
  completeOpenPosOrder,
  type OpenOrderSession,
} from '../lib/openOrderService';
import type { PosOutletContext } from '../App';
import './POSPage.css';

type OrderSnapshot = {
  orderNumber: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  customerName: string;
  orderNote: string;
};

export default function POSPage() {
  const { brand } = useBrand();
  const { userName, hasActiveShift, onPosTimeIn } = useOutletContext<PosOutletContext>();
  const cashierName = userName || 'Staff';
  const { searchPlaceholder, emptyIcon } = brand.menu;

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
  const [promoPercent, setPromoPercent] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderStarted, setOrderStarted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [openOrderSession, setOpenOrderSession] = useState<OpenOrderSession | null>(null);
  const openOrderSessionRef = useRef<OpenOrderSession | null>(null);

  useEffect(() => {
    openOrderSessionRef.current = openOrderSession;
  }, [openOrderSession]);

  useEffect(() => {
    preloadPosOrderColumns();
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

  const discountAmount = useMemo(
    () => computeDiscountAmount(subtotal, discountType, promoPercent),
    [discountType, promoPercent, subtotal]
  );

  const total = computeOrderTotal(subtotal, discountAmount);

  const addCartItem = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (entry) =>
          entry.product.id === item.product.id &&
          entry.variant?.id === (item.variant?.id ?? null) &&
          entry.ice_level === item.ice_level &&
          entry.addons.map((a) => a.addon.id).join(',') === item.addons.map((a) => a.addon.id).join(',') &&
          !!entry.freeUpsize === !!item.freeUpsize &&
          !!entry.freeAddons === !!item.freeAddons
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

  const handleStartOrder = useCallback(async () => {
    if (!hasActiveShift) return;
    try {
      const [next, userResult] = await Promise.all([
        getNextShiftOrderNumber(),
        supabase.auth.getUser(),
      ]);
      setOrderNumber(next);
      setOrderStarted(true);
      setCartItems([]);
      setCustomerName('');
      setOrderNote('');
      setDiscountType('NONE');
      setPromoPercent(10);
      setPaymentMethod('CASH');
      setOrderType('DINE_IN');

      const { session, error } = await createOpenPosOrder({
        brandId: brand.dbBrandId,
        brandName: brand.name,
        cashierId: userResult.data.user?.id,
        cashierName,
        orderNumber: next,
        orderType: 'DINE_IN',
      });

      if (error) {
        console.warn('Open ticket sync failed:', error);
      }
      setOpenOrderSession(session);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not start order.');
    }
  }, [brand.dbBrandId, brand.name, cashierName, hasActiveShift]);

  const handleAddProduct = useCallback((product: Product, variant: ProductVariant | null) => {
    if (!hasActiveShift || !orderStarted) return;
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
  }, [addCartItem, hasActiveShift, orderStarted]);

  const handleAddCustomized = useCallback((
    product: Product,
    variant: ProductVariant | null,
    ice: IceLevel,
    selectedAddons: CartItemAddon[],
    options?: { freeUpsize?: boolean; freeAddons?: boolean }
  ) => {
    const freeUpsize = options?.freeUpsize ?? false;
    const freeAddons = options?.freeAddons ?? false;
    const variantPrice = freeUpsize ? 0 : (variant?.additional_price ?? 0);
    const addonTotal = freeAddons
      ? 0
      : selectedAddons.reduce((sum, entry) => sum + entry.price, 0);
    const lineTotal = product.base_price + variantPrice + addonTotal;

    addCartItem({
      id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product,
      variant,
      quantity: 1,
      ice_level: ice,
      addons: selectedAddons,
      line_total: lineTotal,
      freeUpsize,
      freeAddons,
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
    if (cartItems.length > 0 && orderStarted && orderNumber != null) {
      setShowCheckout(true);
    }
  };

  const resetOrderSession = useCallback(() => {
    setCartItems([]);
    setDiscountType('NONE');
    setPromoPercent(10);
    setPaymentMethod('CASH');
    setOrderType('DINE_IN');
    setCustomerName('');
    setOrderNote('');
    setOrderStarted(false);
    setOrderNumber(null);
    setOpenOrderSession(null);
  }, []);

  useEffect(() => {
    const session = openOrderSessionRef.current;
    if (!orderStarted || !session || orderNumber == null) return;

    const timer = window.setTimeout(() => {
      void syncOpenPosOrder(
        session,
        {
          orderNumber,
          orderType,
          discountType,
          promoPercent: discountType === 'PROMO' ? promoPercent : undefined,
          customerName: customerName.trim(),
          orderNote: orderNote.trim(),
          subtotal,
          discountAmount,
          total,
          itemCount,
          cartItems,
        },
        paymentMethod
      ).then((result) => {
        if (result.error) {
          console.warn('Open ticket draft sync failed:', result.error);
        }
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    cartItems,
    customerName,
    discountAmount,
    discountType,
    itemCount,
    orderNote,
    orderNumber,
    orderStarted,
    orderType,
    paymentMethod,
    promoPercent,
    subtotal,
    total,
  ]);

  const persistOrder = useCallback(async (snapshot: OrderSnapshot, cashierName: string) => {
    const [columns, userResult] = await Promise.all([
      resolvePosOrderColumns(),
      supabase.auth.getUser(),
    ]);
    const branch = getCurrentBranch();
    const cashierId = userResult.data.user?.id;
    const shift = getActiveShiftLocal();

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

    const draft = {
      orderNumber: snapshot.orderNumber,
      orderType,
      discountType,
      promoPercent: discountType === 'PROMO' ? promoPercent : undefined,
      customerName: snapshot.customerName,
      orderNote: snapshot.orderNote,
      subtotal: snapshot.subtotal,
      discountAmount: snapshot.discountAmount,
      total: snapshot.total,
      itemCount: snapshot.itemCount,
      cartItems: [...cartItems],
    };

    if (openOrderSession && navigator.onLine) {
      const completeResult = await completeOpenPosOrder({
        session: openOrderSession,
        draft,
        paymentMethod: snapshot.paymentMethod,
        paymentReference: snapshot.paymentReference,
        cashierId,
        cashierName,
        brandId: brand.dbBrandId,
        branchId: branch.id,
      });

      if (completeResult.error) {
        return { synced: false as const, error: completeResult.error };
      }

      void logAuditEvent({
        action: 'order_charged',
        entityType: 'pos_order',
        entityId: openOrderSession.orderId,
        brandId: brand.dbBrandId,
        branchId: branch.id,
        userId: cashierId,
        userName: cashierName,
        afterData: {
          orderNumber: snapshot.orderNumber,
          total: snapshot.total,
          paymentMethod: snapshot.paymentMethod,
          discountType,
          synced: true,
          mode: 'open_ticket_complete',
        },
        metadata: { clientOrderId: openOrderSession.clientOrderId, terminalId: getTerminalId() },
      });

      return { synced: true as const, remoteOrderId: openOrderSession.orderId };
    }

    const clientOrderId = openOrderSession?.clientOrderId ?? createLocalOrderId();

    const payload = getInsertPayloadForPosOrder(columns, {
      orderNumber: snapshot.orderNumber,
      paymentMethod: snapshot.paymentMethod,
      paymentReference: snapshot.paymentReference,
      subtotal: snapshot.subtotal,
      discountAmount: snapshot.discountAmount,
      discountType,
      promoPercent: discountType === 'PROMO' ? promoPercent : undefined,
      total: snapshot.total,
      itemCount: snapshot.itemCount,
      branchValue: branch.id,
      cashierId,
      cashierName,
      customerName: snapshot.customerName,
      orderNote: snapshot.orderNote,
      shiftId: shift?.id,
      brandId: brand.dbBrandId,
      brandName: brand.name,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      orderType,
    });

    payload.client_order_id = clientOrderId;
    payload.terminal_id = getTerminalId();
    if (openOrderSession?.orderId) {
      payload.open_order_id = openOrderSession.orderId;
    }

    const cartSnapshot = [...cartItems];
    const result = await queueAndSyncOrder(clientOrderId, payload, cartSnapshot);

    void logAuditEvent({
      action: 'order_charged',
      entityType: 'pos_order',
      entityId: result.remoteOrderId ?? clientOrderId,
      brandId: brand.dbBrandId,
      branchId: branch.id,
      userId: cashierId,
      userName: cashierName,
      afterData: {
        orderNumber: snapshot.orderNumber,
        total: snapshot.total,
        paymentMethod: snapshot.paymentMethod,
        discountType,
        synced: result.synced,
        error: result.error ?? null,
      },
      metadata: { clientOrderId, terminalId: getTerminalId() },
    });

    return result;
  }, [brand.dbBrandId, brand.name, cartItems, discountType, openOrderSession, orderType, promoPercent]);

  const handleConfirmCheckout = async (
    { paymentReference }: { paymentReference?: string },
    cashierName: string
  ): Promise<boolean> => {
    if (cartItems.length === 0 || isSavingOrder || orderNumber == null) {
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
      customerName: customerName.trim(),
      orderNote: orderNote.trim(),
    };

    try {
      setIsSavingOrder(true);
      const result = await persistOrder(snapshot, cashierName);

      if (!result.synced && result.error === 'offline') {
        resetOrderSession();
        window.alert('You are offline. Order saved locally and will sync when connection returns.');
        setShowCheckout(false);
        return true;
      }

      if (!result.synced) {
        window.alert(
          `Order did not sync to the cloud.\n\n${result.error ?? 'Unknown sync error'}\n\nCart kept so you can retry.`
        );
        return false;
      }

      resetOrderSession();
      setShowCheckout(false);
      return true;
    } catch (error) {
      console.error('Failed to save order:', error);
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Please try again.';
      if (message === 'offline') {
        resetOrderSession();
        window.alert('You are offline. Order saved locally and will sync when connection returns.');
        setShowCheckout(false);
        return true;
      }
      window.alert(`Order did not sync to the cloud.\n\n${message}\n\nCart kept so you can retry.`);
      return false;
    } finally {
      setIsSavingOrder(false);
    }
  };

  const isSearching = searchQuery.trim().length > 0;
  const customizingVariants = customizingProduct
    ? variants.filter((v) => v.product_id === customizingProduct.id)
    : [];
  const displayOrderNumber = orderNumber != null ? formatShiftOrderNumber(orderNumber) : '----';

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
        <div className="pos-main-column">
          <ProductGrid
            products={filteredProducts}
            variants={variants}
            categoryName={isSearching ? `"${searchQuery}"` : activeCategory?.name || ''}
            isSearching={isSearching}
            emptyIcon={emptyIcon}
            onAddProduct={handleAddProduct}
          />
          <PosRecentTransactions staffName={cashierName} />
        </div>

        <Cart
          items={cartItems}
          orderNumberLabel={displayOrderNumber}
          orderStarted={orderStarted}
          orderType={orderType}
          discountType={discountType}
          promoPercent={promoPercent}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          discountAmount={discountAmount}
          total={total}
          itemCount={itemCount}
          customerName={customerName}
          orderNote={orderNote}
          onCustomerNameChange={setCustomerName}
          onOrderNoteChange={setOrderNote}
          onPromoPercentChange={setPromoPercent}
          onChangeQuantity={handleChangeQuantity}
          onRemoveItem={handleRemoveItem}
          onSetDiscount={setDiscountType}
          onSetPayment={setPaymentMethod}
          onSetOrderType={setOrderType}
          onCheckout={handleCheckout}
          onStartOrder={() => void handleStartOrder()}
        />
      </div>

      {!hasActiveShift && (
        <PosShiftGateBar cashierName={cashierName} onTimeIn={onPosTimeIn} />
      )}

      {showCheckout && orderNumber != null && (
        <CheckoutModal
          total={total}
          paymentMethod={paymentMethod}
          orderNumber={orderNumber}
          onConfirm={(payload) => handleConfirmCheckout(payload, cashierName)}
          onNewOrder={resetOrderSession}
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
