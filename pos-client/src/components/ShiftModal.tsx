import { useEffect, useState } from 'react';
import {
  CUP_FIELD_LABELS,
  DEFAULT_CUP_KEYS,
  emptyCupCounts,
  normalizeCupCounts,
  type CupInventoryCounts,
} from '../lib/cupInventory';
import './ShiftModal.css';

interface ShiftOpenModalProps {
  cashierName: string;
  onConfirm: (openingCash: number, beginningCups: CupInventoryCounts) => void;
  onCancel: () => void;
}

export function ShiftOpenModal({ cashierName, onConfirm, onCancel }: ShiftOpenModalProps) {
  const [openingCash, setOpeningCash] = useState('500');
  const [beginningCups, setBeginningCups] = useState<CupInventoryCounts>(() => emptyCupCounts());

  const setCup = (key: string, value: number) => {
    setBeginningCups((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  return (
    <div className="shift-modal-backdrop" role="dialog" aria-modal="true">
      <div className="shift-modal shift-modal--wide">
        <h2>Time In — Open Shift</h2>
        <p>Welcome, {cashierName}. Count petty cash and beginning cups before POS.</p>
        <label className="shift-modal-field">
          <span>Opening petty cash (₱)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            autoFocus
          />
        </label>
        <div className="shift-cups-grid">
          <span className="shift-cups-title">Beginning cups</span>
          {DEFAULT_CUP_KEYS.map((key) => (
            <label key={key} className="shift-cup-field">
              <span>{CUP_FIELD_LABELS[key] ?? key}</span>
              <input
                type="number"
                min="0"
                value={beginningCups[key] || ''}
                onChange={(e) => setCup(key, Number(e.target.value) || 0)}
              />
            </label>
          ))}
        </div>
        <div className="shift-modal-actions">
          <button type="button" className="shift-modal-btn shift-modal-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="shift-modal-btn shift-modal-btn--primary"
            onClick={() =>
              onConfirm(Math.max(0, Number(openingCash) || 0), normalizeCupCounts(beginningCups))
            }
          >
            Time In
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
  onConfirm: (closingCash: number, endingCups: CupInventoryCounts) => void;
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
  const [endingCups, setEndingCups] = useState<CupInventoryCounts>(() => emptyCupCounts());
  const variance = (Number(closingCash) || 0) - expectedCash;

  const setCup = (key: string, value: number) => {
    setEndingCups((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  return (
    <div className="shift-modal-backdrop" role="dialog" aria-modal="true">
      <div className="shift-modal shift-modal--wide">
        <h2>Time Out — Close Shift (Z-Report)</h2>
        <p>End shift for {cashierName}. X-Report is mid-shift check without closing.</p>
        <div className="shift-modal-summary">
          <div><span>Total sales</span><strong>₱{totalSales.toFixed(2)}</strong></div>
          <div><span>Orders</span><strong>{totalOrders}</strong></div>
          <div><span>Expected cash</span><strong>₱{expectedCash.toFixed(2)}</strong></div>
        </div>
        <div className="shift-cups-grid">
          <span className="shift-cups-title">Ending cups</span>
          {DEFAULT_CUP_KEYS.map((key) => (
            <label key={key} className="shift-cup-field">
              <span>{CUP_FIELD_LABELS[key] ?? key}</span>
              <input
                type="number"
                min="0"
                value={endingCups[key] || ''}
                onChange={(e) => setCup(key, Number(e.target.value) || 0)}
              />
            </label>
          ))}
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
            X-Report (mid-shift)
          </button>
          <button type="button" className="shift-modal-btn shift-modal-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="shift-modal-btn shift-modal-btn--primary"
            onClick={() =>
              onConfirm(Math.max(0, Number(closingCash) || 0), normalizeCupCounts(endingCups))
            }
          >
            Time Out
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
