import { describe, it, expect } from 'vitest';
import { cartItemsToRows } from './posOrderItemService';
import type { CartItem } from '../types';

describe('cartItemsToRows', () => {
  it('maps cart lines to order item rows', () => {
    const cart: CartItem[] = [
      {
        id: 'c1',
        product: { id: 'p1', category_id: 'cat', name: 'Milk Tea', base_price: 120, is_active: true, image_url: null, icon: '☕' },
        variant: null,
        quantity: 2,
        ice_level: 'NORMAL',
        addons: [],
        line_total: 240,
      },
    ];
    const rows = cartItemsToRows(cart);
    expect(rows).toHaveLength(1);
    expect(rows[0].product_name).toBe('Milk Tea');
    expect(rows[0].quantity).toBe(2);
    expect(rows[0].line_total).toBe(240);
  });
});
