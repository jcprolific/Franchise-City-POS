import { useState, useCallback, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import type {
  Product,
  ProductVariant,
  CartItem,
  CartItemAddon,
  SugarLevel,
  IceLevel,
  DiscountType,
  PaymentMethod,
} from '../types';
import type { PosOutletContext } from '../App';
import { sampleCategories, sampleProducts, sampleVariants, sampleAddons } from '../data/sampleData';
import { supabase } from '../lib/supabase';
import { getInsertPayloadForPosOrder, resolvePosOrderColumns } from '../lib/dashboardRealtime';
import CategoryBar from '../components/CategoryBar';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import CustomizationModal from '../components/CustomizationModal';
import CheckoutModal from '../components/CheckoutModal';
import './POSPage.css';

// Philippine VAT is typically 12%. Set to 0 to disable tax row in the order panel.
const TAX_RATE = 0;

function formatToday(d: Date) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'C';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function POSPage() {
  const outletCtx = useOutletContext<PosOutletContext | undefined>();
  const cashierName = outletCtx?.userName || 'Cashier';
  const displayName =
    cashierName.length > 0
      ? cashierName.charAt(0).toUpperCase() + cashierName.slice(1)
      : 'Cashier';

  // ---- State ----
  const [activeCategoryId, setActiveCategoryId] = useState(sampleCategories[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const [orderNumber] = useState(() => 4800 + Math.floor(Math.random() * 200));

  // Keep date fresh around midnight
  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

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

  const productVariants = useMemo(
    () => (selectedProduct ? sampleVariants.filter((v) => v.product_id === selectedProduct.id) : []),
    [selectedProduct]
  );

  // ---- Cart Calculations ----
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.line_total, 0),
    [cartItems]
  );

  const discountAmount = useMemo(() => {
    if (discountType === 'NONE' || subtotal === 0) return 0;
    // PWD and Senior = 20% discount, Promo = 10%
    const rate = discountType === 'PROMO' ? 0.1 : 0.2;
    return subtotal * rate;
  }, [discountType, subtotal]);

  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = useMemo(() => taxable * TAX_RATE, [taxable]);
  const total = taxable + taxAmount;

  // ---- Handlers ----
  const handleAddToCart = useCallback(
    (
      product: Product,
      variant: ProductVariant | null,
      sugar: SugarLevel,
      ice: IceLevel,
      addons: CartItemAddon[]
    ) => {
      const basePrice = product.base_price;
      const variantPrice = variant ? variant.additional_price : 0;
      const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
      const lineTotal = basePrice + variantPrice + addonsPrice;

      const newItem: CartItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product,
        variant,
        quantity: 1,
        sugar_level: sugar,
        ice_level: ice,
        addons,
        line_total: lineTotal,
      };

      setCartItems((prev) => [...prev, newItem]);
      setSelectedProduct(null);
    },
    []
  );

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

  const handleConfirmCheckout = async () => {
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
        subtotal,
        discountAmount,
        total,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
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

      // Keep cashier flow moving even when cloud sync fails.
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
      <header className="pos-header">
        <div className="pos-brand">
          <div className="pos-brand-mark" aria-hidden="true">
            <span>☕</span>
          </div>
          <div className="pos-brand-text">
            <div className="pos-brand-title">COFTEA</div>
            <div className="pos-brand-subtitle">POINT OF SALE</div>
          </div>
        </div>

        <div className="pos-header-meta">
          <div className="pos-meta-block">
            <span className="pos-meta-label">Today</span>
            <span className="pos-meta-value">{formatToday(today)}</span>
          </div>
          <div className="pos-meta-divider" aria-hidden="true" />
          <div className="pos-meta-block">
            <span className="pos-meta-label">Cashier</span>
            <span className="pos-meta-value">{displayName}</span>
          </div>
          <div className="pos-avatar" aria-hidden="true">
            {getInitials(displayName)}
          </div>
        </div>
      </header>

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
          placeholder="Search menu..."
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
          categoryName={isSearching ? `"${searchQuery}"` : activeCategory?.name || ''}
          isSearching={isSearching}
          onSelectProduct={setSelectedProduct}
        />

        <Cart
          items={cartItems}
          orderNumber={orderNumber}
          discountType={discountType}
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          discountAmount={discountAmount}
          taxRate={TAX_RATE}
          taxAmount={taxAmount}
          total={total}
          onChangeQuantity={handleChangeQuantity}
          onRemoveItem={handleRemoveItem}
          onSetDiscount={setDiscountType}
          onSetPayment={setPaymentMethod}
          onCheckout={handleCheckout}
        />
      </div>

      {/* Customization Modal */}
      {selectedProduct && (
        <CustomizationModal
          product={selectedProduct}
          variants={productVariants}
          addons={sampleAddons}
          onAddToCart={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Checkout Modal */}
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
