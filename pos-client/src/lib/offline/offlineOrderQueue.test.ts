import { describe, expect, it } from 'vitest';
import { cartItemsToRows } from '../posOrderItemService';
import type { CartItem, Product } from '../../types';

const product: Product = {
  id: 'p1',
  category_id: 'c1',
  name: 'Americano',
  base_price: 39,
  is_active: true,
  image_url: null,
  icon: '☕',
};

describe('cartItemsToRows', () => {
  it('maps cart lines for offline queue payload', () => {
    const item: CartItem = {
      id: 'cart-1',
      product,
      variant: null,
      quantity: 2,
      ice_level: 'NORMAL',
      addons: [],
      line_total: 78,
    };

    const rows = cartItemsToRows([item]);
    expect(rows).toEqual([
      {
        product_id: 'p1',
        product_name: 'Americano',
        variant_name: null,
        quantity: 2,
        unit_price: 39,
        line_total: 78,
      },
    ]);
  });
});
