import { useState } from 'react';
import type { PaymentMethod } from '../types';
import './CheckoutModal.css';

interface CheckoutModalProps {
  total: number;
  paymentMethod: PaymentMethod;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CheckoutModal({ total, paymentMethod, onConfirm, onCancel }: CheckoutModalProps) {
  const [cashTendered, setCashTendered] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const cashAmount = parseFloat(cashTendered) || 0;
  const change = cashAmount - total;
  const isCash = paymentMethod === 'CASH';
  const canConfirm = isCash ? cashAmount >= total : true;

  const quickAmounts = [100, 200, 500, 1000];

  const handleConfirm = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onConfirm();
    }, 2000);
  };

  const orderId = `#${Math.floor(1000 + Math.random() * 9000)}`;

  if (showSuccess) {
    return (
      <div className="checkout-overlay" id="checkout-success-overlay">
        <div className="checkout-modal">
          <div className="checkout-success">
            <div className="success-icon">✅</div>
            <div className="success-title">Order Complete!</div>
            <div className="success-order-id">Order {orderId}</div>
            {isCash && change > 0 && (
              <div style={{ marginBottom: '24px', color: 'var(--success)', fontSize: 'var(--font-lg)', fontWeight: 700 }}>
                Change: ₱{change.toFixed(2)}
              </div>
            )}
            <button className="success-done-btn" onClick={onConfirm}>
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-overlay" onClick={onCancel} id="checkout-modal">
      <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkout-header">
          <h2>Checkout</h2>
          <div className="checkout-method">Payment via {paymentMethod}</div>
        </div>

        <div className="checkout-body">
          <div className="checkout-total-display">
            <div className="checkout-total-label">Total Amount</div>
            <div className="checkout-total-amount">₱{total.toFixed(2)}</div>
          </div>

          {isCash && (
            <div className="cash-tender-section">
              <span className="cash-tender-label">Cash Tendered</span>
              <div className="cash-input-wrapper">
                <span className="peso-sign">₱</span>
                <input
                  className="cash-input"
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  id="cash-input"
                />
              </div>
              <div className="quick-cash-buttons">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    className="quick-cash-btn"
                    onClick={() => setCashTendered(amt.toString())}
                  >
                    ₱{amt}
                  </button>
                ))}
              </div>
              {cashAmount > 0 && (
                <div className={`change-display ${change < 0 ? 'insufficient' : ''}`}>
                  <div className="change-label">{change >= 0 ? 'Change' : 'Insufficient'}</div>
                  <div className="change-amount">
                    {change >= 0 ? `₱${change.toFixed(2)}` : `-₱${Math.abs(change).toFixed(2)}`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="checkout-footer">
          <button className="checkout-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="checkout-confirm-btn"
            onClick={handleConfirm}
            disabled={!canConfirm}
            id="confirm-checkout-btn"
          >
            {isCash ? 'Complete Sale' : `Pay via ${paymentMethod}`}
          </button>
        </div>
      </div>
    </div>
  );
}
