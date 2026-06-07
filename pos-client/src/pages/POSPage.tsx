import { useState, useCallback, useMemo } from 'react';
import type {
  Product,
  ProductVariant,
  CartItem,
  DiscountType,
  PaymentMethod,
  OrderType,
} from '../types';
import { sampleCategories, sampleProducts, sampleVariants } from '../data/sampleData';
import { supabase } from '../lib/supabase';
import { getInsertPayloadForPosOrder, resolvePosOrderColumns } from '../lib/dashboardRealtime';
import CategoryBar from '../components/CategoryBar';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import CheckoutModal from '../components/CheckoutModal';
import './POSPage.css';

export default function POSPage() {
  // ---- State ----
  const [activeCategoryId, setActiveCategoryId] = useState(sampleCategories[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [orderNumber] = useState(() => 4800 + Math.floor(Math.random() * 200));

  // ---- Derived Data ----
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sampleProducts.filter((p) => {
      if (!p.is_active) return false;
      if (query) {
        return (
          p.name.toLowerCase().includes(query) ||
          (p.description?.toLowerCase().includes(query) ?? false)
        );
      }
      return p.category_id === activeCategoryId;
    });
  }, [activeCategoryId, searchQuery]);

  const activeCategory = sampleCategories.find((c) => c.id === activeCategoryId);

  // ---- Cart Calculations ----
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

  // ---- Handlers ----
  const handleAddProduct = useCallback((product: Product, variant: ProductVariant | null) => {
    const lineTotal = product.base_price + (variant?.additional_price ?? 0);
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variant?.id === (variant?.id ?? null)
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                line_total: lineTotal * (item.quantity + 1),
              }
            : item
        );
      }
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product,
        variant,
        quantity: 1,
        sugar_level: '0%',
        ice_level: 'NONE',
        addons: [],
        line_total: lineTotal,
      };
      return [...prev, newItem];
    });
  }, []);

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

  const handleConfirmCheckout = async ({ paymentReference }: { paymentReference?: string }) => {
    if (cartItems.length === 0 || isSavingOrder) {
      return;
    }

    try {
      setIsSavingOrder(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const columns = await resolvePosOrderColumns();
      const payload = getInsertPayloadForPosOrder(columns, {
        orderNumber,
        paymentMethod,
        paymentReference,
        subtotal,
        discountAmount,
        total,
        itemCount,
        cashierId: user?.id,
      });

      const { error } = await supabase.from('pos_order').insert(payload);
      if (error) {
        throw error;
      }

      setCartItems([]);
      setDiscountType('NONE');
      setPaymentMethod('CASH');
      setShowCheckout(false);
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

      setCartItems([]);
      setDiscountType('NONE');
      setPaymentMethod('CASH');
      setShowCheckout(false);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const isSearching = searchQuery.trim().length > 0;

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
          placeholder="Search flavors, snacks, beverages..."
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
          categories={sampleCategories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
        />
      )}

      <div className="pos-body">
        <ProductGrid
          products={filteredProducts}
          variants={sampleVariants}
          categoryName={isSearching ? `"${searchQuery}"` : activeCategory?.name || ''}
          isSearching={isSearching}
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
          onConfirm={handleConfirmCheckout}
          onCancel={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
