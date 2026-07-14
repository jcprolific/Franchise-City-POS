import type { BrandConfig } from './types';
import type { Category, Product, ProductVariant, Addon } from '../types';

const IMG = '/menu/coftea';

const DRINK_CATEGORIES = new Set(['cat-c1', 'cat-c2', 'cat-c3', 'cat-c4', 'cat-c5']);

const categories: Category[] = [
  { id: 'cat-c2', name: 'Cafe Latte', sort_order: 1, icon: '☕' },
  { id: 'cat-c1', name: 'Cafe Amerikano', sort_order: 2, icon: '☕' },
  { id: 'cat-c3', name: 'Frappe', sort_order: 3, icon: '🥤' },
  { id: 'cat-c4', name: 'Fruit / Soda Series', sort_order: 4, icon: '🧋' },
  { id: 'cat-c5', name: 'Milktea', sort_order: 5, icon: '🧋' },
  { id: 'cat-c6', name: 'Snacks', sort_order: 6, icon: '🍪' },
];

const drinkProducts: Omit<Product, 'customizable'>[] = [
  // Cafe Amerikano
  { id: 'cf-1', category_id: 'cat-c1', name: 'Amerikano', base_price: 39, is_active: true, image_url: `${IMG}/cafe-amerikano/amerikano.png`, icon: '☕', description: 'Iced bold black coffee' },
  { id: 'cf-2', category_id: 'cat-c1', name: 'Hot Amerikano', base_price: 39, is_active: true, image_url: `${IMG}/cafe-amerikano/hot-amerikano.png`, icon: '☕', description: 'Hot bold black coffee' },

  // Cafe Latte
  { id: 'cf-3', category_id: 'cat-c2', name: 'Hot Latte', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/hot-latte.png`, icon: '☕', description: 'Hot espresso with steamed milk' },
  { id: 'cf-4', category_id: 'cat-c2', name: 'Spanish Latte', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/spanish-latte.png`, icon: '☕', description: 'Sweetened condensed milk latte' },
  { id: 'cf-5', category_id: 'cat-c2', name: 'Strawberry Latte', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/strawberry-latte.png`, icon: '☕', description: 'Strawberry-infused milk latte' },
  { id: 'cf-6', category_id: 'cat-c2', name: 'Caramel Macchiato', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/caramel-macchiato.png`, icon: '☕', description: 'Espresso with caramel & milk' },
  { id: 'cf-7', category_id: 'cat-c2', name: 'Chocolate', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/chocolate.png`, icon: '☕', description: 'Rich chocolate latte' },
  { id: 'cf-8', category_id: 'cat-c2', name: 'Hazelnut Brew', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/hazelnut-brew.png`, icon: '☕', description: 'Nutty hazelnut coffee' },
  { id: 'cf-9', category_id: 'cat-c2', name: 'Red Velvet', base_price: 49, is_active: true, image_url: `${IMG}/cafe-latte/red-velvet.png`, icon: '☕', description: 'Red velvet creamy latte' },
  { id: 'cf-10', category_id: 'cat-c2', name: 'Salted Caramel', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/salted-caramel.png`, icon: '☕', description: 'Sweet & salty caramel latte' },
  { id: 'cf-11', category_id: 'cat-c2', name: 'Vanilla Blanca', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/vanilla-blanca.png`, icon: '☕', description: 'Smooth vanilla cream latte' },
  { id: 'cf-12', category_id: 'cat-c2', name: 'White Cappuccino', base_price: 39, is_active: true, image_url: `${IMG}/cafe-latte/white-cappuccino.png`, icon: '☕', description: 'Creamy white cappuccino' },

  // Frappe
  { id: 'cf-13', category_id: 'cat-c3', name: 'Cheesecake', base_price: 59, is_active: true, image_url: `${IMG}/frappe/cheesecake.png`, icon: '🥤', description: 'Blended cheesecake frappe' },
  { id: 'cf-14', category_id: 'cat-c3', name: 'Cookies & Cream', base_price: 59, is_active: true, image_url: `${IMG}/frappe/cookies-cream.png`, icon: '🥤', description: 'Cookies & cream frappe' },
  { id: 'cf-15', category_id: 'cat-c3', name: 'Dark Choco', base_price: 59, is_active: true, image_url: `${IMG}/frappe/dark-choco.png`, icon: '🥤', description: 'Rich dark chocolate frappe' },
  { id: 'cf-16', category_id: 'cat-c3', name: 'Java Chip', base_price: 59, is_active: true, image_url: `${IMG}/frappe/java-chip.png`, icon: '🥤', description: 'Coffee & chocolate chips frappe' },
  { id: 'cf-17', category_id: 'cat-c3', name: 'Matcha', base_price: 59, is_active: true, image_url: `${IMG}/frappe/matcha.png`, icon: '🥤', description: 'Green tea matcha frappe' },
  { id: 'cf-18', category_id: 'cat-c3', name: 'Strawberry', base_price: 59, is_active: true, image_url: `${IMG}/frappe/strawberry.png`, icon: '🥤', description: 'Fresh strawberry frappe' },
  { id: 'cf-19', category_id: 'cat-c3', name: 'Vanilla Coffee', base_price: 59, is_active: true, image_url: `${IMG}/frappe/vanilla-coffee.png`, icon: '🥤', description: 'Vanilla coffee frappe' },

  // Fruit / Soda Series
  { id: 'cf-20', category_id: 'cat-c4', name: 'Blueberry', base_price: 39, is_active: true, image_url: `${IMG}/fruit-soda/blueberry.png`, icon: '🫐', description: 'Refreshing blueberry soda' },
  { id: 'cf-21', category_id: 'cat-c4', name: 'Green Apple', base_price: 39, is_active: true, image_url: `${IMG}/fruit-soda/green-apple.png`, icon: '🍏', description: 'Crisp green apple soda' },
  { id: 'cf-22', category_id: 'cat-c4', name: 'Kiwi', base_price: 39, is_active: true, image_url: `${IMG}/fruit-soda/kiwi.png`, icon: '🥝', description: 'Tangy kiwi soda' },
  { id: 'cf-23', category_id: 'cat-c4', name: 'Lychee', base_price: 39, is_active: true, image_url: `${IMG}/fruit-soda/lychee.png`, icon: '🍒', description: 'Sweet lychee soda' },
  { id: 'cf-24', category_id: 'cat-c4', name: 'Passionfruit', base_price: 39, is_active: true, image_url: `${IMG}/fruit-soda/passionfruit.png`, icon: '🍈', description: 'Tropical passionfruit soda' },
  { id: 'cf-25', category_id: 'cat-c4', name: 'Strawberry', base_price: 39, is_active: true, image_url: `${IMG}/fruit-soda/strawberry.png`, icon: '🍓', description: 'Juicy strawberry soda' },

  // Milktea
  { id: 'cf-26', category_id: 'cat-c5', name: 'Original', base_price: 39, is_active: true, image_url: `${IMG}/milktea/original.png`, icon: '🧋', description: 'Classic house milk tea' },
  { id: 'cf-27', category_id: 'cat-c5', name: 'Brown Sugar', base_price: 39, is_active: true, image_url: `${IMG}/milktea/brown-sugar.png`, icon: '🧋', description: 'Caramelized brown sugar milk tea' },
  { id: 'cf-28', category_id: 'cat-c5', name: 'Chocolate', base_price: 39, is_active: true, image_url: `${IMG}/milktea/chocolate.png`, icon: '🧋', description: 'Chocolate milk tea' },
  { id: 'cf-29', category_id: 'cat-c5', name: 'Cookies & Cream', base_price: 39, is_active: true, image_url: `${IMG}/milktea/cookies-cream.png`, icon: '🧋', description: 'Cookies & cream milk tea' },
  { id: 'cf-30', category_id: 'cat-c5', name: 'Hokkaido', base_price: 39, is_active: true, image_url: `${IMG}/milktea/hokkaido.png`, icon: '🧋', description: 'Creamy Hokkaido milk tea' },
  { id: 'cf-31', category_id: 'cat-c5', name: 'Matcha', base_price: 39, is_active: true, image_url: `${IMG}/milktea/matcha.png`, icon: '🧋', description: 'Matcha green tea milk tea' },
  { id: 'cf-32', category_id: 'cat-c5', name: 'Okinawa', base_price: 39, is_active: true, image_url: `${IMG}/milktea/okinawa.png`, icon: '🧋', description: 'Roasted brown sugar milk tea' },
  { id: 'cf-33', category_id: 'cat-c5', name: 'Taro', base_price: 39, is_active: true, image_url: `${IMG}/milktea/taro.png`, icon: '🧋', description: 'Creamy taro milk tea' },
  { id: 'cf-34', category_id: 'cat-c5', name: 'Wintermelon', base_price: 39, is_active: true, image_url: `${IMG}/milktea/wintermelon.png`, icon: '🧋', description: 'Sweet wintermelon milk tea' },
];

