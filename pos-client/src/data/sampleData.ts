import type { Category, Product, ProductVariant, Addon } from '../types';
import { flavorProductImages } from './menuMockups';

export const sampleCategories: Category[] = [
  { id: 'cat-1', name: 'Flavors', sort_order: 1, icon: '🍟' },
  { id: 'cat-2', name: 'Snacks', sort_order: 2, icon: '🍗' },
  { id: 'cat-3', name: 'Beverages', sort_order: 3, icon: '🥤' },
];

export const sampleProducts: Product[] = [
  // Flavors
  { id: 'prod-1', category_id: 'cat-1', name: 'Cheese', base_price: 65, is_active: true, image_url: flavorProductImages['prod-1'], icon: '🧀', description: 'All-time favorite cheesy fries', badge: 'BESTSELLER' },
  { id: 'prod-2', category_id: 'cat-1', name: 'Barbecue', base_price: 65, is_active: true, image_url: flavorProductImages['prod-2'], icon: '🍖', description: 'Smoky sweet barbecue' },
  { id: 'prod-3', category_id: 'cat-1', name: 'Sour Cream', base_price: 65, is_active: true, image_url: flavorProductImages['prod-3'], icon: '🥛', description: 'Cool and tangy' },
  { id: 'prod-4', category_id: 'cat-1', name: 'Sour Cream & Onion', base_price: 70, is_active: true, image_url: flavorProductImages['prod-4'], icon: '🧅', description: 'Creamy with onion kick' },
  { id: 'prod-5', category_id: 'cat-1', name: 'Cheddar', base_price: 70, is_active: true, image_url: flavorProductImages['prod-5'], icon: '🧀', description: 'Rich aged cheddar' },
  { id: 'prod-6', category_id: 'cat-1', name: 'Sweet Corn', base_price: 65, is_active: true, image_url: flavorProductImages['prod-6'], icon: '🌽', description: 'Buttery sweet corn' },
  { id: 'prod-7', category_id: 'cat-1', name: 'Chili Cheese', base_price: 75, is_active: true, image_url: flavorProductImages['prod-7'], icon: '🌶️', description: 'Spicy melted cheese' },
  { id: 'prod-8', category_id: 'cat-1', name: 'Garlic Butter', base_price: 70, is_active: true, image_url: flavorProductImages['prod-8'], icon: '🧄', description: 'Savory garlic butter' },

  // Snacks
  { id: 'prod-9', category_id: 'cat-2', name: 'Chicken Pops', base_price: 95, is_active: true, image_url: null, icon: '🍗', description: 'Bite-sized fried chicken' },
  { id: 'prod-10', category_id: 'cat-2', name: 'Cheese Sticks', base_price: 85, is_active: true, image_url: null, icon: '🧀', description: 'Crispy mozzarella sticks' },
  { id: 'prod-11', category_id: 'cat-2', name: 'Nachos', base_price: 85, is_active: true, image_url: null, icon: '🌮', description: 'Loaded cheese nachos' },
  { id: 'prod-12', category_id: 'cat-2', name: 'Onion Rings', base_price: 80, is_active: true, image_url: null, icon: '🧅', description: 'Golden crispy rings' },

  // Beverages
  { id: 'prod-13', category_id: 'cat-3', name: 'Iced Tea', base_price: 45, is_active: true, image_url: null, icon: '🧋', description: 'House-brewed iced tea' },
  { id: 'prod-14', category_id: 'cat-3', name: 'Coke Float', base_price: 60, is_active: true, image_url: null, icon: '🥤', description: 'Soda with ice cream' },
  { id: 'prod-15', category_id: 'cat-3', name: 'Lemonade', base_price: 50, is_active: true, image_url: null, icon: '🍋', description: 'Fresh squeezed lemonade' },
  { id: 'prod-16', category_id: 'cat-3', name: 'Bottled Water', base_price: 25, is_active: true, image_url: null, icon: '💧', description: 'Purified drinking water' },
];

// Potato Corner fries sizes: Regular, Large, Jumbo, Mega, Giga, Tera
const friesSizes: { abbr: string; name: string; add: number }[] = [
  { abbr: 'REG', name: 'Regular', add: 0 },
  { abbr: 'LRG', name: 'Large', add: 20 },
  { abbr: 'JBO', name: 'Jumbo', add: 40 },
  { abbr: 'MEG', name: 'Mega', add: 70 },
  { abbr: 'GIG', name: 'Giga', add: 110 },
  { abbr: 'TRA', name: 'Tera', add: 160 },
];

// How many sizes each flavor offers (matches reference UI)
const flavorSizeCount: Record<string, number> = {
  'prod-1': 6,
  'prod-2': 4,
  'prod-3': 3,
  'prod-4': 3,
  'prod-5': 3,
  'prod-6': 3,
  'prod-7': 4,
  'prod-8': 3,
};

function buildFlavorVariants(): ProductVariant[] {
  const variants: ProductVariant[] = [];
  let counter = 1;
  for (const [productId, count] of Object.entries(flavorSizeCount)) {
    friesSizes.slice(0, count).forEach((size) => {
      variants.push({
        id: `var-${counter++}`,
        product_id: productId,
        name: size.name,
        abbr: size.abbr,
        additional_price: size.add,
      });
    });
  }
  return variants;
}

const beverageSizes: { abbr: string; name: string; add: number }[] = [
  { abbr: 'REG', name: 'Regular', add: 0 },
  { abbr: 'LRG', name: 'Large', add: 15 },
];

export const sampleVariants: ProductVariant[] = [
  ...buildFlavorVariants(),
  // Beverages get Regular / Large
  { id: 'var-b1', product_id: 'prod-13', name: 'Regular', abbr: 'REG', additional_price: 0 },
  { id: 'var-b2', product_id: 'prod-13', name: 'Large', abbr: 'LRG', additional_price: 15 },
  { id: 'var-b3', product_id: 'prod-14', name: 'Regular', abbr: 'REG', additional_price: 0 },
  { id: 'var-b4', product_id: 'prod-14', name: 'Large', abbr: 'LRG', additional_price: 15 },
  { id: 'var-b5', product_id: 'prod-15', name: 'Regular', abbr: 'REG', additional_price: 0 },
  { id: 'var-b6', product_id: 'prod-15', name: 'Large', abbr: 'LRG', additional_price: 15 },
];

void beverageSizes;

export const sampleAddons: Addon[] = [
  { id: 'add-1', name: 'Extra Cheese', price: 15, is_active: true },
  { id: 'add-2', name: 'Extra Seasoning', price: 10, is_active: true },
  { id: 'add-3', name: 'Cheese Dip', price: 20, is_active: true },
  { id: 'add-4', name: 'Spicy Mayo', price: 15, is_active: true },
];
