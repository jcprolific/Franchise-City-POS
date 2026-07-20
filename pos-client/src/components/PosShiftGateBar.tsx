import { useState } from 'react';
import {
  CUP_FIELD_LABELS,
  emptyCupCounts,
  normalizeCupCounts,
  type CupInventoryCounts,
} from '../lib/cupInventory';
import './PosShiftGateBar.css';

const GATE_CUP_KEYS = ['small', 'medium', 'large', 'extraLarge'] as const;

interface PosShiftGateBarProps {
  cashierName: string;
  onTimeIn: (openingCash: number, beginningCups: CupInventoryCounts) => Promise<void>;
}

export default function PosShiftGateBar({ cashierName, onTimeIn }: PosShiftGateBarProps) {
  const [openingCash, setOpeningCash] = useState('500');
  const [beginningCups, setBeginningCups] = useState<CupInventoryCounts>(() => emptyCupCounts());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setCup = (key: string, value: number) => {
    setBeginningCups((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  };

  const handleTimeIn = async () => {
    setError('');
    setBusy(true);
    try {
      await onTimeIn(Math.max(0, Number(openingCash) || 0), normalizeCupCounts(beginningCups));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open shift.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pos-shift-gate" aria-label="Time in">
      <div className="pos-shift-gate-main">
        <div className="pos-shift-gate-copy">
          <strong>Time in</strong>
          <span>Welcome, {cashierName}. Set petty cash and beginning cups to start selling.</span>
        </div>
        <label className="pos-shift-gate-field">
          <span>Petty cash (₱)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
          />
        </label>
        <div className="pos-shift-gate-cups">
          {GATE_CUP_KEYS.map((key) => (
            <label key={key} className="pos-shift-gate-cup">
              <span>{CUP_FIELD_LABELS[key]}</span>
              <input
                type="number"
                min="0"
                value={beginningCups[key] || ''}
                placeholder="0"
                onChange={(e) => setCup(key, Number(e.target.value) || 0)}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="pos-shift-gate-btn"
          disabled={busy}
          onClick={() => void handleTimeIn()}
        >
          {busy ? 'Opening…' : 'Time In'}
        </button>
      </div>
      {error && (
        <p className="pos-shift-gate-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