const snackProducts: Product[] = [
  { id: 'cf-s1', category_id: 'cat-c6', name: 'Fries', base_price: 80, is_active: true, image_url: null, icon: '🍟', description: 'Golden crispy fries' },
  { id: 'cf-s2', category_id: 'cat-c6', name: 'Chicken Pops', base_price: 95, is_active: true, image_url: null, icon: '🍗', description: 'Bite-sized fried chicken' },
  { id: 'cf-s3', category_id: 'cat-c6', name: 'Nachos', base_price: 85, is_active: true, image_url: null, icon: '🧀', description: 'Loaded cheese nachos' },
  { id: 'cf-s4', category_id: 'cat-c6', name: 'Fish Balls', base_price: 60, is_active: true, image_url: null, icon: '🐟', description: 'Classic street snack' },
];

const products: Product[] = [
  ...drinkProducts.map((p) => ({
    ...p,
    customizable: DRINK_CATEGORIES.has(p.category_id),
  })),
  ...snackProducts,
];

const drinkSizes: { abbr: string; name: string; add: number }[] = [
  { abbr: '12OZ', name: '12oz', add: 0 },
  { abbr: '16OZ', name: '16oz', add: 10 },
  { abbr: '22OZ', name: '22oz', add: 20 },
];

function buildDrinkVariants(
  productIds: string[],
  sizes: { abbr: string; name: string; add: number }[]
): ProductVariant[] {
  const variants: ProductVariant[] = [];
  let counter = 1;
  for (const productId of productIds) {
    sizes.forEach((size) => {
      variants.push({
        id: `cf-var-${counter++}`,
        product_id: productId,
        name: size.name,
        abbr: size.abbr,
        additional_price: size.add,
      });
    });
  }
  return variants;
}

