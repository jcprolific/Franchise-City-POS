import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CalendarClock,
  Clock3,
  MapPin,
  Package,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import {
  createDelivery,
  createStockProduct,
  ensureSampleDeliveries,
  ensureSampleStock,
  type DeliveryDirection,
  type DeliveryRow,
  type DeliveryStatus,
  type StockRow,
} from '../lib/warehouseService';
import './WarehouseManagement.css';

interface ExpiryRow {
  id: string;
  name: string;
  lot: string;
  location: string;
  quantity: number;
  unit: string;
  expiresOn: string; // YYYY-MM-DD
}

interface ParcelEvent {
  id: string;
  label: string;
  location: string;
  timeLabel: string;
  done: boolean;
}

interface ParcelRow {
  id: string;
  trackingNo: string;
  courier: string;
  origin: string;
  destination: string;
  lastKnownLocation: string;
  status: 'PICKED_UP' | 'SORTING' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  etaMinutes: number;
  updatedAtLabel: string;
  events: ParcelEvent[];
}

const EXPIRY_WARN_DAYS = 90;
const EXPIRY_CRITICAL_DAYS = 30;

const STORAGE_LOCATIONS = ['Main Warehouse', 'Cold Storage A', 'Dry Storage'];
const STOCK_UNITS = ['kg', 'L', 'bottle', 'pc', 'can', 'box'];

const emptyDeliveryForm = {
  direction: 'IN' as DeliveryDirection,
  party: '',
  date: new Date().toISOString().slice(0, 10),
  items: '1',
  status: 'SCHEDULED' as DeliveryStatus,
  notes: '',
};

const emptyProductForm = {
  name: '',
  unit: 'kg',
  onHand: '',
  parLevel: '',
  reorderPoint: '',
  location: 'Main Warehouse',
};

const sampleDeliveries: DeliveryRow[] = [
  {
    id: 'd-1',
    reference: 'DR-2026-0412',
    party: 'Bean Origin Trading',
    date: '2026-04-22',
    items: 12,
    status: 'IN_TRANSIT',
    direction: 'IN',
    notes: 'Espresso beans, Arabica 60kg',
  },
  {
    id: 'd-2',
    reference: 'DR-2026-0411',
    party: 'Dairy Delight Co.',
    date: '2026-04-21',
    items: 8,
    status: 'RECEIVED',
    direction: 'IN',
  },
  {
    id: 'd-3',
    reference: 'TO-2026-0087',
    party: 'BGC Central',
    date: '2026-04-22',
    items: 6,
    status: 'DISPATCHED',
    direction: 'OUT',
    notes: 'Weekly syrup replenishment',
  },
  {
    id: 'd-4',
    reference: 'TO-2026-0086',
    party: 'Quezon Ave.',
    date: '2026-04-20',
    items: 4,
    status: 'SCHEDULED',
    direction: 'OUT',
  },
  {
    id: 'd-5',
    reference: 'DR-2026-0410',
    party: 'Sweet Leaf PH',
    date: '2026-04-19',
    items: 5,
    status: 'RECEIVED',
    direction: 'IN',
  },
];

const sampleStock: StockRow[] = [
  { id: 's-1', name: 'Arabica Espresso Beans', unit: 'kg', onHand: 42, parLevel: 60, reorderPoint: 20, location: 'Main Warehouse' },
  { id: 's-2', name: 'Whole Milk', unit: 'L', onHand: 18, parLevel: 60, reorderPoint: 25, location: 'Cold Storage A' },
  { id: 's-3', name: 'Caramel Syrup', unit: 'bottle', onHand: 12, parLevel: 20, reorderPoint: 6, location: 'Main Warehouse' },
  { id: 's-4', name: 'Paper Cups (16oz)', unit: 'pc', onHand: 2400, parLevel: 3000, reorderPoint: 1200, location: 'Dry Storage' },
  { id: 's-5', name: 'Chocolate Powder', unit: 'kg', onHand: 9, parLevel: 12, reorderPoint: 4, location: 'Main Warehouse' },
  { id: 's-6', name: 'Vanilla Syrup', unit: 'bottle', onHand: 28, parLevel: 20, reorderPoint: 6, location: 'Main Warehouse' },
];

