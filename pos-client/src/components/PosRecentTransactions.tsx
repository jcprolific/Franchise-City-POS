import { useCallback, useEffect, useState } from 'react';
import { useBrand } from '../context/BrandContext';
import { fetchTodayOrders, toBaristaRecentTransactions } from '../lib/ordersService';
import './PosRecentTransactions.css';

function formatPeso(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
}

type RecentTx = {
  id: string;
  time: string;
  items: number;
  total: number;
  payment: string;
  customerName: string;
};

interface PosRecentTransactionsProps {
  staffName: string;
}

export default function PosRecentTransactions({ staffName }: PosRecentTransactionsProps) {
  const { brand } = useBrand();
  const [rows, setRows] = useState<RecentTx[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const orders = await fetchTodayOrders(brand.dbBrandId);
      setRows(toBaristaRecentTransactions(orders, staffName));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [brand.dbBrandId, staffName]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <section className="pos-recent-panel" aria-label="Recent transactions">
        <h3 className="pos-recent-title">Your Recent Sales</h3>
        <p className="pos-recent-empty">Loading…</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="pos-recent-panel" aria-label="Recent transactions">
        <h3 className="pos-recent-title">Your Recent Sales</h3>
        <p className="pos-recent-empty">Completed charges will appear here.</p>
      </section>
    );
  }

  return (
    <section className="pos-recent-panel" aria-label="Recent transactions">
      <h3 className="pos-recent-title">Your Recent Sales</h3>
      <div className="pos-recent-table-wrap">
        <table className="pos-recent-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Items</th>
              <th>Total</th>
              <th>Pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr key={`${tx.id}-${tx.time}`}>
                <td>{tx.id}</td>
                <td>{tx.time}</td>
                <td>{tx.items}</td>
                <td>{formatPeso(tx.total)}</td>
                <td>{tx.payment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