const variants: ProductVariant[] = [
  ...buildDrinkVariants(
    drinkProducts.map((p) => p.id),
    drinkSizes
  ),
];

const addons: Addon[] = [
  { id: 'cf-add-1', name: 'Espresso', price: 5, is_active: true },
  { id: 'cf-add-2', name: 'Pearls', price: 10, is_active: true },
  { id: 'cf-add-3', name: 'Nata', price: 10, is_active: true },
  { id: 'cf-add-4', name: 'Coffee Jelly', price: 10, is_active: true },
  { id: 'cf-add-5', name: 'Popping Boba', price: 10, is_active: true },
  { id: 'cf-add-6', name: 'Cream Cheese', price: 10, is_active: true },
  { id: 'cf-add-7', name: 'Tutti Frutti Series', price: 10, is_active: true },
  { id: 'cf-add-8', name: 'Yakult', price: 15, is_active: true },
];

export const cofteaBrand: BrandConfig = {
  id: 'brand-coftea',
  dbBrandId: 'a1000000-0000-4000-8000-000000000002',
  slug: 'coftea',
  name: 'Coftea',
  shortName: 'Coftea',
  logoUrl: '/brands/coftea-logo.png',
  franchiseName: 'BGC Central',
  branchLabel: 'Coftea · BGC Central',
  terminalLabel: 'Branch Terminal · T-01',
  appTitle: 'Coftea POS',
  footerText: 'Coftea POS',
  theme: {
    primary: '#d98724',
    primaryDeep: '#b86f16',
    primarySoft: '#fff3e3',
    primarySoftBorder: '#ddcdb0',
    accent: '#e8a24d',
    accentSoft: '#fff3e3',
    sidebar: '#ffffff',
    sidebarHover: '#faf3e5',
    highlight: '#e8a24d',
    highlightSoft: '#fff3e3',
    loginGradient: 'rgba(217, 135, 36, 0.05)',
  },
  menu: {
    categories,
    products,
    variants,
    addons,
    searchPlaceholder: 'Search coffee, milk tea, fruit tea...',
    emptyIcon: '☕',
    loadingEmoji: '☕',
  },
};
