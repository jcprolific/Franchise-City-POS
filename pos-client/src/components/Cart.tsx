import type { CartItem, DiscountType, PaymentMethod } from '../types';
import './Cart.css';

interface CartProps {
  items: CartItem[];
  discountType: DiscountType;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  total: number;
  onChangeQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onSetDiscount: (type: DiscountType) => void;
  onSetPayment: (method: PaymentMethod) => void;
  onCheckout: () => void;
}

export default function Cart({
  items,
  discountType,
  paymentMethod,
  subtotal,
  discountAmount,
  total,
  onChangeQuantity,
  onRemoveItem,
  onSetDiscount,
  onSetPayment,
  onCheckout,
}: CartProps) {
  const discounts: DiscountType[] = ['NONE', 'SENIOR', 'PWD', 'PROMO'];
  const payments: PaymentMethod[] = ['CASH', 'GCASH', 'CARD'];

  return (
    <div className="cart-panel" id="cart-panel">
      <div className="cart-header">
        <h2>Cart</h2>
        {items.length > 0 && (
          <span className="cart-item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className="cart-items" id="cart-items-list">
        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty-icon">🛒</span>
            <span className="cart-empty-text">Cart is empty</span>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="cart-item" id={`cart-item-${item.id}`}>
              <div className="cart-item-details">
                <div className="cart-item-name">{item.product.name}</div>
                <div className="cart-item-meta">
                  {item.variant && (
                    <span className="cart-item-tag">{item.variant.name}</span>
                  )}
                  <span className="cart-item-tag">{item.sugar_level} sugar</span>
                  <span className="cart-item-tag">{item.ice_level} ice</span>
                </div>
                {item.addons.length > 0 && (
                  <div className="cart-item-addons">
                    +{item.addons.map((a) => a.addon.name).join(', ')}
                  </div>
                )}
              </div>
              <div className="cart-item-right">
                <span className="cart-item-price">₱{item.line_total.toFixed(2)}</span>
                <div className="cart-item-qty">
                  <button onClick={() => onChangeQuantity(item.id, -1)} aria-label="Decrease quantity">−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onChangeQuantity(item.id, 1)} aria-label="Increase quantity">+</button>
                </div>
              </div>
              <button
                className="cart-item-remove"
                onClick={() => onRemoveItem(item.id)}
                aria-label={`Remove ${item.product.name}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="cart-footer" id="cart-footer">
        {/* Discount Toggle */}
        <div className="cart-toggle-group">
          <span className="cart-toggle-label">Discount</span>
          <div className="cart-toggle-buttons">
            {discounts.map((d) => (
              <button
                key={d}
                className={`cart-toggle-btn ${discountType === d ? 'active' : ''}`}
                onClick={() => onSetDiscount(d)}
              >
                {d === 'NONE' ? 'None' : d === 'SENIOR' ? 'Senior' : d}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Toggle */}
        <div className="cart-toggle-group">
          <span className="cart-toggle-label">Payment</span>
          <div className="cart-toggle-buttons">
            {payments.map((p) => (
              <button
                key={p}
                className={`cart-toggle-btn ${paymentMethod === p ? 'payment-active' : ''}`}
                onClick={() => onSetPayment(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="cart-totals">
          <div className="cart-total-row subtotal">
            <span>Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="cart-total-row discount">
              <span>Discount ({discountType})</span>
              <span>-₱{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="cart-total-row total">
            <span>Total</span>
            <span className="total-amount">₱{total.toFixed(2)}</span>
          </div>
        </div>

        <button
          className="cart-checkout-btn"
          id="checkout-btn"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
