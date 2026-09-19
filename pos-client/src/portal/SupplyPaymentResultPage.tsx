import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { getCurrentBranch } from '../lib/branchContext';
import { fetchSupplyOrders, type SupplyOrder } from '../lib/supplyOrderService';
import PortalLayout from './PortalLayout';
import './SupplyPaymentResultPage.css';

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

function findOrder(orders: SupplyOrder[], ref: string | null): SupplyOrder | undefined {
  if (!ref) return undefined;
  return orders.find(
    (order) =>
      order.referenceNo === ref ||
      order.id === ref
  );
}

export default function SupplyPaymentResultPage() {
  const { brand } = useBrand();
  const branch = useMemo(() => getCurrentBranch(), []);
  const location = useLocation();
  const [params] = useSearchParams();
  const referenceNo = params.get('ref') ?? params.get('reference');
  const hitpayStatus = (params.get('status') ?? '').toLowerCase();
  const failedRoute = location.pathname.endsWith('/payment-failed');

  const [order, setOrder] = useState<SupplyOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const load = async () => {
      const rows = await fetchSupplyOrders(brand.dbBrandId, branch.id, {
        includePendingPayment: true,
      });
      if (cancelled) return;
      const match = findOrder(rows, referenceNo) ?? null;
      setOrder(match);
      setLoading(false);
      return match;
    };

    void load();

    const timer = window.setInterval(async () => {
      attempts += 1;
      const match = await load();
      if (match?.paymentStatus === 'paid' || attempts >= 10) {
        window.clearInterval(timer);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [brand.dbBrandId, branch.id, referenceNo]);

  const paid = order?.paymentStatus === 'paid';
  const failed = failedRoute || hitpayStatus === 'failed' || hitpayStatus === 'canceled';

  const title = failed ? 'Payment not completed' : paid ? 'Payment received' : 'Confirming payment';
  const Icon = failed ? CircleAlert : paid ? CircleCheck : LoaderCircle;

  return (
    <PortalLayout icon={Icon} title={title} subtitle="Coftea supply order">
      <div className={`supply-pay-result ${failed ? 'is-failed' : paid ? 'is-paid' : 'is-wait'}`}>
        <p>
          {failed
            ? 'HitPay did not confirm this payment. Your cart items were saved as an unpaid order — you can pay again from Order History.'
            : paid
              ? 'HQ can now fulfill this supply order. A receipt confirmation was recorded from HitPay.'
              : 'Waiting for HitPay to confirm payment. This page updates automatically.'}
        </p>
        {(referenceNo || order) && (
          <dl>
            <div>
              <dt>Reference</dt>
              <dd>{order?.referenceNo ?? referenceNo}</dd>
            </div>
            {order && (
              <div>
                <dt>Amount</dt>
                <dd>{peso.format(order.totalAmount)}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>{loading ? 'Checking…' : paid ? 'Paid' : failed ? 'Not paid' : 'Awaiting confirmation'}</dd>
            </div>
          </dl>
        )}
        <div className="supply-pay-result-actions">
          <Link className="portal-btn-primary" to="/portal/orders">
            View order history
          </Link>
          <Link className="portal-btn-ghost" to="/inventory">
            Back to inventory
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
