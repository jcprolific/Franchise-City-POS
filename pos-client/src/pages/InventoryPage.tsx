import { useState } from 'react';
import { sampleInventory } from '../data/inventoryDashboardData';
import type { InventoryItem } from '../data/inventoryDashboardData';
import './InventoryPage.css';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(sampleInventory);
  const [search, setSearch] = useState('');

  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter((i) => i.quantity <= i.lowStockThreshold).length;

  const adjustQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );
  };

  return (
    <div className="inventory-page" id="inventory-page">
      {/* Header */}
      <div className="inventory-header">
        <div className="inventory-header-left">
          <h1>Inventory</h1>
          <span className="inventory-count">{items.length} items tracked</span>
        </div>
        {lowStockCount > 0 && (
          <div className="low-stock-badge">
            <span className="low-stock-badge-icon">⚠️</span>
            {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} low stock
          </div>
        )}
      </div>

      {/* Search */}
      <div className="inventory-search">
        <input
          className="inventory-search-input"
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          id="inventory-search"
        />
      </div>

      {/* Grid */}
      <div className="inventory-grid" id="inventory-grid">
        {filtered.map((item, index) => {
          const isLow = item.quantity <= item.lowStockThreshold;
          return (
            <div
              key={item.id}
              className={`inventory-item ${isLow ? 'low-stock' : ''}`}
              id={`inv-item-${item.id}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="inventory-item-icon">{item.icon}</div>
              <div className="inventory-item-info">
                <div className="inventory-item-name">{item.name}</div>
                <div className="inventory-item-meta">
                  {item.category} · {item.supplier}
                </div>
              </div>
              <div className="inventory-item-right">
                <div className="inventory-item-qty">
                  <div className="inventory-qty-number">
                    {item.quantity.toLocaleString()}
                  </div>
                  <div className="inventory-qty-unit">{item.unit}</div>
                </div>
                <div className="inventory-item-actions">
                  <button
                    className="inventory-action-btn"
                    onClick={() => adjustQty(item.id, 100)}
                    aria-label={`Add 100 ${item.unit}`}
                  >
                    +
                  </button>
                  <button
                    className="inventory-action-btn minus"
                    onClick={() => adjustQty(item.id, -100)}
                    aria-label={`Remove 100 ${item.unit}`}
                  >
                    −
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
          No items match "{search}"
        </div>
      )}
    </div>
  );
}
