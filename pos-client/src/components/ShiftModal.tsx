import { useEffect, useState } from 'react';
import './ShiftModal.css';

interface ShiftOpenModalProps {
  cashierName: string;
  onConfirm: (openingCash: number) => void;
  onCancel: () => void;
}

export function ShiftOpenModal({ cashierName, onConfirm, onCancel }: ShiftOpenModalProps) {
  const [openingCash, setOpeningCash] = useState('500');

  return (
    <div className="shift-modal-backdrop" role="dialog" aria-modal="true">
      <div className="shift-modal">
        <h2>Open Shift</h2>
        <p>Welcome, {cashierName}. Count the starting cash in the drawer.</p>
        <label className="shift-modal-field">
          <span>Opening cash (₱)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            autoFocus
          />
        </label>
        <div className="shift-modal-actions">
          <button type="button" className="shift-modal-btn shift-modal-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="shift-modal-btn shift-modal-btn--primary"
            onClick={() => onConfirm(Math.max(0, Number(openingCash) || 0))}
          >
            Start Shift
          </button>
        </div>
      </div>
    </div>
  );
}

interface ShiftCloseModalProps {
  cashierName: string;
  expectedCash: number;
  totalSales: number;
  totalOrders: number;
  onConfirm: (closingCash: number) => void;
  onCancel: () => void;
  onXReport: () => void;
}

export function ShiftCloseModal({
  cashierName,
  expectedCash,
  totalSales,
  totalOrders,
  onConfirm,
  onCancel,
  onXReport,
}: ShiftCloseModalProps) {
  const [closingCash, setClosingCash] = useState(expectedCash.toFixed(2));
  const variance = (Number(closingCash) || 0) - expectedCash;

  return (
    <div className="shift-modal-backdrop" role="dialog" aria-modal="true">
      <div className="shift-modal">
        <h2>Close Shift (Z-Report)</h2>
        <p>End shift for {cashierName}. Reconcile drawer cash before closing.</p>
        <div className="shift-modal-summary">
          <div><span>Total sales</span><strong>₱{totalSales.toFixed(2)}</strong></div>
          <div><span>Orders</span><strong>{totalOrders}</strong></div>
          <div><span>Expected cash</span><strong>₱{expectedCash.toFixed(2)}</strong></div>
        </div>
        <label className="shift-modal-field">
          <span>Actual cash in drawer (₱)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
          />
        </label>
        <p className={`shift-modal-variance ${variance === 0 ? 'is-balanced' : variance < 0 ? 'is-short' : 'is-over'}`}>
          Variance: ₱{variance.toFixed(2)}
        </p>
        <div className="shift-modal-actions">
          <button type="button" className="shift-modal-btn shift-modal-btn--ghost" onClick={onXReport}>
            X-Report
          </button>
          <button type="button" className="shift-modal-btn shift-modal-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="shift-modal-btn shift-modal-btn--primary"
            onClick={() => onConfirm(Math.max(0, Number(closingCash) || 0))}
          >
            Close Shift
          </button>
        </div>
      </div>
    </div>
  );
}

export function useActiveShiftBadge() {
  const [hasShift, setHasShift] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem('coftea.pos.activeShift');
        setHasShift(!!raw && JSON.parse(raw)?.status === 'open');
      } catch {
        setHasShift(false);
      }
    };
    read();
    const interval = setInterval(read, 2000);
    return () => clearInterval(interval);
  }, []);

  return hasShift;
}
