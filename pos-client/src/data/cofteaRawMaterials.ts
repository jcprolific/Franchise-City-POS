// Coftea franchise raw materials — mirrored from the 2026 Coftea PO Form.
// Used as the local fallback catalog for the branch Inventory page when the
// Supabase `raw_material` / `branch_inventory` tables are unconfigured or empty.

export interface CofteaRawMaterial {
  id: string;
  name: string;
  category: string;
  packaging: string;
  unit: string;
  price: number;
  icon: string;
  onHandQty: number;
  lowStockQty: number;
}

export const RAW_MATERIAL_CATEGORY_ORDER = [
  'COF/TEA SYRUPS',
  'COF/TEA FRUIT SERIES',
  'COF/TEA POWDERED BASE',
  'COF/TEA SINKERS AND ETC',
] as const;

export const cofteaRawMaterials: CofteaRawMaterial[] = [
  { id: 'rm-brown-sugar', name: 'Brown Sugar', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍯', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-caramel-drizzle-brown', name: 'Caramel Drizzle (Brown)', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍮', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-caramel-clear', name: 'Caramel Syrup (Clear)', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍮', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-chocolate', name: 'Chocolate', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 413, icon: '🍫', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-coffee-extract', name: 'Coffee Extract', category: 'COF/TEA SYRUPS', packaging: '2L', unit: 'bottle', price: 466, icon: '☕', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-hazelnut', name: 'Hazelnut', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🌰', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-hokkaido', name: 'Hokkaido', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🥛', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-okinawa', name: 'Okinawa', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🥛', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-salted-caramel', name: 'Salted Caramel', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍮', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-strawberry-syrup', name: 'Strawberry', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🍓', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-sweetener', name: 'Sweetener', category: 'COF/TEA SYRUPS', packaging: '2kg', unit: 'pack', price: 162, icon: '🍬', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-taro', name: 'Taro', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍠', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-vanilla', name: 'Vanilla', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍨', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-white-chocolate', name: 'White Chocolate', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍫', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-wintermelon', name: 'Wintermelon', category: 'COF/TEA SYRUPS', packaging: '2.5kg', unit: 'pack', price: 351, icon: '🍈', onHandQty: 6, lowStockQty: 2 },

  { id: 'rm-blueberry', name: 'Blueberry', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🫐', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-green-apple', name: 'Green Apple', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🍏', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-kiwi', name: 'Kiwi', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🥝', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-lychee', name: 'Lychee', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🍒', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-passion-fruit', name: 'Passion Fruit', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🍈', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-orange', name: 'Orange', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🍊', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-honey-peach', name: 'Honey Peach', category: 'COF/TEA FRUIT SERIES', packaging: '2.5kg', unit: 'pack', price: 315, icon: '🍑', onHandQty: 5, lowStockQty: 2 },

  { id: 'rm-cheesecake', name: 'Cheesecake', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 276, icon: '🍰', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-cookies-and-cream', name: 'Cookies and Cream', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 276, icon: '🍪', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-cream-cheese-salted', name: 'Cream Cheese (Salted)', category: 'COF/TEA POWDERED BASE', packaging: '500g', unit: 'pack', price: 272, icon: '🧀', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-dark-chocolate-powder', name: 'Dark Chocolate Powder', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 366, icon: '🍫', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-creamer', name: 'Creamer', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 223, icon: '🥛', onHandQty: 20, lowStockQty: 6 },
  { id: 'rm-java-chip', name: 'Java Chip', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 352, icon: '🍫', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-matcha', name: 'Matcha', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 361, icon: '🍵', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-red-velvet', name: 'Red Velvet', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 352, icon: '❤️', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-whipping-cream', name: 'Whipping Cream', category: 'COF/TEA POWDERED BASE', packaging: '1kg', unit: 'pack', price: 437, icon: '🍦', onHandQty: 8, lowStockQty: 3 },

  { id: 'rm-assam-tea', name: 'Assam Tea', category: 'COF/TEA SINKERS AND ETC', packaging: '600g', unit: 'pack', price: 284, icon: '🍵', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-tapioca', name: 'Tapioca', category: 'COF/TEA SINKERS AND ETC', packaging: '1kg', unit: 'pack', price: 98, icon: '⚫', onHandQty: 15, lowStockQty: 5 },
  { id: 'rm-nata-coco-jelly', name: 'Nata/Coco Jelly', category: 'COF/TEA SINKERS AND ETC', packaging: '2.5kgs', unit: 'pack', price: 270, icon: '🧊', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-coffee-jelly', name: 'Coffee Jelly', category: 'COF/TEA SINKERS AND ETC', packaging: '3kgs', unit: 'pack', price: 599, icon: '🫙', onHandQty: 4, lowStockQty: 2 },
  { id: 'rm-strawberry-popping', name: 'Strawberry Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '🔴', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-green-apple-popping', name: 'Green Apple Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '🟢', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-peach-popping', name: 'Peach Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '🟠', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-yogurt-popping', name: 'Yogurt Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '⚪', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-passion-fruit-popping', name: 'Passion Fruit Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '🟡', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-lychee-popping', name: 'Lychee Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '🔴', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-blueberry-popping', name: 'Blueberry Popping Bobba', category: 'COF/TEA SINKERS AND ETC', packaging: '1.30kg', unit: 'pack', price: 285, icon: '🔵', onHandQty: 5, lowStockQty: 2 },
  { id: 'rm-12oz-plastic-cups', name: '12oz Plastic Cups', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 350, icon: '🥤', onHandQty: 10, lowStockQty: 4 },
  { id: 'rm-12oz-paper-cups', name: '12oz Paper Cups', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 300, icon: '🥤', onHandQty: 10, lowStockQty: 4 },
  { id: 'rm-16oz-plastic-cups', name: '16oz Plastic Cups', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 350, icon: '🥤', onHandQty: 10, lowStockQty: 4 },
  { id: 'rm-16oz-paper-cups', name: '16oz Paper Cups', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 385, icon: '🥤', onHandQty: 10, lowStockQty: 4 },
  { id: 'rm-22oz-plastic-cups', name: '22oz Plastic Cups', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 400, icon: '🥤', onHandQty: 12, lowStockQty: 4 },
  { id: 'rm-22oz-paper-cups', name: '22oz Paper Cups', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 430, icon: '🥤', onHandQty: 10, lowStockQty: 4 },
  { id: 'rm-hot-cups-lid', name: 'Hot Cups with Lid', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 900, icon: '☕', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-sealing-film', name: 'Sealing Film', category: 'COF/TEA SINKERS AND ETC', packaging: '1roll', unit: 'roll', price: 550, icon: '🎞️', onHandQty: 4, lowStockQty: 2 },
  { id: 'rm-coffee-straw', name: 'Coffee Straw', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 80, icon: '🥤', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-bobba-straw', name: 'Bobba Straw', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 100, icon: '🥤', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-tea-barrel-10l', name: 'Tea Barrel - 10L', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 1450, icon: '🛢️', onHandQty: 2, lowStockQty: 1 },
  { id: 'rm-weighing-scale', name: 'Weighing Scale', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 150, icon: '⚖️', onHandQty: 2, lowStockQty: 1 },
  { id: 'rm-measuring-cup-spoon', name: 'Measuring Cup & Spoon', category: 'COF/TEA SINKERS AND ETC', packaging: '1 set', unit: 'set', price: 80, icon: '🥄', onHandQty: 2, lowStockQty: 1 },
  { id: 'rm-sauce-bottle-small', name: 'Sauce Bottle Small - 240ml', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 35, icon: '🍼', onHandQty: 4, lowStockQty: 2 },
  { id: 'rm-syrup-pump-container', name: 'Syrup Pump Container 1.6L', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 210, icon: '🧴', onHandQty: 3, lowStockQty: 1 },
  { id: 'rm-sealing-machine', name: 'Sealing Machine', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 3000, icon: '⚙️', onHandQty: 1, lowStockQty: 1 },
  { id: 'rm-apron', name: 'Apron', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 199, icon: '🧥', onHandQty: 3, lowStockQty: 1 },
  { id: 'rm-countertop-menu', name: 'Countertop Menu', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 150, icon: '📋', onHandQty: 2, lowStockQty: 1 },
  { id: 'rm-loyalty-card', name: 'Loyalty Card', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 400, icon: '🎟️', onHandQty: 3, lowStockQty: 1 },
  { id: 'rm-single-takeout-plastic', name: 'Single Take Out Plastic', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 140, icon: '🛍️', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-double-takeout-plastic', name: 'Double Take Out Plastic', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 150, icon: '🛍️', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-flat-lids', name: 'Flat Lids', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 110, icon: '🔘', onHandQty: 8, lowStockQty: 3 },
  { id: 'rm-piping-set', name: 'Piping Set', category: 'COF/TEA SINKERS AND ETC', packaging: '1set', unit: 'set', price: 150, icon: '🧁', onHandQty: 2, lowStockQty: 1 },
  { id: 'rm-kliptop', name: 'Kliptop', category: 'COF/TEA SINKERS AND ETC', packaging: '1pc', unit: 'pc', price: 100, icon: '📎', onHandQty: 3, lowStockQty: 1 },
  { id: 'rm-dome', name: 'Dome', category: 'COF/TEA SINKERS AND ETC', packaging: '100pcs', unit: 'pack', price: 110, icon: '🥤', onHandQty: 6, lowStockQty: 2 },
  { id: 'rm-ice-chest-45l', name: 'Ice Chest 45L', category: 'COF/TEA SINKERS AND ETC', packaging: '1 pc', unit: 'pc', price: 1350, icon: '🧊', onHandQty: 1, lowStockQty: 1 },
];