const sampleExpiry: ExpiryRow[] = [
  { id: 'e-1', name: 'Whole Milk', lot: 'LOT-24119', location: 'Cold Storage A', quantity: 18, unit: 'L', expiresOn: addDays(12) },
  { id: 'e-2', name: 'Caramel Syrup', lot: 'LOT-10441', location: 'Main Warehouse', quantity: 6, unit: 'bottle', expiresOn: addDays(48) },
  { id: 'e-3', name: 'Chocolate Powder', lot: 'LOT-22205', location: 'Main Warehouse', quantity: 4, unit: 'kg', expiresOn: addDays(75) },
  { id: 'e-4', name: 'Vanilla Syrup', lot: 'LOT-50120', location: 'Main Warehouse', quantity: 12, unit: 'bottle', expiresOn: addDays(140) },
  { id: 'e-5', name: 'Condensed Milk', lot: 'LOT-30118', location: 'Dry Storage', quantity: 24, unit: 'can', expiresOn: addDays(85) },
  { id: 'e-6', name: 'Matcha Powder', lot: 'LOT-33012', location: 'Main Warehouse', quantity: 3, unit: 'kg', expiresOn: addDays(-3) },
];

const sampleParcels: ParcelRow[] = [
  {
    id: 'p-1',
    trackingNo: 'SHP-8892-4401',
    courier: 'Shopee Xpress',
    origin: 'Main Warehouse',
    destination: 'BGC Central',
    lastKnownLocation: 'EDSA Guadalupe Hub',
    status: 'IN_TRANSIT',
    etaMinutes: 38,
    updatedAtLabel: 'Updated 1 min ago',
    events: [
      { id: 'p1-e1', label: 'Parcel packed', location: 'Main Warehouse', timeLabel: '8:40 AM', done: true },
      { id: 'p1-e2', label: 'Picked up by rider', location: 'Main Warehouse Dock', timeLabel: '9:05 AM', done: true },
      { id: 'p1-e3', label: 'In transit to destination hub', location: 'EDSA Guadalupe Hub', timeLabel: '9:38 AM', done: true },
      { id: 'p1-e4', label: 'Out for delivery', location: 'BGC Delivery Zone', timeLabel: 'ETA 10:25 AM', done: false },
    ],
  },
  {
    id: 'p-2',
    trackingNo: 'TTK-1183-9022',
    courier: 'TikTok Logistics',
    origin: 'Main Warehouse',
    destination: 'Quezon Ave.',
    lastKnownLocation: 'Timog Sorting Facility',
    status: 'OUT_FOR_DELIVERY',
    etaMinutes: 14,
    updatedAtLabel: 'Updated now',
    events: [
      { id: 'p2-e1', label: 'Parcel packed', location: 'Main Warehouse', timeLabel: '7:25 AM', done: true },
      { id: 'p2-e2', label: 'Sorted at facility', location: 'Timog Sorting Facility', timeLabel: '8:10 AM', done: true },
      { id: 'p2-e3', label: 'Out for delivery', location: 'Scout Area QC', timeLabel: '9:42 AM', done: true },
      { id: 'p2-e4', label: 'Delivered to branch receiver', location: 'Quezon Ave.', timeLabel: 'ETA 10:05 AM', done: false },
    ],
  },
  {
    id: 'p-3',
    trackingNo: 'SHP-7751-0911',
    courier: 'Shopee Xpress',
    origin: 'Main Warehouse',
    destination: 'Alabang Town',
    lastKnownLocation: 'Alabang Delivery Hub',
    status: 'DELIVERED',
    etaMinutes: 0,
    updatedAtLabel: 'Delivered 12 min ago',
    events: [
      { id: 'p3-e1', label: 'Parcel packed', location: 'Main Warehouse', timeLabel: '6:55 AM', done: true },
      { id: 'p3-e2', label: 'In transit', location: 'SLEX Southbound', timeLabel: '7:44 AM', done: true },
      { id: 'p3-e3', label: 'Out for delivery', location: 'Alabang Delivery Hub', timeLabel: '8:30 AM', done: true },
      { id: 'p3-e4', label: 'Delivered to branch receiver', location: 'Alabang Town', timeLabel: '9:52 AM', done: true },
    ],
  },
];

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(isoDate: string) {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function getStockLevel(onHand: number, parLevel: number, reorderPoint: number) {
  if (onHand <= reorderPoint) return 'low' as const;
  if (onHand > parLevel * 1.1) return 'over' as const;
  if (onHand < parLevel * 0.85) return 'warn' as const;
  return 'ok' as const;
}

function getExpiryLevel(days: number) {
  if (days < 0) return 'expired' as const;
  if (days <= EXPIRY_CRITICAL_DAYS) return 'critical' as const;
  if (days <= EXPIRY_WARN_DAYS) return 'warn' as const;
  return 'ok' as const;
}

function expiryLabel(days: number) {
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 30) return `Expires in ${days}d`;
  if (days <= 90) return `Expires in ~${Math.round(days / 7)}w`;
  return `Expires in ${Math.round(days / 30)}mo`;
}

