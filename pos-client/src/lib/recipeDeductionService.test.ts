import { describe, expect, it } from 'vitest';
import { aggregateRecipeUsage } from './recipeDeductionService';
import type { CartItem, Product } from '../types';

const product: Product = {
  id: 'prod-1',
  category_id: 'cat-1',
  name: 'Latte',
  base_price: 150,
  is_active: true,
  image_url: null,
  icon: '☕',
};

describe('aggregateRecipeUsage', () => {
  it('sums per-cup usage by quantity', () => {
    const cartItem: CartItem = {
      id: 'c1',
      product,
      variant: { id: 'var-1', product_id: 'prod-1', name: '16oz', abbr: '16', additional_price: 0 },
      quantity: 2,
      ice_level: 'NORMAL',
      addons: [],
      line_total: 300,
    };

    const usage = aggregateRecipeUsage([cartItem], [
      {
        product_id: 'prod-1',
        variant_id: 'var-1',
        raw_material_id: 'milk-1',
        quantity_per_cup: 150,
      },
      {
        product_id: 'prod-1',
        variant_id: null,
        raw_material_id: 'beans-1',
        quantity_per_cup: 18,
      },
    ]);

    expect(usage.get('milk-1')).toBe(300);
    expect(usage.get('beans-1')).toBeUndefined();
  });
});
