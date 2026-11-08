import { describe, expect, it } from 'vitest';
import { mapInventoryAlerts, mapLiveOrders } from './hqDashboardFeed';

describe('mapInventoryAlerts', () => {
  it('keeps only low and critical stock rows', () => {
    const alerts = mapInventoryAlerts([
      {
        branch_id: 'b1',
        on_hand_qty: 85,
        low_stock_qty: 100,
        branch: { name: 'Makati' },
        raw_material: { name: '16oz Cups' },
      },
      {
        branch_id: 'b2',
        on_hand_qty: 0,
        low_stock_qty: 20,
        branch: { name: 'Ortigas' },
        raw_material: { name: 'Tapioca Pearls' },
      },
      {
        branch_id: 'b3',
        on_hand_qty: 400,
        low_stock_qty: 100,
        branch: { name: 'BGC' },
        raw_material: { name: 'Lids' },
      },
    ]);

    expect(alerts).toEqual([
      { id: 'b2-Tapioca Pearls', name: 'Tapioca Pearls', branch: 'Ortigas', qty: 0, level: 'critical' },
      { id: 'b1-16oz Cups', name: '16oz Cups', branch: 'Makati', qty: 85, level: 'warn' },
    ]);
  });
});

describe('mapLiveOrders', () => {
  it('formats branch, items, and status from live rows', () => {
    const orders = mapLiveOrders([
      {
        id: 'abcdefghijkl',
        created_at: new Date().toISOString(),
        total_amount: 175,
        status: 'preparing',
        branch: { name: 'Coftea Makati' },
        pos_order_item: [
          { product_name: 'Matcha Latte', variant_name: 'MED', quantity: 1 },
          { product_name: 'Pearl add-on', variant_name: null, quantity: 2 },
        ],
      },
    ]);

    expect(orders[0]).toMatchObject({
      id: 'abcdefghijkl',
      branch: 'Coftea Makati',
      items: 'Matcha Latte MED, Pearl add-on x2',
      total: 175,
      status: 'PREPARING',
    });
    expect(orders[0].time).toBe('Just now');
  });
});
