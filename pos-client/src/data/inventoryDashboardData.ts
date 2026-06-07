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
  { id: 'inv-1', name: 'Cheese Seasoning', category: 'Flavor Powder', supplier: 'PC Commissary', quantity: 3200, unit: 'g', lowStockThreshold: 500, icon: '🧀' },
  { id: 'inv-2', name: 'BBQ Seasoning', category: 'Flavor Powder', supplier: 'PC Commissary', quantity: 2800, unit: 'g', lowStockThreshold: 500, icon: '🍖' },
  { id: 'inv-3', name: 'Sour Cream Powder', category: 'Flavor Powder', supplier: 'PC Commissary', quantity: 1900, unit: 'g', lowStockThreshold: 500, icon: '🥛' },
  { id: 'inv-4', name: 'Frozen Fries', category: 'Core', supplier: 'McCain PH', quantity: 45, unit: 'kg', lowStockThreshold: 15, icon: '🍟' },
  { id: 'inv-5', name: 'PC Cups (Regular)', category: 'Packaging', supplier: 'PackPro', quantity: 120, unit: 'pcs', lowStockThreshold: 200, icon: '🥤' },
  { id: 'inv-6', name: 'PC Cups (Mega)', category: 'Packaging', supplier: 'PackPro', quantity: 340, unit: 'pcs', lowStockThreshold: 150, icon: '🥤' },
  { id: 'inv-7', name: 'Fry Oil', category: 'Core', supplier: 'Golden Fry', quantity: 18, unit: 'L', lowStockThreshold: 8, icon: '🛢️' },
  { id: 'inv-8', name: 'Chicken Pops (Frozen)', category: 'Snacks', supplier: 'Bounty Fresh', quantity: 12, unit: 'kg', lowStockThreshold: 5, icon: '🍗' },
  { id: 'inv-9', name: 'Paper Bags', category: 'Packaging', supplier: 'PackPro', quantity: 420, unit: 'pcs', lowStockThreshold: 200, icon: '🛍️' },
  { id: 'inv-10', name: 'Napkins', category: 'Packaging', supplier: 'PackPro', quantity: 650, unit: 'pcs', lowStockThreshold: 200, icon: '🧻' },
  { id: 'inv-11', name: 'Cup Lids', category: 'Packaging', supplier: 'PackPro', quantity: 180, unit: 'pcs', lowStockThreshold: 200, icon: '🔘' },
  { id: 'inv-12', name: 'Chili Cheese Powder', category: 'Flavor Powder', supplier: 'PC Commissary', quantity: 380, unit: 'g', lowStockThreshold: 500, icon: '🌶️' },
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
  todaySales: 28450,
  todaySalesChange: 14.2,
  totalOrders: 198,
  ordersChange: 9.5,
  avgOrderValue: 143.69,
  avgOrderChange: 4.1,
  topProductName: 'Cheese',
  topProductSold: 186,
  weeklySales: [
    { day: 'Mon', amount: 14200 },
    { day: 'Tue', amount: 11800 },
    { day: 'Wed', amount: 15600 },
    { day: 'Thu', amount: 16900 },
    { day: 'Fri', amount: 22400 },
    { day: 'Sat', amount: 26800 },
    { day: 'Sun', amount: 23100 },
  ],
  topProducts: [
    { name: 'Cheese', count: 186, color: '#f37021' },
    { name: 'Barbecue', count: 154, color: '#008d36' },
    { name: 'Mega Fries', count: 128, color: '#ffd200' },
    { name: 'Chicken Pops', count: 96, color: '#007a33' },
    { name: 'Iced Tea', count: 72, color: '#d98724' },
  ],
  recentTransactions: [
    { id: '#4821', time: '3:12 PM', items: 3, total: 285, payment: 'GCash' },
    { id: '#4820', time: '3:05 PM', items: 2, total: 195, payment: 'Cash' },
    { id: '#4819', time: '2:48 PM', items: 4, total: 420, payment: 'Cash' },
    { id: '#4818', time: '2:31 PM', items: 1, total: 135, payment: 'Card' },
    { id: '#4817', time: '2:18 PM', items: 2, total: 260, payment: 'GCash' },
  ],
};
