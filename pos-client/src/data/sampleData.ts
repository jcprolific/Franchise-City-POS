import type { Category, Product, ProductVariant, Addon } from '../types';

export const sampleCategories: Category[] = [
  { id: 'cat-1', name: 'Coffee', sort_order: 1, icon: '☕' },
  { id: 'cat-2', name: 'Milk Tea', sort_order: 2, icon: '🧋' },
  { id: 'cat-3', name: 'Fruit Tea', sort_order: 3, icon: '🍹' },
  { id: 'cat-4', name: 'Snacks', sort_order: 4, icon: '🍪' },
];

export const sampleProducts: Product[] = [
  // Coffee
  { id: 'prod-1', category_id: 'cat-1', name: 'Americano', base_price: 120, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-2', category_id: 'cat-1', name: 'Latte', base_price: 150, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-3', category_id: 'cat-1', name: 'Cappuccino', base_price: 150, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-4', category_id: 'cat-1', name: 'Espresso', base_price: 100, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-5', category_id: 'cat-1', name: 'Mocha', base_price: 160, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-6', category_id: 'cat-1', name: 'Caramel Macchiato', base_price: 170, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-7', category_id: 'cat-1', name: 'Flat White', base_price: 155, is_active: true, image_url: null, icon: '☕' },
  { id: 'prod-8', category_id: 'cat-1', name: 'Spanish Latte', base_price: 165, is_active: true, image_url: null, icon: '☕' },
  // Milk Tea
  { id: 'prod-9', category_id: 'cat-2', name: 'Classic Milk Tea', base_price: 130, is_active: true, image_url: null, icon: '🧋' },
  { id: 'prod-10', category_id: 'cat-2', name: 'Taro Milk Tea', base_price: 140, is_active: true, image_url: null, icon: '🧋' },
  { id: 'prod-11', category_id: 'cat-2', name: 'Matcha Latte', base_price: 150, is_active: true, image_url: null, icon: '🧋' },
  { id: 'prod-12', category_id: 'cat-2', name: 'Brown Sugar MT', base_price: 155, is_active: true, image_url: null, icon: '🧋' },
  { id: 'prod-13', category_id: 'cat-2', name: 'Wintermelon', base_price: 130, is_active: true, image_url: null, icon: '🧋' },
  { id: 'prod-14', category_id: 'cat-2', name: 'Okinawa', base_price: 145, is_active: true, image_url: null, icon: '🧋' },
  // Fruit Tea
  { id: 'prod-15', category_id: 'cat-3', name: 'Mango Fruit Tea', base_price: 130, is_active: true, image_url: null, icon: '🥭' },
  { id: 'prod-16', category_id: 'cat-3', name: 'Passion Fruit', base_price: 130, is_active: true, image_url: null, icon: '🍑' },
  { id: 'prod-17', category_id: 'cat-3', name: 'Lychee Tea', base_price: 135, is_active: true, image_url: null, icon: '🍹' },
  { id: 'prod-18', category_id: 'cat-3', name: 'Green Apple', base_price: 130, is_active: true, image_url: null, icon: '🍏' },
  // Snacks
  { id: 'prod-19', category_id: 'cat-4', name: 'Fries', base_price: 80, is_active: true, image_url: null, icon: '🍟' },
  { id: 'prod-20', category_id: 'cat-4', name: 'Chicken Pops', base_price: 95, is_active: true, image_url: null, icon: '🍗' },
  { id: 'prod-21', category_id: 'cat-4', name: 'Nachos', base_price: 85, is_active: true, image_url: null, icon: '🧀' },
  { id: 'prod-22', category_id: 'cat-4', name: 'Fish Balls', base_price: 60, is_active: true, image_url: null, icon: '🐟' },
];

export const sampleVariants: ProductVariant[] = [
  // sizes for drinks
  { id: 'var-1', product_id: 'prod-1', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-2', product_id: 'prod-1', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-3', product_id: 'prod-2', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-4', product_id: 'prod-2', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-5', product_id: 'prod-3', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-6', product_id: 'prod-3', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-7', product_id: 'prod-4', name: 'Solo', additional_price: 0 },
  { id: 'var-8', product_id: 'prod-4', name: 'Double', additional_price: 30 },
  { id: 'var-9', product_id: 'prod-5', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-10', product_id: 'prod-5', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-11', product_id: 'prod-6', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-12', product_id: 'prod-6', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-13', product_id: 'prod-7', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-14', product_id: 'prod-7', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-15', product_id: 'prod-8', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-16', product_id: 'prod-8', name: 'Large (22oz)', additional_price: 30 },
  // milk tea
  { id: 'var-17', product_id: 'prod-9', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-18', product_id: 'prod-9', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-19', product_id: 'prod-10', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-20', product_id: 'prod-10', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-21', product_id: 'prod-11', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-22', product_id: 'prod-11', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-23', product_id: 'prod-12', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-24', product_id: 'prod-12', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-25', product_id: 'prod-13', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-26', product_id: 'prod-13', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-27', product_id: 'prod-14', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-28', product_id: 'prod-14', name: 'Large (22oz)', additional_price: 30 },
  // fruit tea
  { id: 'var-29', product_id: 'prod-15', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-30', product_id: 'prod-15', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-31', product_id: 'prod-16', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-32', product_id: 'prod-16', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-33', product_id: 'prod-17', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-34', product_id: 'prod-17', name: 'Large (22oz)', additional_price: 30 },
  { id: 'var-35', product_id: 'prod-18', name: 'Medium (16oz)', additional_price: 0 },
  { id: 'var-36', product_id: 'prod-18', name: 'Large (22oz)', additional_price: 30 },
];

export const sampleAddons: Addon[] = [
  { id: 'add-1', name: 'Pearls', price: 15, is_active: true },
  { id: 'add-2', name: 'Nata de Coco', price: 15, is_active: true },
  { id: 'add-3', name: 'Cream Cheese', price: 25, is_active: true },
  { id: 'add-4', name: 'Coffee Jelly', price: 15, is_active: true },
  { id: 'add-5', name: 'Pudding', price: 20, is_active: true },
  { id: 'add-6', name: 'Extra Shot', price: 25, is_active: true },
  { id: 'add-7', name: 'Whipped Cream', price: 20, is_active: true },
];
