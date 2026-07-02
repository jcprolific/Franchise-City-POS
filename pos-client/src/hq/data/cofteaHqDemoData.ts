import type { HqKpiSnapshot, HqWeeklyRevenueItem } from '../lib/hqKpiService';
import type { ReportsSnapshot } from '../lib/reportsService';

export const COFTEA_HQ_TOTAL_BRANCHES = 6;

export const COFTEA_SAMPLE_SNAPSHOT: HqKpiSnapshot = {
  todayRevenue: 84250,
  yesterdayRevenue: 76800,
  todayOrders: 412,
  yesterdayOrders: 389,
  avgOrderValue: 204.5,
  activeBranches: 5,
};

export const cofteaSampleRevenue: HqWeeklyRevenueItem[] = [
  { day: 'Mon', revenue: 520000 },
  { day: 'Tue', revenue: 548000 },
  { day: 'Wed', revenue: 562000 },
  { day: 'Thu', revenue: 571000 },
  { day: 'Fri', revenue: 618000 },
  { day: 'Sat', revenue: 692000 },
  { day: 'Sun', revenue: 654000 },
];

export interface HqBranchAlert {
  id: string;
  name: string;
  meta: string;
  status: 'Offline' | 'Needs Attention';
}

export interface HqInventoryAlert {
  id: string;
  name: string;
  branch: string;
  qty: number;
  level: 'warn' | 'critical';
}

export interface HqLiveOrder {
  id: string;
  branch: string;
  items: string;
  total: number;
  status: string;
  time: string;
}

export interface HqDisplayBranch {
  id: string;
  code: string;
  name: string;
  address: string;
  is_active: boolean;
  franchisee_name?: string | null;
  franchisee_phone?: string | null;
  franchisee_email?: string | null;
  opening_date?: string | null;
  onboarding_status?: string | null;
}

export interface HqSupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  is_active: boolean | null;
  created_at: string | null;
  outstanding_balance?: number | null;
  credit_terms?: string | null;
  _local?: boolean;
}

export const cofteaBranchesToCheck: HqBranchAlert[] = [
  {
    id: 'ort',
    name: 'Coftea Ortigas',
    meta: 'Terminal offline · last sync 1h ago',
    status: 'Offline',
  },
  {
    id: 'qc',
    name: 'Coftea Quezon Ave',
    meta: 'Below target · 82% of daily goal',
    status: 'Needs Attention',
  },
  {
    id: 'ala',
    name: 'Coftea Alabang',
    meta: 'Pearl stock low · reorder suggested',
    status: 'Needs Attention',
  },
];

export const cofteaInventoryAlerts: HqInventoryAlert[] = [
  { id: 'cup', name: '16oz Cups', branch: 'BGC Central', qty: 85, level: 'warn' },
  { id: 'lid', name: 'Cup Lids', branch: 'Makati', qty: 120, level: 'warn' },
  { id: 'pearls', name: 'Tapioca Pearls', branch: 'Ortigas', qty: 0, level: 'critical' },
  { id: 'beans', name: 'Espresso Beans', branch: 'Alabang', qty: 2, level: 'critical' },
  { id: 'syrup', name: 'Brown Sugar Syrup', branch: 'Quezon Ave', qty: 4, level: 'warn' },
];

export const cofteaLiveOrders: HqLiveOrder[] = [
  {
    id: '4895',
    branch: 'BGC Central',
    items: 'Okinawa LRG, Pearl add-on',
    total: 139,
    status: 'NEW',
    time: 'Just now',
  },
  {
    id: '4894',
    branch: 'Makati',
    items: 'Matcha Latte MED, Cheese Foam',
    total: 175,
    status: 'PREPARING',
    time: '2 min ago',
  },
  {
    id: '4893',
    branch: 'BGC Central',
    items: 'Classic MT LRG x2',
    total: 260,
    status: 'PREPARING',
    time: '5 min ago',
  },
  {
    id: '4892',
    branch: 'Alabang',
    items: 'Spanish Latte MED',
    total: 119,
    status: 'READY',
    time: '7 min ago',
  },
  {
    id: '4891',
    branch: 'Quezon Ave',
    items: 'Passion Fruit MED, Wintermelon MED',
    total: 228,
    status: 'COMPLETED',
    time: '11 min ago',
  },
];

