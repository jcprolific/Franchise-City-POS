import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrand } from '../context/BrandContext';
import { supabase } from '../lib/supabase';
import {
  computeTodayRevenue,
  countOrdersByStatus,
  fetchOrderItems,
  fetchTodayOrders,
  filterOrdersByTab,
  refundOrder,
  toRecentTransactions,
  voidOrder,
  type OrderStatus,
  type PosOrderItemDetail,
  type PosOrderRecord,
} from '../lib/ordersService';
import { isCountablePaidSale } from '../lib/saleEligibility';
import { useOutletContext } from 'react-router-dom';
import type { PosOutletContext } from '../App';
import { getCurrentBranch, subscribeBranch, type BranchRef } from '../lib/branchContext';
import './OrdersPage.css';

type StatusFilter = 'ALL' | OrderStatus | 'REVENUE';

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: 'NEW', label: 'New' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'VOIDED', label: 'Voided' },
  { id: 'REVENUE', label: 'Revenue' },
];

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrdersPage() {
  const { brand } = useBrand();
  const { userName } = useOutletContext<PosOutletContext>();
  const [branch, setBranch] = useState<BranchRef>(() => getCurrentBranch());
  const [orders, setOrders] = useState<PosOrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('COMPLETED');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<PosOrderRecord | null>(null);
  const [detailItems, setDetailItems] = useState<PosOrderItemDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => subscribeBranch(() => setBranch(getCurrentBranch())), []);

  useEffect(() => {
    void refreshOrders();

    const POLL_MS = 15_000;
    const pollId = window.setInterval(() => {
      void refreshOrders();
    }, POLL_MS);
    const onFocus = () => {
      void refreshOrders();
    };
    window.addEventListener('focus', onFocus);

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
      window.clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [refreshOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const tabOrders = filterOrdersByTab(orders, statusFilter);
    return tabOrders.filter((order) => {
      const matchesSearch =
        query.length === 0 ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.payment.toLowerCase().includes(query) ||
        order.orderType.toLowerCase().includes(query) ||
        order.paymentReference.toLowerCase().includes(query) ||
        order.terminalId.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.orderNote.toLowerCase().includes(query) ||
        order.chargedByName.toLowerCase().includes(query) ||
        `${order.itemCount} items`.includes(query);

      return matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const openCount = countOrdersByStatus(orders, 'NEW');
  const todayRevenue = computeTodayRevenue(orders);
  const recentTransactions = toRecentTransactions(orders);

  const openDetail = async (order: PosOrderRecord) => {
    if (!isCountablePaidSale(order.status, order.paymentStatus)) return;
    setDetailOrder(order);
    setDetailLoading(true);
    try {
      const items = await fetchOrderItems(order.id);
      setDetailItems(items);
    } finally {
      setDetailLoading(false);
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
      if (detailOrder?.id === order.id) setDetailOrder(null);
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
      if (detailOrder?.id === order.id) setDetailOrder(null);
    } catch (error) {
      console.error('Failed to refund order:', error);
      window.alert('Could not process refund.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="orders-page" id="orders-page">
      <div className="orders-header">
        <div className="orders-header-main">
          <div>
            <h2 className="orders-title">Today&apos;s Orders</h2>
            <span className="orders-branch-label">{branch.locationLabel || branch.name}</span>
          </div>
          <span className="orders-live-badge">
            {syncing ? 'Syncing…' : loadError ? 'Offline' : `Live · ${openCount} open`}
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
          <span className="orders-summary-value">{openCount}</span>
        </article>
        <article className="orders-summary-card orders-summary-card--muted">
          <span className="orders-summary-label">Completed</span>
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

      <section className="orders-recent-panel">
        <h3>Recent Transactions</h3>
        {recentTransactions.length === 0 ? (
          <p className="orders-recent-empty">Completed sales will appear here.</p>
        ) : (
          <div className="orders-recent-table-wrap">
            <table className="orders-recent-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Staff</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.id}</td>
                    <td>{tx.time}</td>
                    <td>{tx.customerName || '—'}</td>
                    <td>{tx.staffName || '—'}</td>
                    <td>{tx.items}</td>
                    <td>{formatPeso(tx.total)}</td>
                    <td>{tx.payment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              {filter.id === 'NEW' && <span className="orders-filter-count">{openCount}</span>}
              {filter.id === 'COMPLETED' && (
                <span className="orders-filter-count">{countOrdersByStatus(orders, 'COMPLETED')}</span>
              )}
              {filter.id === 'VOIDED' && (
                <span className="orders-filter-count">{countOrdersByStatus(orders, 'VOIDED')}</span>
              )}
              {filter.id === 'REVENUE' && (
                <span className="orders-filter-count">{formatPeso(todayRevenue)}</span>
              )}
            </button>
          ))}
        </div>
        <input
          className="orders-search"
          type="search"
          placeholder="Search order #, customer, staff..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="orders-list">
        {statusFilter === 'REVENUE' ? (
          <div className="orders-revenue-panel">
            <p>Revenue today from completed paid orders.</p>
            <strong>{formatPeso(todayRevenue)}</strong>
            <span>{countOrdersByStatus(orders, 'COMPLETED')} completed orders</span>
          </div>
        ) : (
          <>
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
              const isUpdating = updatingId === order.id;
              const isCompleted = isCountablePaidSale(order.status, order.paymentStatus);

              return (
                <article
                  key={order.id}
                  className={`order-card order-card--${order.status.toLowerCase()}${isCompleted ? ' is-clickable' : ''}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => {
                    if (isCompleted) void openDetail(order);
                  }}
                  onKeyDown={(event) => {
                    if (isCompleted && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      void openDetail(order);
                    }
                  }}
                  role={isCompleted ? 'button' : undefined}
                  tabIndex={isCompleted ? 0 : undefined}
                >
                  <div className="order-card-top">
                    <div className="order-card-id-group">
                      <span className="order-card-number">{order.orderNumber}</span>
                      {order.terminalId && (
                        <span className="order-terminal-badge">{order.terminalId}</span>
                      )}
                      <span className={`order-status order-status--${order.status.toLowerCase()}`}>
                        {order.paymentStatus === 'UNPAID' ? 'Open' : order.status}
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
                    {order.customerName && <span className="order-label">{order.customerName}</span>}
                    {order.discountAmount > 0 && (
                      <span className="order-discount-tag">
                        −{formatPeso(order.discountAmount)} discount
                      </span>
                    )}
                  </div>

                  <p className="order-items">
                    {order.payment}
                    {order.paymentReference ? ` · Ref ${order.paymentReference}` : ''}
                    {order.chargedByName ? ` · ${order.chargedByName}` : ''}
                  </p>

                  <div className="order-card-bottom">
                    <div className="order-payment-group">
                      <span className="order-total">{formatPeso(order.total)}</span>
                      <span className="order-payment">{order.paymentStatus}</span>
                    </div>

                    <div className="order-card-actions" onClick={(e) => e.stopPropagation()}>
                      {isCompleted && (
                        <>
                          <button
                            type="button"
                            className="order-action-btn order-action-btn--ghost"
                            disabled={isUpdating}
                            onClick={() => void handleVoidOrder(order)}
                          >
                            Void
                          </button>
                          <button
                            type="button"
                            className="order-action-btn order-action-btn--ghost"
                            disabled={isUpdating}
                            onClick={() => void handleRefundOrder(order)}
                          >
                            Refund
                          </button>
                        </>
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
          </>
        )}
      </div>

      {detailOrder && (
        <div className="orders-detail-backdrop" onClick={() => setDetailOrder(null)}>
          <div className="orders-detail-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h3>{detailOrder.orderNumber}</h3>
              <button type="button" onClick={() => setDetailOrder(null)} aria-label="Close">
                ×
              </button>
            </header>
            <div className="orders-detail-meta">
              <p><strong>Charged:</strong> {detailOrder.timeLabel}</p>
              <p><strong>Staff:</strong> {detailOrder.chargedByName || '—'}</p>
              <p><strong>Customer:</strong> {detailOrder.customerName || '—'}</p>
              <p><strong>Notes:</strong> {detailOrder.orderNote || '—'}</p>
              <p><strong>Payment:</strong> {detailOrder.payment} ({detailOrder.paymentStatus})</p>
              <p><strong>Total:</strong> {formatPeso(detailOrder.total)}</p>
            </div>
            <div className="orders-detail-items">
              <h4>Line items</h4>
              {detailLoading ? (
                <p>Loading items…</p>
              ) : detailItems.length === 0 ? (
                <p>No line items recorded.</p>
              ) : (
                <ul>
                  {detailItems.map((item) => (
                    <li key={item.id}>
                      <span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</span>
                      <span>x{item.quantity}</span>
                      <span>{formatPeso(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
