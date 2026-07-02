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
import { fetchMenuCatalog, type CatalogBundle } from '../hq/lib/menuCatalogService';
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
        if (!cancelled && bundle && bundle.products.length > 0) {
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

  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [orderNumber, setOrderNumber] = useState(() => 4800 + Math.floor(Math.random() * 200));

  useEffect(() => {
    preloadPosOrderColumns();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

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

    const payload = getInsertPayloadForPosOrder(columns, {
      orderNumber: snapshot.orderNumber,
      paymentMethod: snapshot.paymentMethod,
      paymentReference: snapshot.paymentReference,
      subtotal: snapshot.subtotal,
      discountAmount: snapshot.discountAmount,
      total: snapshot.total,
      itemCount: snapshot.itemCount,
      cashierId: userResult.data.user?.id,
      brandId: brand.dbBrandId,
      brandName: brand.name,
      status: 'NEW',
      orderType,
    });

    const { error } = await supabase.from('pos_order').insert(payload);
    if (error) {
      throw error;
    }
  }, [brand.dbBrandId, brand.name, orderType]);

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
      await persistOrder(snapshot);
      clearCartForSuccess();
      return true;
    } catch (error) {
      console.error('Failed to save order:', error);
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Please try again.';
      if (message.toLowerCase().includes('row-level security')) {
        window.alert('Order not synced to cloud due to permissions. We will still continue to New Order. Ask admin to run the pos_order RLS policy SQL so dashboard sync works.');
      } else {
        window.alert(`Order not synced: ${message}. Continuing to New Order.`);
      }

      clearCartForSuccess();
      return true;
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleStartNewOrder = () => {
    setOrderNumber((n) => n + 1);
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
