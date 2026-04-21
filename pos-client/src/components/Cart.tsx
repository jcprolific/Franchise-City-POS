import type { ReactNode } from 'react';
import type { CartItem, DiscountType, PaymentMethod } from '../types';
import './Cart.css';

interface CartProps {
  items: CartItem[];
  orderNumber: number;
  discountType: DiscountType;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  onChangeQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onSetDiscount: (type: DiscountType) => void;
  onSetPayment: (method: PaymentMethod) => void;
  onCheckout: () => void;
}

interface PaymentOption {
  value: PaymentMethod;
  label: string;
  icon: ReactNode;
}

const discountOptions: { value: DiscountType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'PWD', label: 'PWD' },
  { value: 'PROMO', label: 'Promo' },
];

const paymentOptions: PaymentOption[] = [
  {
    value: 'CARD',
    label: 'Card',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
        <path d="M2.5 10h19" />
      </svg>
    ),
  },
  {
    value: 'CASH',
    label: 'Cash',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6 9h.01M18 15h.01" />
      </svg>
    ),
  },
  {
    value: 'GCASH',
    label: 'GCash',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" />
      </svg>
    ),
  },
];

function formatPrice(value: number) {
  return `₱${value.toFixed(2)}`;
}

export default function Cart({
  items,
  orderNumber,
  discountType,
  paymentMethod,
  subtotal,
  discountAmount,
  taxRate,
  taxAmount,
  total,
  onChangeQuantity,
  onRemoveItem,
  onSetDiscount,
  onSetPayment,
  onCheckout,
}: CartProps) {
  const hasItems = items.length > 0;

  return (
    <aside className="order-panel" id="cart-panel" aria-label="Current order">
      <div className="order-panel-inner">
        <header className="order-header">
          <div>
            <div className="order-eyebrow">Current Order</div>
            <div className="order-number">#{orderNumber}</div>
          </div>
          <div className="order-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="M3 9h18" />
              <path d="M8 14h3" />
            </svg>
          </div>
        </header>

        <div className="order-items" id="cart-items-list">
          {!hasItems ? (
            <div className="order-empty">
              <div className="order-empty-icon" aria-hidden="true">
                <span>☕</span>
              </div>
              <div className="order-empty-title">No items yet</div>
              <div className="order-empty-subtitle">
                Tap menu items to add them here
              </div>
            </div>
          ) : (
            <ul className="order-item-list">
              {items.map((item) => (
                <li key={item.id} className="order-item" id={`cart-item-${item.id}`}>
                  <div className="order-item-main">
                    <div className="order-item-name">{item.product.name}</div>
                    <div className="order-item-meta">
                      {item.variant && <span>{item.variant.name}</span>}
                      <span>{item.sugar_level} sugar</span>
                      <span>{item.ice_level} ice</span>
                    </div>
                    {item.addons.length > 0 && (
                      <div className="order-item-addons">
                        + {item.addons.map((a) => a.addon.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="order-item-side">
                    <div className="order-item-price">{formatPrice(item.line_total)}</div>
                    <div className="order-item-qty">
                      <button
                        type="button"
                        onClick={() => onChangeQuantity(item.id, -1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onChangeQuantity(item.id, 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="order-item-remove"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.product.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="order-summary">
          <div className="order-discount-row" aria-label="Discount">
            <span className="order-discount-label">Discount</span>
            <div className="order-discount-pills" role="radiogroup" aria-label="Apply discount">
              {discountOptions.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="radio"
                  aria-checked={discountType === d.value}
                  className={`order-discount-pill ${discountType === d.value ? 'active' : ''}`}
                  onClick={() => onSetDiscount(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="order-totals">
            <div className="order-total-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="order-total-row order-total-discount">
                <span>Discount ({discountType})</span>
                <span>−{formatPrice(discountAmount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="order-total-row">
                <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
            )}
            <div className="order-total-divider" />
            <div className="order-total-row order-total-grand">
              <span>Total</span>
              <span className="order-total-amount">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="order-payment" role="radiogroup" aria-label="Payment method">
            {paymentOptions.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={paymentMethod === p.value}
                className={`order-payment-option ${paymentMethod === p.value ? 'active' : ''}`}
                onClick={() => onSetPayment(p.value)}
              >
                <span className="order-payment-icon">{p.icon}</span>
                <span className="order-payment-label">{p.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="order-charge"
            id="checkout-btn"
            onClick={onCheckout}
            disabled={!hasItems}
          >
            Charge {formatPrice(total)}
          </button>
        </div>
      </div>
    </aside>
  );
}
