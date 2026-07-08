import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { getCurrentBranch } from '../../lib/branchContext';
import {
  fetchSupplyOrders,
  SUPPLY_ORDER_STATUS_LABELS,
  type SupplyOrder,
} from '../../lib/supplyOrderService';
import PortalLayout, { PortalCard, PortalPlaceholderNote, PortalTag } from '../PortalLayout';

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export default function OrderHistoryModule() {
  const { brand } = useBrand();
  const branch = getCurrentBranch();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchSupplyOrders(brand.dbBrandId, branch.id).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, [brand.dbBrandId, branch.id]);

  return (
    <PortalLayout icon={ShoppingBag} title="Order History" subtitle="Supply orders placed with HQ">
      {orders.length === 0 && !loading && (
        <PortalPlaceholderNote>
          No supply orders yet. Place your first order from Inventory → reorder cart.
        </PortalPlaceholderNote>
      )}

      {loading ? <p className="portal-loading">Loading orders…</p> : null}

      <div className="portal-ticket-list">
        {orders.map((order) => (
          <PortalCard key={order.id}>
            <div className="portal-ticket-row">
              <span className="portal-ticket-id">{order.referenceNo}</span>
              <PortalTag variant={order.status === 'delivered' ? 'resolved' : 'open'}>
                {SUPPLY_ORDER_STATUS_LABELS[order.status]}
              </PortalTag>
              <span className="portal-ticket-subject">
                {order.itemCount} items · {peso.format(order.totalAmount)}
              </span>
              <span className="portal-ticket-dates">
                {new Date(order.createdAt).toLocaleDateString('en-PH')} · {order.paymentMethod.replace('_', ' ')}
              </span>
            </div>
            {order.items.length > 0 && (
              <ul className="portal-list-plain">
                {order.items.slice(0, 4).map((line) => (
                  <li key={line.id}>
                    <span>{line.name}</span>
                    <span>×{line.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </PortalCard>
        ))}
      </div>
    </PortalLayout>
  );
}
