import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrand } from '../../context/BrandContext';
import { supabase } from '../../lib/supabase';
import {
  fetchSupplyOrders,
  nextSupplyStatus,
  updateSupplyOrderStatus,
  SUPPLY_ORDER_STATUS_LABELS,
  type SupplyOrder,
  type SupplyOrderStatus,
} from '../../lib/supplyOrderService';
import './SupplyOrdersPage.css';

type StatusFilter = 'all' | SupplyOrderStatus;

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PAYMENT_LABELS: Record<SupplyOrder['paymentMethod'], string> = {
  gcash: 'GCash',
  bank_transfer: 'Bank Transfer',
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SupplyOrdersPage() {
  const { brand } = useBrand();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSyncing(true);
    const rows = await fetchSupplyOrders(brand.dbBrandId);
    setOrders(rows);
    setSyncing(false);
  }, [brand.dbBrandId]);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel('supply-order-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supply_order' },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const stats = useMemo(() => {
    const active = orders.filter(
      (o) => o.status !== 'delivered' && o.status !== 'cancelled'
    );
    const pending = orders.filter((o) => o.status === 'pending').length;
    const openValue = active.reduce((sum, o) => sum + o.totalAmount, 0);
    return { total: orders.length, pending, openValue };
  }, [orders]);

  const advance = async (order: SupplyOrder) => {
    const next = nextSupplyStatus(order.status);
    if (!next) return;
    setUpdatingId(order.id);
    const { error } = await updateSupplyOrderStatus(order.id, next, brand.dbBrandId);
    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
      );
    }
    setUpdatingId(null);
  };

  const cancel = async (order: SupplyOrder) => {
    setUpdatingId(order.id);
    const { error } = await updateSupplyOrderStatus(order.id, 'cancelled');
    if (!error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o))
      );
    }
    setUpdatingId(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Supply Orders</h1>
          <p>Raw-material reorders placed by {brand.name} franchisees</p>
        </div>
      </div>

      <div className="so-stats">
        <div className="so-stat">
          <span className="so-stat-value">{stats.total}</span>
          <span className="so-stat-label">Total orders</span>
        </div>
        <div className="so-stat">
          <span className="so-stat-value">{stats.pending}</span>
          <span className="so-stat-label">Awaiting approval</span>
        </div>
        <div className="so-stat">
          <span className="so-stat-value">{peso.format(stats.openValue)}</span>
          <span className="so-stat-label">Open order value</span>
        </div>
      </div>

      <div className="so-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`so-filter ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="so-empty">
          <div className="so-empty-icon">{syncing ? '⏳' : '📦'}</div>
          {syncing
            ? 'Syncing supply orders…'
            : orders.length === 0
              ? 'No supply orders yet. Orders placed by franchisees will appear here.'
              : 'No orders match this filter.'}
        </div>
      ) : (
        <div className="so-list">
          {filtered.map((order) => {
            const isOpen = expanded === order.id;
            const next = nextSupplyStatus(order.status);
            const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
            return (
              <div className={`so-card ${isOpen ? 'open' : ''}`} key={order.id}>
                <button
                  className="so-card-head"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  <div className="so-card-main">
                    <span className="so-ref">{order.referenceNo}</span>
                    <span className="so-branch">{order.branchName}</span>
                  </div>
                  <div className="so-card-meta">
                    <span className="so-date">{formatDateTime(order.createdAt)}</span>
                    <span className="so-payment">{PAYMENT_LABELS[order.paymentMethod]}</span>
                    <span className="so-items">{order.itemCount} units</span>
                    <span className="so-total">{peso.format(order.totalAmount)}</span>
                    <span className={`so-status so-status--${order.status}`}>
                      {SUPPLY_ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <span className="so-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="so-card-body">
                    <div className="so-line-head">
                      <span>Item</span>
                      <span>Qty</span>
                      <span>Unit price</span>
                      <span>Line total</span>
                    </div>
                    {order.items.map((item) => (
                      <div className="so-line" key={item.id}>
                        <span className="so-line-name">
                          {item.name}
                          <span className="so-line-pack">{item.packaging}</span>
                        </span>
                        <span>{item.quantity} {item.unit}</span>
                        <span>{peso.format(item.unitPrice)}</span>
                        <span className="so-line-total">{peso.format(item.lineTotal)}</span>
                      </div>
                    ))}

                    {order.placedBy && (
                      <div className="so-placed-by">Placed by {order.placedBy}</div>
                    )}
                    <div className="so-payment-detail">
                      Payment method: <strong>{PAYMENT_LABELS[order.paymentMethod]}</strong>
                    </div>
                    {order.notes && (
                      <div className="so-notes">“{order.notes}”</div>
                    )}

                    {!isTerminal && (
                      <div className="so-actions">
                        {next && (
                          <button
                            className="so-advance"
                            disabled={updatingId === order.id}
                            onClick={() => advance(order)}
                          >
                            Mark as {SUPPLY_ORDER_STATUS_LABELS[next]}
                          </button>
                        )}
                        <button
                          className="so-cancel"
                          disabled={updatingId === order.id}
                          onClick={() => cancel(order)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