export const cofteaSampleBranches: HqDisplayBranch[] = [
  {
    id: 'sample-bgc',
    code: 'BR-BGC',
    name: 'Coftea BGC Central',
    address: 'Bonifacio Global City · Taguig',
    is_active: true,
    franchisee_name: 'Maria Santos',
    franchisee_phone: '0917 220 4101',
    franchisee_email: 'maria.santos@coftea.ph',
    opening_date: '2026-07-15',
    onboarding_status: 'active',
  },
  {
    id: 'sample-mkt',
    code: 'BR-MKT',
    name: 'Coftea Makati',
    address: 'Ayala Avenue · Makati City',
    is_active: true,
    franchisee_name: 'Jeremiah Codillero',
    franchisee_phone: '0936 361 1867',
    franchisee_email: 'jeremiah.codillero@coftea.ph',
    opening_date: '2026-08-01',
    onboarding_status: 'for_training_schedule',
  },
  {
    id: 'sample-ort',
    code: 'BR-ORT',
    name: 'Coftea Ortigas',
    address: 'Robinsons Galleria · Pasig City',
    is_active: false,
    franchisee_name: 'Ana Cruz',
    franchisee_phone: '0917 660 2844',
    franchisee_email: 'ana.cruz@coftea.ph',
    opening_date: '2026-06-30',
    onboarding_status: 'suspended',
  },
  {
    id: 'sample-ala',
    code: 'BR-ALA',
    name: 'Coftea Alabang',
    address: 'Alabang Town Center · Muntinlupa',
    is_active: true,
    franchisee_name: 'Marco Reyes',
    franchisee_phone: '0928 441 7701',
    franchisee_email: 'marco.reyes@coftea.ph',
    opening_date: '2026-09-10',
    onboarding_status: 'under_construction',
  },
  {
    id: 'sample-qc',
    code: 'BR-QC',
    name: 'Coftea Quezon Ave',
    address: 'Quezon Avenue · Quezon City',
    is_active: true,
    franchisee_name: 'Lea Domingo',
    franchisee_phone: '0918 305 1199',
    franchisee_email: 'lea.domingo@coftea.ph',
    opening_date: '2026-07-28',
    onboarding_status: 'active',
  },
  {
    id: 'sample-sm',
    code: 'BR-SM',
    name: 'Coftea SM North',
    address: 'SM City North EDSA · Quezon City',
    is_active: true,
    franchisee_name: 'Paolo Mendoza',
    franchisee_phone: '0917 884 5530',
    franchisee_email: 'paolo.mendoza@coftea.ph',
    opening_date: '2026-10-05',
    onboarding_status: 'signed_contract',
  },
];

export const cofteaSampleSuppliers: HqSupplierRow[] = [
  {
    id: 's-cf-001',
    name: 'Coftea Commissary',
    contact_person: 'Rica Mendoza',
    phone: '+63 917 800 2201',
    email: 'supply@coftea.ph',
    address: 'Taguig City, Metro Manila',
    category: 'Tea Leaves & Base Ingredients',
    is_active: true,
    created_at: null,
    outstanding_balance: 128500,
    credit_terms: 'Net 30',
  },
  {
    id: 's-cf-002',
    name: 'BeanCraft Roasters',
    contact_person: 'Jonas Villanueva',
    phone: '+63 2 8888 5510',
    email: 'orders@beancraft.ph',
    address: 'Makati City, Metro Manila',
    category: 'Espresso Beans & Coffee',
    is_active: true,
    created_at: null,
    outstanding_balance: 74200,
    credit_terms: 'Net 15',
  },
  {
    id: 's-cf-003',
    name: 'PearlPro Ingredients',
    contact_person: 'Lea Domingo',
    phone: '+63 928 441 3390',
    email: 'sales@pearlpro.ph',
    address: 'Caloocan City, Metro Manila',
    category: 'Tapioca Pearls & Boba',
    is_active: true,
    created_at: null,
    outstanding_balance: 0,
    credit_terms: 'Net 30',
  },
  {
    id: 's-cf-004',
    name: 'SyrupWorks PH',
    contact_person: 'Marco Dela Cruz',
    phone: '+63 905 220 9944',
    email: 'distribution@syrupworks.ph',
    address: 'Pasig City, Metro Manila',
    category: 'Syrups & Flavorings',
    is_active: true,
    created_at: null,
    outstanding_balance: 43800,
    credit_terms: 'Net 30',
  },
  {
    id: 's-cf-005',
    name: 'DairyFresh Food Corp.',
    contact_person: 'Hannah Soriano',
    phone: '+63 917 555 8033',
    email: 'foodservice@dairyfresh.com',
    address: 'Santa Rosa, Laguna',
    category: 'Milk & Dairy',
    is_active: true,
    created_at: null,
    outstanding_balance: 96750,
    credit_terms: 'Net 15',
  },
  {
    id: 's-cf-006',
    name: 'CupPack Solutions',
    contact_person: 'Grace Tan',
    phone: '+63 927 118 5502',
    email: 'orders@cuppack.ph',
    address: 'Quezon City, Metro Manila',
    category: 'Cups, Lids & Packaging',
    is_active: true,
    created_at: null,
    outstanding_balance: 0,
    credit_terms: 'COD',
  },
  {
    id: 's-cf-007',
    name: 'ColdChain Logistics PH',
    contact_person: 'Enzo Reyes',
    phone: '+63 918 330 8811',
    email: 'dispatch@coldchain.ph',
    address: 'Parañaque City, Metro Manila',
    category: 'Cold Storage & Delivery',
    is_active: true,
    created_at: null,
    outstanding_balance: 18300,
    credit_terms: 'Net 7',
  },
  {
    id: 's-cf-008',
    name: 'BGC Mall Admin',
    contact_person: 'Ronald Aquino',
    phone: '+63 2 709 1888',
    email: 'tenancy@bgc.com',
    address: 'Bonifacio Global City, Taguig',
    category: 'Mall Operations',
    is_active: true,
    created_at: null,
    outstanding_balance: 210000,
    credit_terms: 'Net 30',
  },
];

