export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  supplier: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  icon: string;
}

export const sampleInventory: InventoryItem[] = [
  { id: 'inv-1', name: 'Tapioca Pearls', category: 'Add-ons', supplier: 'Pearl Co.', quantity: 5000, unit: 'g', lowStockThreshold: 500, icon: '📦' },
  { id: 'inv-2', name: 'Fresh Milk', category: 'Dairy', supplier: 'Farm Fresh', quantity: 8000, unit: 'ml', lowStockThreshold: 1000, icon: '📦' },
  { id: 'inv-3', name: 'Brown Sugar Syrup', category: 'Syrup', supplier: 'Sweet Inc.', quantity: 1200, unit: 'ml', lowStockThreshold: 500, icon: '📦' },
  { id: 'inv-4', name: 'Matcha Powder', category: 'Powder', supplier: 'Tea House', quantity: 800, unit: 'g', lowStockThreshold: 300, icon: '📦' },
  { id: 'inv-5', name: 'Plastic Cups (L)', category: 'Packaging', supplier: 'PackPro', quantity: 120, unit: 'pcs', lowStockThreshold: 200, icon: '📦' },
  { id: 'inv-6', name: 'Plastic Cups (M)', category: 'Packaging', supplier: 'PackPro', quantity: 340, unit: 'pcs', lowStockThreshold: 200, icon: '📦' },
  { id: 'inv-7', name: 'Coffee Beans', category: 'Coffee', supplier: 'Bean World', quantity: 3000, unit: 'g', lowStockThreshold: 500, icon: '📦' },
  { id: 'inv-8', name: 'Cream Cheese', category: 'Dairy', supplier: 'Dairy Best', quantity: 600, unit: 'g', lowStockThreshold: 200, icon: '📦' },
  { id: 'inv-9', name: 'Nata de Coco', category: 'Add-ons', supplier: 'Tropical', quantity: 2500, unit: 'g', lowStockThreshold: 500, icon: '📦' },
  { id: 'inv-10', name: 'Straws', category: 'Packaging', supplier: 'PackPro', quantity: 450, unit: 'pcs', lowStockThreshold: 200, icon: '📦' },
  { id: 'inv-11', name: 'Lids', category: 'Packaging', supplier: 'PackPro', quantity: 180, unit: 'pcs', lowStockThreshold: 200, icon: '📦' },
  { id: 'inv-12', name: 'Taro Powder', category: 'Powder', supplier: 'Tea House', quantity: 400, unit: 'g', lowStockThreshold: 500, icon: '📦' },
];

export interface DashboardData {
  todaySales: number;
  todaySalesChange: number;
  totalOrders: number;
  ordersChange: number;
  avgOrderValue: number;
  avgOrderChange: number;
  topProductName: string;
  topProductSold: number;
  weeklySales: { day: string; amount: number }[];
  topProducts: { name: string; count: number; color: string }[];
  recentTransactions: { id: string; time: string; items: number; total: number; payment: string }[];
}

export const sampleDashboard: DashboardData = {
  todaySales: 24680,
  todaySalesChange: 12,
  totalOrders: 164,
  ordersChange: 8,
  avgOrderValue: 150.49,
  avgOrderChange: 3,
  topProductName: 'Classic MT',
  topProductSold: 142,
  weeklySales: [
    { day: 'Mon', amount: 11200 },
    { day: 'Tue', amount: 8900 },
    { day: 'Wed', amount: 12500 },
    { day: 'Thu', amount: 13800 },
    { day: 'Fri', amount: 18200 },
    { day: 'Sat', amount: 21500 },
    { day: 'Sun', amount: 17800 },
  ],
  topProducts: [
    { name: 'Classic Milk Tea', count: 142, color: '#e09f3e' },
    { name: 'Latte', count: 118, color: '#2ecc71' },
    { name: 'Mango Fruit Tea', count: 96, color: '#e67e22' },
    { name: 'Americano', count: 84, color: '#95a5a6' },
    { name: 'Taro Milk Tea', count: 72, color: '#9b59b6' },
  ],
  recentTransactions: [
    { id: '#1042', time: '2:34 PM', items: 3, total: 430, payment: 'GCash' },
    { id: '#1041', time: '2:28 PM', items: 1, total: 150, payment: 'Cash' },
    { id: '#1040', time: '2:15 PM', items: 2, total: 280, payment: 'Cash' },
    { id: '#1039', time: '1:58 PM', items: 4, total: 520, payment: 'Card' },
    { id: '#1038', time: '1:42 PM', items: 1, total: 130, payment: 'GCash' },
  ],
};
