import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { getCurrentBranch } from '../../lib/branchContext';
import {
  exportCsv,
  fetchDailySalesTrend,
  fetchFranchiseSummary,
  fetchInventoryReport,
  fetchProductPerformance,
} from '../../lib/franchiseReportsService';
import PortalLayout, { PortalCard, PortalPlaceholderNote } from '../PortalLayout';

type ReportTab = 'daily' | 'weekly' | 'monthly' | 'product' | 'inventory' | 'analytics';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'daily', label: 'Daily Sales' },
  { id: 'weekly', label: 'Weekly Sales' },
  { id: 'monthly', label: 'Monthly Sales' },
  { id: 'product', label: 'Product Performance' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'analytics', label: 'Sales Analytics' },
];

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export default function ReportsModule() {
  const { brand } = useBrand();
  const branch = getCurrentBranch();
  const [tab, setTab] = useState<ReportTab>('daily');
  const [summary, setSummary] = useState<{ revenue: number; orders: number; avgOrderValue: number; label: string; source: 'live' | 'fallback' }>({
    revenue: 0,
    orders: 0,
    avgOrderValue: 0,
    label: '',
    source: 'fallback',
  });
  const [trend, setTrend] = useState<{ label: string; amount: number }[]>([]);
  const [products, setProducts] = useState<{ productName: string; quantity: number; revenue: number }[]>([]);
  const [inventory, setInventory] = useState<{ name: string; onHand: string; threshold: string; value: number }[]>([]);
  const [sourceNote, setSourceNote] = useState('');

  useEffect(() => {
    const load = async () => {
      const range = tab === 'monthly' ? '30d' : tab === 'weekly' ? '7d' : 'today';
      const [sum, tr, prod, inv] = await Promise.all([
        fetchFranchiseSummary(brand.dbBrandId, range, branch.id),
        fetchDailySalesTrend(brand.dbBrandId, tab === 'monthly' ? 30 : 7, branch.id),
        fetchProductPerformance(brand.dbBrandId, tab === 'monthly' ? '30d' : '7d', branch.id),
        fetchInventoryReport(brand.dbBrandId, branch.id),
      ]);
      setSummary(sum);
      setTrend(tr);
      setProducts(prod.rows);
      setInventory(inv.rows);
      setSourceNote(sum.source === 'live' ? 'Live branch data' : 'Sample / offline data');
    };
    void load();
  }, [brand.dbBrandId, branch.id, tab]);

  const maxAmount = Math.max(...trend.map((d) => d.amount), 1);

  const handleExport = () => {
    if (tab === 'product') {
      exportCsv('product-performance.csv', ['Product', 'Qty', 'Revenue'], products.map((p) => [p.productName, String(p.quantity), String(p.revenue)]));
    } else if (tab === 'inventory') {
      exportCsv('inventory-report.csv', ['Item', 'On hand', 'Threshold', 'Value'], inventory.map((i) => [i.name, i.onHand, i.threshold, String(i.value)]));
    } else {
      exportCsv('sales-trend.csv', ['Period', 'Amount'], trend.map((t) => [t.label, String(t.amount)]));
    }
  };

  const handlePrint = () => window.print();

  return (
    <PortalLayout icon={TrendingUp} title="Business Reports" subtitle="Branch performance reports">
      <PortalPlaceholderNote>{sourceNote} · {branch.name}</PortalPlaceholderNote>

      <div className="portal-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`portal-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="portal-report-actions">
        <button type="button" className="portal-btn-ghost" onClick={handleExport}>Export CSV</button>
        <button type="button" className="portal-btn-ghost" onClick={handlePrint}>Print / PDF</button>
      </div>

      <div className="portal-report-grid">
        <div className="portal-stat-card">
          <span className="portal-stat-label">{summary.label}</span>
          <span className="portal-stat-value">{peso.format(summary.revenue)}</span>
          <span className="portal-stat-note">{summary.orders} orders · Avg {peso.format(summary.avgOrderValue)}</span>
        </div>
      </div>

      {(tab === 'daily' || tab === 'weekly' || tab === 'monthly' || tab === 'analytics') && (
        <PortalCard>
          <h2 className="portal-announcement-title">Sales Trend</h2>
          <div className="portal-bar-chart" role="img" aria-label="Sales bar chart">
            {trend.map((day) => (
              <div key={day.label} className="portal-bar-col">
                <div className="portal-bar" style={{ height: `${Math.max((day.amount / maxAmount) * 100, day.amount > 0 ? 8 : 2)}%` }} />
                <span className="portal-bar-label">{day.label}</span>
              </div>
            ))}
          </div>
        </PortalCard>
      )}

      {(tab === 'product' || tab === 'analytics') && (
        <PortalCard>
          <h2 className="portal-announcement-title">Top Products</h2>
          <ul className="portal-list-plain">
            {products.map((p) => (
              <li key={p.productName}>
                <span>{p.productName}</span>
                <span>{p.quantity} sold · {peso.format(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </PortalCard>
      )}

      {tab === 'inventory' && (
        <PortalCard>
          <h2 className="portal-announcement-title">Inventory Snapshot</h2>
          <ul className="portal-list-plain">
            {inventory.map((i) => (
              <li key={i.name}>
                <span>{i.name}</span>
                <span>{i.onHand} · reorder {i.threshold}</span>
              </li>
            ))}
          </ul>
        </PortalCard>
      )}
    </PortalLayout>
  );
}
