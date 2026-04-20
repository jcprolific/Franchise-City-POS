import { useState, useCallback, useMemo } from 'react';
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
import { sampleCategories, sampleProducts, sampleVariants, sampleAddons } from '../data/sampleData';
import CategoryBar from '../components/CategoryBar';
import ProductGrid from '../components/ProductGrid';
import Cart from '../components/Cart';
import CustomizationModal from '../components/CustomizationModal';
import CheckoutModal from '../components/CheckoutModal';
import './POSPage.css';

export default function POSPage() {
  // ---- State ----
  const [activeCategoryId, setActiveCategoryId] = useState(sampleCategories[0].id);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // ---- Derived Data ----
  const filteredProducts = useMemo(
    () => sampleProducts.filter((p) => p.category_id === activeCategoryId && p.is_active),
    [activeCategoryId]
  );

  const activeCategory = sampleCategories.find((c) => c.id === activeCategoryId);

  const productVariants = useMemo(
    () => (selectedProduct ? sampleVariants.filter((v) => v.product_id === selectedProduct.id) : []),
    [selectedProduct]
  );

  // ---- Cart Calculations ----
  const subtotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.line_total, 0), [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountType === 'NONE' || subtotal === 0) return 0;
    // PWD and Senior = 20% discount, Promo = 10%
    const rate = discountType === 'PROMO' ? 0.1 : 0.2;
    return subtotal * rate;
  }, [discountType, subtotal]);

  const total = subtotal - discountAmount;

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

  const handleConfirmCheckout = () => {
    // In production, this saves to local DB and triggers sync
    setCartItems([]);
    setDiscountType('NONE');
    setPaymentMethod('CASH');
    setShowCheckout(false);
  };

  return (
    <div className="pos-layout" id="pos-page">
      <CategoryBar
        categories={sampleCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
      />

      <ProductGrid
        products={filteredProducts}
        categoryName={activeCategory?.name || ''}
        onSelectProduct={setSelectedProduct}
      />

      <Cart
        items={cartItems}
        discountType={discountType}
        paymentMethod={paymentMethod}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        onChangeQuantity={handleChangeQuantity}
        onRemoveItem={handleRemoveItem}
        onSetDiscount={setDiscountType}
        onSetPayment={setPaymentMethod}
        onCheckout={handleCheckout}
      />

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