function parcelStatusLabel(status: ParcelRow['status']) {
  return status.replace(/_/g, ' ');
}

export default function WarehouseManagement() {
  const { brand } = useBrand();

  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | DeliveryDirection>('ALL');
  const [stockQuery, setStockQuery] = useState('');
  const [selectedParcelId, setSelectedParcelId] = useState(sampleParcels[0].id);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState(emptyDeliveryForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [noticeText, setNoticeText] = useState('');
  const [errorText, setErrorText] = useState('');

  const loadWarehouseData = useCallback(() => {
    setDeliveries(ensureSampleDeliveries(brand.dbBrandId, sampleDeliveries));
    setStock(ensureSampleStock(brand.dbBrandId, sampleStock));
  }, [brand.dbBrandId]);

  useEffect(() => {
    loadWarehouseData();
  }, [loadWarehouseData]);

  const filteredDeliveries = useMemo(
    () =>
      deliveryFilter === 'ALL'
        ? deliveries
        : deliveries.filter((d) => d.direction === deliveryFilter),
    [deliveries, deliveryFilter]
  );

  const filteredStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (!q) return stock;
    return stock.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
    );
  }, [stock, stockQuery]);

  const sortedExpiry = useMemo(
    () =>
      [...sampleExpiry].sort(
        (a, b) => daysBetween(a.expiresOn) - daysBetween(b.expiresOn)
      ),
    []
  );
  const selectedParcel = useMemo(
    () => sampleParcels.find((p) => p.id === selectedParcelId) ?? sampleParcels[0],
    [selectedParcelId]
  );

  const kpis = useMemo(() => {
    const totalSkus = stock.length;
    const incoming = deliveries.filter(
      (d) => d.direction === 'IN' && (d.status === 'SCHEDULED' || d.status === 'IN_TRANSIT')
    ).length;
    const outgoing = deliveries.filter(
      (d) => d.direction === 'OUT' && (d.status === 'SCHEDULED' || d.status === 'DISPATCHED')
    ).length;
    const expiringSoon = sampleExpiry.filter((e) => {
      const d = daysBetween(e.expiresOn);
      return d >= 0 && d <= EXPIRY_WARN_DAYS;
    }).length;
    const lowStock = stock.filter(
      (s) => getStockLevel(s.onHand, s.parLevel, s.reorderPoint) === 'low'
    ).length;
    return { totalSkus, incoming, outgoing, expiringSoon, lowStock };
  }, [deliveries, stock]);

  const closeDeliveryForm = () => {
    setShowDeliveryForm(false);
    setDeliveryForm({ ...emptyDeliveryForm, date: new Date().toISOString().slice(0, 10) });
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setProductForm(emptyProductForm);
  };

  const handleLogDelivery = (event: FormEvent) => {
    event.preventDefault();
    setErrorText('');
    setNoticeText('');

    if (!deliveryForm.party.trim()) {
      setErrorText('Party name is required (supplier or branch).');
      return;
    }

    const items = Number(deliveryForm.items);
    if (!Number.isFinite(items) || items < 1) {
      setErrorText('Item count must be at least 1.');
      return;
    }

    const row = createDelivery({
      brandId: brand.dbBrandId,
      direction: deliveryForm.direction,
      party: deliveryForm.party,
      date: deliveryForm.date,
      items,
      status: deliveryForm.status,
      notes: deliveryForm.notes,
    });

    setDeliveries((prev) => [row, ...prev]);
    closeDeliveryForm();
    setNoticeText(`Logged delivery ${row.reference} for ${row.party}.`);
  };

  const handleAddProduct = (event: FormEvent) => {
    event.preventDefault();
    setErrorText('');
    setNoticeText('');

    if (!productForm.name.trim()) {
      setErrorText('Product name is required.');
      return;
    }

    const onHand = Number(productForm.onHand);
    const parLevel = Number(productForm.parLevel);
    const reorderPoint = Number(productForm.reorderPoint);

    if (!Number.isFinite(onHand) || onHand < 0) {
      setErrorText('On-hand quantity must be zero or greater.');
      return;
    }
    if (!Number.isFinite(parLevel) || parLevel < 1) {
      setErrorText('Par level must be at least 1.');
      return;
    }
    if (!Number.isFinite(reorderPoint) || reorderPoint < 0) {
      setErrorText('Reorder point must be zero or greater.');
      return;
    }

    const row = createStockProduct({
      brandId: brand.dbBrandId,
      name: productForm.name,
      unit: productForm.unit,
      onHand,
      parLevel,
      reorderPoint,
      location: productForm.location,
    });

    setStock((prev) => [row, ...prev]);
    closeProductForm();
    setNoticeText(`Added ${row.name} to warehouse stock.`);
  };

  return (
    <div className="hq-warehouse" id="hq-warehouse">
      <header className="hq-home-header">
        <div className="hq-home-heading">
          <span className="hq-eyebrow">Warehouse / Inventory</span>
          <h1>Stock & Deliveries</h1>
          <p className="hq-home-sub">
            Central monitoring of deliveries, par levels, and product expiry across all branches.
          </p>
        </div>

        <div className="hq-home-toolbar">
          <button
            type="button"
            className="hq-primary-btn"
            onClick={() => {
              setShowDeliveryForm((value) => !value);
              setShowProductForm(false);
              setErrorText('');
              setNoticeText('');
              if (showDeliveryForm) closeDeliveryForm();
            }}
          >
            <Plus size={14} />
            {showDeliveryForm ? 'Close' : 'Log Delivery'}
          </button>
          <button
            type="button"
            className="hq-secondary-btn"
            onClick={() => {
              setShowProductForm((value) => !value);
              setShowDeliveryForm(false);
              setErrorText('');
              setNoticeText('');
              if (showProductForm) closeProductForm();
            }}
          >
            <Package size={14} />
            {showProductForm ? 'Close' : 'Add Product'}
          </button>
        </div>
      </header>

      {showDeliveryForm && (
        <form className="hq-warehouse-form" onSubmit={handleLogDelivery}>
          <h2>Log Delivery</h2>
          <div className="hq-warehouse-form-grid">
            <label className="hq-warehouse-field">
              <span>Direction</span>
              <select
                value={deliveryForm.direction}
                onChange={(event) =>
                  setDeliveryForm({ ...deliveryForm, direction: event.target.value as DeliveryDirection })
                }
              >
                <option value="IN">Incoming (from supplier)</option>
                <option value="OUT">Outgoing (to branch)</option>
              </select>
            </label>
            <label className="hq-warehouse-field">
              <span>{deliveryForm.direction === 'IN' ? 'Supplier' : 'Branch'}</span>
              <input
                value={deliveryForm.party}
                onChange={(event) => setDeliveryForm({ ...deliveryForm, party: event.target.value })}
                placeholder={deliveryForm.direction === 'IN' ? 'e.g. Bean Origin Trading' : 'e.g. BGC Central'}
              />
            </label>
            <label className="hq-warehouse-field">
              <span>Date</span>
              <input
                type="date"
                value={deliveryForm.date}
                onChange={(event) => setDeliveryForm({ ...deliveryForm, date: event.target.value })}
              />
            </label>
            <label className="hq-warehouse-field">
              <span>Item count</span>
              <input
                type="number"
                min={1}
                value={deliveryForm.items}
                onChange={(event) => setDeliveryForm({ ...deliveryForm, items: event.target.value })}
              />
            </label>
            <label className="hq-warehouse-field">
              <span>Status</span>
              <select
                value={deliveryForm.status}
                onChange={(event) =>
                  setDeliveryForm({ ...deliveryForm, status: event.target.value as DeliveryStatus })
                }
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_TRANSIT">In transit</option>
                <option value="RECEIVED">Received</option>
                <option value="DISPATCHED">Dispatched</option>
              </select>
            </label>
            <label className="hq-warehouse-field hq-warehouse-field-wide">
              <span>Notes</span>
              <input
                value={deliveryForm.notes}
                onChange={(event) => setDeliveryForm({ ...deliveryForm, notes: event.target.value })}
                placeholder="Optional shipment details"
              />
            </label>
          </div>
          <div className="hq-warehouse-form-footer">
            <button type="button" className="hq-warehouse-cancel-btn" onClick={closeDeliveryForm}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="hq-primary-btn">
              Log Delivery
            </button>
          </div>
        </form>
      )}

      {showProductForm && (
        <form className="hq-warehouse-form" onSubmit={handleAddProduct}>
          <h2>Add Product</h2>
          <div className="hq-warehouse-form-grid">
            <label className="hq-warehouse-field">
              <span>Product name</span>
              <input
                value={productForm.name}
                onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                placeholder="e.g. Arabica Espresso Beans"
              />
            </label>
            <label className="hq-warehouse-field">
              <span>Unit</span>
              <select
                value={productForm.unit}
                onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })}
              >
                {STOCK_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq-warehouse-field">
              <span>Storage location</span>
              <select
                value={productForm.location}
                onChange={(event) => setProductForm({ ...productForm, location: event.target.value })}
              >
                {STORAGE_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <label className="hq-warehouse-field">
              <span>On hand</span>
              <input
                type="number"
                min={0}
                value={productForm.onHand}
                onChange={(event) => setProductForm({ ...productForm, onHand: event.target.value })}
                placeholder="0"
              />
            </label>
            <label className="hq-warehouse-field">
              <span>Par level</span>
              <input
                type="number"
                min={1}
                value={productForm.parLevel}
                onChange={(event) => setProductForm({ ...productForm, parLevel: event.target.value })}
                placeholder="60"
              />
            </label>
            <label className="hq-warehouse-field">
              <span>Reorder point</span>
              <input
                type="number"
                min={0}
                value={productForm.reorderPoint}
                onChange={(event) =>
                  setProductForm({ ...productForm, reorderPoint: event.target.value })
                }
                placeholder="20"
              />
            </label>
          </div>
          <div className="hq-warehouse-form-footer">
            <button type="button" className="hq-warehouse-cancel-btn" onClick={closeProductForm}>
              <X size={14} /> Cancel
            </button>
            <button type="submit" className="hq-primary-btn">
              Add Product
            </button>
          </div>
        </form>
      )}

      {noticeText && <div className="hq-warehouse-note hq-warehouse-note--success">{noticeText}</div>}
      {errorText && <div className="hq-warehouse-note hq-warehouse-note--error">{errorText}</div>}

      <section className="hq-kpi-row">
        <article className="hq-stat-card hq-stat-card--dark">
          <div className="hq-stat-meta">
            <span>Tracked SKUs</span>
            <span className="hq-stat-icon"><Boxes size={16} /></span>
          </div>
          <div className="hq-stat-value">{kpis.totalSkus}</div>
          <div className="hq-stat-trend hq-stat-trend--muted">Across all storages</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Incoming Deliveries</span>
            <span className="hq-stat-icon"><ArrowDownToLine size={16} /></span>
          </div>
          <div className="hq-stat-value">{kpis.incoming}</div>
          <div className="hq-stat-trend hq-stat-trend--muted">Scheduled or in transit</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Outgoing Deliveries</span>
            <span className="hq-stat-icon"><ArrowUpFromLine size={16} /></span>
          </div>
          <div className="hq-stat-value">{kpis.outgoing}</div>
          <div className="hq-stat-trend hq-stat-trend--muted">To branches</div>
        </article>

        <article className="hq-stat-card">
          <div className="hq-stat-meta">
            <span>Expiring ≤ 3 months</span>
            <span className="hq-stat-icon"><CalendarClock size={16} /></span>
          </div>
          <div className="hq-stat-value">{kpis.expiringSoon}</div>
          <div className="hq-stat-trend hq-stat-trend--down">
            {kpis.lowStock > 0 && `${kpis.lowStock} item${kpis.lowStock > 1 ? 's' : ''} low on stock`}
            {kpis.lowStock === 0 && 'All stock healthy'}
          </div>
        </article>
      </section>

      {/* Deliveries */}
      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Delivery Tracking</span>
            <h2>Delivery In &amp; Out</h2>
          </div>
          <div className="hq-range-toggle">
            <button
              type="button"
              className={deliveryFilter === 'ALL' ? 'active' : ''}
              onClick={() => setDeliveryFilter('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={deliveryFilter === 'IN' ? 'active' : ''}
              onClick={() => setDeliveryFilter('IN')}
            >
              Incoming
            </button>
            <button
              type="button"
              className={deliveryFilter === 'OUT' ? 'active' : ''}
              onClick={() => setDeliveryFilter('OUT')}
            >
              Outgoing
            </button>
          </div>
        </div>

        <div className="hq-orders-scroller">
          <table className="hq-orders-table hq-delivery-table">
            <thead>
              <tr>
                <th>Dir.</th>
                <th>Reference</th>
                <th>Party</th>
                <th>Date</th>
                <th>Items</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className={`hq-direction hq-direction--${row.direction.toLowerCase()}`}>
                      {row.direction === 'IN' ? (
                        <ArrowDownToLine size={12} />
                      ) : (
                        <ArrowUpFromLine size={12} />
                      )}
                      {row.direction === 'IN' ? 'IN' : 'OUT'}
                    </span>
                  </td>
                  <td className="hq-orders-id">{row.reference}</td>
                  <td>
                    <div className="hq-delivery-party">
                      <Truck size={14} />
                      <div>
                        <div>{row.party}</div>
                        {row.notes && <div className="hq-delivery-notes">{row.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="hq-orders-time">{formatDate(row.date)}</td>
                  <td className="hq-orders-total">{row.items}</td>
                  <td>
                    <span
                      className={`hq-status hq-status--${row.status.toLowerCase().replace('_', '-')}`}
                    >
                      {row.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="hq-table-empty">
                    No deliveries match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Parcel tracking */}
      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Parcel / Delivery Tracking</span>
            <h2>ETA + Real-Time Parcel Updates</h2>
          </div>
          <span className="hq-live-badge">
            <Radio size={12} />
            Live updates every minute
          </span>
        </div>

        <div className="hq-parcel-layout">
          <ul className="hq-parcel-list">
            {sampleParcels.map((parcel) => (
              <li key={parcel.id}>
                <button
                  type="button"
                  className={`hq-parcel-card ${selectedParcel.id === parcel.id ? 'active' : ''}`}
                  onClick={() => setSelectedParcelId(parcel.id)}
                >
                  <div className="hq-parcel-card-head">
                    <span className="hq-orders-id">{parcel.trackingNo}</span>
                    <span className={`hq-status hq-status--${parcel.status.toLowerCase().replace(/_/g, '-')}`}>
                      {parcelStatusLabel(parcel.status)}
                    </span>
                  </div>
                  <div className="hq-parcel-route">{parcel.origin} → {parcel.destination}</div>
                  <div className="hq-parcel-meta">
                    <span><Truck size={12} /> {parcel.courier}</span>
                    <span><MapPin size={12} /> {parcel.lastKnownLocation}</span>
                    <span><Clock3 size={12} /> {parcel.etaMinutes === 0 ? 'Arrived' : `${parcel.etaMinutes} min ETA`}</span>
                  </div>
                  <div className="hq-parcel-updated">{parcel.updatedAtLabel}</div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hq-parcel-timeline-wrap">
            <div className="hq-parcel-timeline-head">
              <div>
                <div className="hq-eyebrow">Tracking Details</div>
                <div className="hq-parcel-selected">{selectedParcel.trackingNo}</div>
              </div>
              <div className="hq-parcel-eta">
                {selectedParcel.etaMinutes === 0 ? 'Delivered' : `${selectedParcel.etaMinutes} min`}
              </div>
            </div>

            <ul className="hq-parcel-timeline">
              {selectedParcel.events.map((event) => (
                <li key={event.id} className={`hq-track-step ${event.done ? 'done' : ''}`}>
                  <span className="hq-track-dot" />
                  <div className="hq-track-body">
                    <div className="hq-track-title">{event.label}</div>
                    <div className="hq-track-sub">{event.location}</div>
                  </div>
                  <div className="hq-track-time">{event.timeLabel}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Stock levels */}
      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Fixed Quantity Monitoring</span>
            <h2>Stock Level vs. Par</h2>
          </div>
          <div className="hq-search hq-search--compact">
            <Search size={14} className="hq-search-icon" />
            <input
              value={stockQuery}
              onChange={(e) => setStockQuery(e.target.value)}
              placeholder="Search items or location..."
            />
          </div>
        </div>

        <ul className="hq-stock-list">
          {filteredStock.map((row) => {
            const level = getStockLevel(row.onHand, row.parLevel, row.reorderPoint);
            const percent = Math.min(
              150,
              Math.max(0, Math.round((row.onHand / Math.max(1, row.parLevel)) * 100))
            );
            return (
              <li key={row.id} className={`hq-stock-row hq-stock-row--${level}`}>
                <div className="hq-stock-top">
                  <div className="hq-stock-info">
                    <div className="hq-stock-title">{row.name}</div>
                    <div className="hq-stock-meta">
                      {row.location} · Reorder @ {row.reorderPoint} {row.unit}
                    </div>
                  </div>
                  <div className="hq-stock-amount">
                    <span className="hq-stock-on-hand">
                      {row.onHand.toLocaleString()} {row.unit}
                    </span>
                    <span className="hq-stock-par">usual {row.parLevel.toLocaleString()} {row.unit}</span>
                  </div>
                </div>

                <div className="hq-progress">
                  <div
                    className="hq-progress-fill"
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>

                <div className="hq-stock-flag-row">
                  <span className={`hq-stock-flag hq-stock-flag--${level}`}>
                    {level === 'low' && 'Below reorder point'}
                    {level === 'warn' && 'Below usual level'}
                    {level === 'ok' && 'Within usual level'}
                    {level === 'over' && 'Overstocked'}
                  </span>
                  <span className="hq-stock-percent">{percent}% of par</span>
                </div>
              </li>
            );
          })}
          {filteredStock.length === 0 && (
            <li className="hq-stock-empty">No matching items.</li>
          )}
        </ul>
      </section>

      {/* Expiry watchlist */}
      <section className="hq-panel">
        <div className="hq-panel-head">
          <div>
            <span className="hq-eyebrow">Expiry Watchlist</span>
            <h2>3-Month Notice &amp; Expired</h2>
          </div>
          <span className="hq-legend">
            <span className="hq-legend-dot hq-legend-dot--critical" /> ≤ 30 days
            <span className="hq-legend-dot hq-legend-dot--warn" /> ≤ 90 days
            <span className="hq-legend-dot hq-legend-dot--expired" /> Expired
          </span>
        </div>

        <ul className="hq-expiry-list">
          {sortedExpiry.map((row) => {
            const days = daysBetween(row.expiresOn);
            const level = getExpiryLevel(days);
            return (
              <li key={row.id} className={`hq-expiry hq-expiry--${level}`}>
                <span className="hq-expiry-icon">
                  {level === 'expired' ? <ShieldAlert size={14} /> : <CalendarClock size={14} />}
                </span>
                <div className="hq-expiry-body">
                  <div className="hq-expiry-title">
                    {row.name}
                    <span className="hq-expiry-lot">{row.lot}</span>
                  </div>
                  <div className="hq-expiry-sub">
                    {row.location} · {row.quantity} {row.unit}
                  </div>
                </div>
                <div className="hq-expiry-meta">
                  <div className={`hq-expiry-label hq-expiry-label--${level}`}>
                    {expiryLabel(days)}
                  </div>
                  <div className="hq-expiry-date">{formatDate(row.expiresOn)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
