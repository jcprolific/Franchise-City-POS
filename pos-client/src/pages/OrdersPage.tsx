import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrand } from '../context/BrandContext';
import { supabase } from '../lib/supabase';
import {
  countOrdersByStatus,
  fetchTodayOrders,
  nextOrderStatus,
  orderActionLabels,
  orderStatusLabels,
  refundOrder,
  updateOrderStatus,
  voidOrder,
  type OrderStatus,
  type PosOrderRecord,
} from '../lib/ordersService';
import { useOutletContext } from 'react-router-dom';
import type { PosOutletContext } from '../App';
import './OrdersPage.css';

type StatusFilter = 'ALL' | OrderStatus;

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'NEW', label: 'New' },
  { id: 'PREPARING', label: 'Preparing' },
  { id: 'READY', label: 'Ready' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'VOIDED', label: 'Voided' },
  { id: 'REFUNDED', label: 'Refunded' },
];

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrdersPage() {
  const { brand } = useBrand();
  const { userName } = useOutletContext<PosOutletContext>();
  const [orders, setOrders] = useState<PosOrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    setSyncing(true);
    try {
      setLoadError('');
      const rows = await fetchTodayOrders(brand.dbBrandId);
      setOrders(rows);
    } catch (error) {
      console.error('Orders sync failed:', error);
      const message = error instanceof Error ? error.message : 'Unable to load orders from Supabase.';
      setLoadError(message);
    } finally {
      setSyncing(false);
    }
  }, [brand.dbBrandId]);

  useEffect(() => {
    void refreshOrders();

    const channel = supabase
      .channel('orders-pos-order-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_order' },
        () => {
          void refreshOrders();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.payment.toLowerCase().includes(query) ||
        order.orderType.toLowerCase().includes(query) ||
        order.paymentReference.toLowerCase().includes(query) ||
        `${order.itemCount} items`.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const activeCount = orders.filter(
    (order) => order.status !== 'COMPLETED' && order.status !== 'VOIDED' && order.status !== 'REFUNDED'
  ).length;

  const todayRevenue = orders
    .filter((order) => order.status === 'COMPLETED')
    .reduce((sum, order) => sum + order.total, 0);

  const handleAdvanceStatus = async (order: PosOrderRecord) => {
    const next = nextOrderStatus[order.status];
    if (!next) return;

    try {
      setUpdatingId(order.id);
      await updateOrderStatus(order.id, next);
      await refreshOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      window.alert('Could not update order status. Make sure Supabase update policy is enabled.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVoidOrder = async (order: PosOrderRecord) => {
    const reason = window.prompt(`Void order ${order.orderNumber} — reason:`);
    if (!reason?.trim()) return;

    const confirmed = window.confirm(
      `Void order ${order.orderNumber}? This removes it from today's sales totals.`
    );
    if (!confirmed) return;

    try {
      setUpdatingId(order.id);
      await voidOrder(order.id, reason.trim(), userName || 'Staff');
      await refreshOrders();
    } catch (error) {
      console.error('Failed to void order:', error);
      window.alert('Could not void order. Make sure Supabase update policy is enabled.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRefundOrder = async (order: PosOrderRecord) => {
    const reason = window.prompt(`Refund order ${order.orderNumber} — reason:`);
    if (!reason?.trim()) return;

    const amountStr = window.prompt(
      `Refund amount (full order: ${formatPeso(order.total)}):`,
      String(order.total)
    );
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert('Enter a valid refund amount.');
      return;
    }

    try {
      setUpdatingId(order.id);
      await refundOrder(order.id, amount, reason.trim());
      await refreshOrders();
    } catch (error) {
      console.error('Failed to refund order:', error);
      window.alert('Could not process refund.');
    } finally {
      setUpdatingId(null);
    }
  };

  const canVoid = (status: OrderStatus) =>
    status === 'NEW' || status === 'PREPARING' || status === 'READY' || status === 'COMPLETED';

  return (
    <div className="orders-page" id="orders-page">
      <div className="orders-header">
        <div className="orders-header-main">
          <div>
            <h2 className="orders-title">Today&apos;s Orders</h2>
            <span className="orders-branch-label">{brand.branchLabel}</span>
          </div>
          <span className="orders-live-badge">
            {syncing ? 'Syncing…' : loadError ? 'Offline' : `Live · ${activeCount} active`}
          </span>
        </div>
        <button type="button" className="orders-refresh-btn" onClick={() => void refreshOrders()}>
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="orders-error-banner" role="alert">
          {loadError}
        </div>
      )}

      <section className="orders-summary-row">
        <article className="orders-summary-card">
          <span className="orders-summary-label">New</span>
          <span className="orders-summary-value">{countOrdersByStatus(orders, 'NEW')}</span>
        </article>
        <article className="orders-summary-card">
          <span className="orders-summary-label">Preparing</span>
          <span className="orders-summary-value">{countOrdersByStatus(orders, 'PREPARING')}</span>
        </article>
        <article className="orders-summary-card">
          <span className="orders-summary-label">Ready</span>
          <span className="orders-summary-value">{countOrdersByStatus(orders, 'READY')}</span>
        </article>
        <article className="orders-summary-card orders-summary-card--muted">
          <span className="orders-summary-label">Completed Today</span>
          <span className="orders-summary-value">{countOrdersByStatus(orders, 'COMPLETED')}</span>
        </article>
        <article className="orders-summary-card orders-summary-card--void">
          <span className="orders-summary-label">Voided</span>
          <span className="orders-summary-value">{countOrdersByStatus(orders, 'VOIDED')}</span>
        </article>
        <article className="orders-summary-card orders-summary-card--revenue">
          <span className="orders-summary-label">Revenue Today</span>
          <span className="orders-summary-value">{formatPeso(todayRevenue)}</span>
        </article>
      </section>

      <div className="orders-toolbar">
        <div className="orders-filter-tabs" role="tablist" aria-label="Filter orders">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.id}
              className={`orders-filter-tab ${statusFilter === filter.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
              {filter.id !== 'ALL' && (
                <span className="orders-filter-count">
                  {countOrdersByStatus(orders, filter.id as OrderStatus)}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          className="orders-search"
          type="search"
          placeholder="Search order #, payment, type..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="orders-list">
        {syncing && filteredOrders.length === 0 && (
          <div className="orders-empty">
            <p>Syncing today&apos;s orders…</p>
          </div>
        )}

        {!syncing && filteredOrders.length === 0 && (
          <div className="orders-empty">
            <p>
              {orders.length === 0
                ? 'No orders yet today. Complete a sale on POS to see it here.'
                : 'No orders match your filter.'}
            </p>
          </div>
        )}

        {filteredOrders.map((order, index) => {
          const nextStatus = nextOrderStatus[order.status];
          const isUpdating = updatingId === order.id;

          return (
            <article
              key={order.id}
              className={`order-card order-card--${order.status.toLowerCase()}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="order-card-top">
                <div className="order-card-id-group">
                  <span className="order-card-number">{order.orderNumber}</span>
                  <span className={`order-status order-status--${order.status.toLowerCase()}`}>
                    {orderStatusLabels[order.status]}
                  </span>
                </div>
                <div className="order-card-time-group">
                  <span className="order-card-time">{order.relativeTime}</span>
                  <span className="order-card-time-sub">{order.timeLabel}</span>
                </div>
              </div>

              <div className="order-card-meta">
                <span className="order-type">{order.orderType}</span>
                <span className="order-label">{order.itemCount} items</span>
                {order.discountAmount > 0 && (
                  <span className="order-discount-tag">
                    −{formatPeso(order.discountAmount)} discount
                  </span>
                )}
              </div>

              <p className="order-items">
                {order.payment}
                {order.paymentReference ? ` · Ref ${order.paymentReference}` : ''}
              </p>

              <div className="order-card-bottom">
                <div className="order-payment-group">
                  <span className="order-total">{formatPeso(order.total)}</span>
                  <span className="order-payment">{order.paymentStatus}</span>
                </div>

                <div className="order-card-actions">
                  {nextStatus && (
                    <button
                      type="button"
                      className="order-action-btn"
                      disabled={isUpdating}
                      onClick={() => void handleAdvanceStatus(order)}
                    >
                      {isUpdating ? 'Saving…' : orderActionLabels[order.status]}
                    </button>
                  )}

                  {canVoid(order.status) && (
                    <button
                      type="button"
                      className="order-action-btn order-action-btn--ghost"
                      disabled={isUpdating}
                      onClick={() => void handleVoidOrder(order)}
                    >
                      Void
                    </button>
                  )}

                  {order.status === 'COMPLETED' && (
                    <button
                      type="button"
                      className="order-action-btn order-action-btn--ghost"
                      disabled={isUpdating}
                      onClick={() => void handleRefundOrder(order)}
                    >
                      Refund
                    </button>
                  )}

                  {order.status === 'VOIDED' && (
                    <span className="order-void-note">
                      {order.voidReason ? order.voidReason : 'Removed from sales'}
                    </span>
                  )}

                  {order.status === 'REFUNDED' && (
                    <span className="order-void-note">
                      Refunded {formatPeso(order.refundAmount || order.total)}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