export const cofteaSampleReports: ReportsSnapshot = {
  summary: {
    revenue: 548300,
    orders: 2680,
    avgOrderValue: 204.6,
    activeBranches: 5,
    lowStockBranches: 3,
    prevRevenue: 512400,
    prevOrders: 2510,
  },
  revenueTrend: [
    { label: 'Mon', revenue: 71200, orders: 348 },
    { label: 'Tue', revenue: 74800, orders: 366 },
    { label: 'Wed', revenue: 76900, orders: 378 },
    { label: 'Thu', revenue: 78100, orders: 384 },
    { label: 'Fri', revenue: 84600, orders: 414 },
    { label: 'Sat', revenue: 92400, orders: 452 },
    { label: 'Sun', revenue: 70300, orders: 338 },
  ],
  branchRanking: [
    { branchId: 'sample-bgc', branchName: 'Coftea BGC Central', franchiseeName: 'Maria Santos', revenue: 138500, orders: 671, avgOrderValue: 206.4, isActive: true },
    { branchId: 'sample-mkt', branchName: 'Coftea Makati', franchiseeName: 'Jeremiah Codillero', revenue: 121800, orders: 598, avgOrderValue: 203.7, isActive: true },
    { branchId: 'sample-qc', branchName: 'Coftea Quezon Ave', franchiseeName: 'Lea Domingo', revenue: 104200, orders: 511, avgOrderValue: 203.9, isActive: true },
    { branchId: 'sample-ala', branchName: 'Coftea Alabang', franchiseeName: 'Marco Reyes', revenue: 92600, orders: 458, avgOrderValue: 202.2, isActive: true },
    { branchId: 'sample-sm', branchName: 'Coftea SM North', franchiseeName: 'Paolo Mendoza', revenue: 91200, orders: 442, avgOrderValue: 206.3, isActive: true },
    { branchId: 'sample-ort', branchName: 'Coftea Ortigas', franchiseeName: 'Ana Cruz', revenue: 0, orders: 0, avgOrderValue: 0, isActive: false },
  ],
  paymentMix: [
    { method: 'CASH', orders: 1456, amount: 296500 },
    { method: 'GCASH', orders: 921, amount: 192100 },
    { method: 'CARD', orders: 303, amount: 59700 },
  ],
  inventoryStatus: [
    { branchId: 'sample-ort', branchName: 'Coftea Ortigas', materialName: 'Tapioca Pearls', unit: 'g', onHandQty: 0, lowStockQty: 2000, level: 'critical' },
    { branchId: 'sample-ala', branchName: 'Coftea Alabang', materialName: 'Espresso Beans', unit: 'g', onHandQty: 320, lowStockQty: 1500, level: 'warn' },
    { branchId: 'sample-qc', branchName: 'Coftea Quezon Ave', materialName: 'Brown Sugar Syrup', unit: 'ml', onHandQty: 480, lowStockQty: 1000, level: 'warn' },
    { branchId: 'sample-bgc', branchName: 'Coftea BGC Central', materialName: '16oz Cups', unit: 'pcs', onHandQty: 420, lowStockQty: 300, level: 'ok' },
    { branchId: 'sample-mkt', branchName: 'Coftea Makati', materialName: 'Fresh Milk', unit: 'ml', onHandQty: 9800, lowStockQty: 4000, level: 'ok' },
    { branchId: 'sample-sm', branchName: 'Coftea SM North', materialName: 'Matcha Powder', unit: 'g', onHandQty: 1240, lowStockQty: 800, level: 'ok' },
  ],
};

export const COFTEA_DEMO_DATA_MESSAGE =
  'Showing Coftea demo data until live HQ data is available.';

export const COFTEA_CHART_STROKE = '#d98724';
export const COFTEA_CHART_FILL_START = 'rgba(217, 135, 36, 0.24)';
export const COFTEA_CHART_FILL_END = 'rgba(217, 135, 36, 0.0)';
