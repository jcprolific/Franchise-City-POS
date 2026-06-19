import { useMemo, useState } from 'react';
import {
  orderStatusLabels,
  samplePlacementOrders,
  type OrderStatus,
  type PlacementOrder,
} from '../data/ordersMockData';
import { useBrand } from '../context/BrandContext';
import './OrdersPage.css';

type StatusFilter = 'ALL' | OrderStatus;

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'NEW', label: 'New' },
  { id: 'PREPARING', label: 'Preparing' },
  { id: 'READY', label: 'Ready' },
  { id: 'COMPLETED', label: 'Completed' },
];

function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH')}`;
}

function countByStatus(orders: PlacementOrder[], status: OrderStatus) {
  return orders.filter((order) => order.status === status).length;
}

export default function OrdersPage() {
  const { brand } = useBrand();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return samplePlacementOrders.filter((order) => {
      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.itemsSummary.toLowerCase().includes(query) ||
        order.label.toLowerCase().includes(query) ||
        order.type.toLowerCase().includes(query) ||
        order.payment.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter]);

  const activeCount = samplePlacementOrders.filter(
    (order) => order.status !== 'COMPLETED'
  ).length;

  return (
    <div className="orders-page" id="orders-page">
      <div className="orders-header">
        <div className="orders-header-main">
          <span className="orders-branch-label">{brand.branchLabel}</span>
          <span className="orders-live-badge">Live queue · {activeCount} active</span>
        </div>
      </div>

      <section className="orders-summary-row">
        <article className="orders-summary-card">
          <span className="orders-summary-label">New</span>
          <span className="orders-summary-value">{countByStatus(samplePlacementOrders, 'NEW')}</span>
        </article>
        <article className="orders-summary-card">
          <span className="orders-summary-label">Preparing</span>
          <span className="orders-summary-value">{countByStatus(samplePlacementOrders, 'PREPARING')}</span>
        </article>
        <article className="orders-summary-card">
          <span className="orders-summary-label">Ready</span>
          <span className="orders-summary-value">{countByStatus(samplePlacementOrders, 'READY')}</span>
        </article>
        <article className="orders-summary-card orders-summary-card--muted">
          <span className="orders-summary-label">Completed Today</span>
          <span className="orders-summary-value">{countByStatus(samplePlacementOrders, 'COMPLETED')}</span>
        </article>
      </section>

      <div className="orders-toolbar">
        <div className="orders-filter-tabs">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`orders-filter-tab ${statusFilter === filter.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          className="orders-search"
          type="search"
          placeholder="Search order #, items, table..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="orders-list">
        {filteredOrders.map((order, index) => (
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
              <span className="order-card-time">{order.placedAt}</span>
            </div>

            <div className="order-card-meta">
              <span className="order-type">{order.type}</span>
              <span className="order-label">{order.label}</span>
              <span className="order-item-count">{order.itemCount} items</span>
            </div>

            <p className="order-items">{order.itemsSummary}</p>

            <div className="order-card-bottom">
              <div className="order-payment-group">
                <span className="order-total">{formatPeso(order.total)}</span>
                <span className="order-payment">{order.payment}</span>
              </div>
              <button type="button" className="order-action-btn" disabled>
                {order.status === 'NEW' && 'Start Prep'}
                {order.status === 'PREPARING' && 'Mark Ready'}
                {order.status === 'READY' && 'Complete'}
                {order.status === 'COMPLETED' && 'View Receipt'}
              </button>
            </div>
          </article>
        ))}

        {filteredOrders.length === 0 && (
          <div className="orders-empty">
            <p>No orders match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
