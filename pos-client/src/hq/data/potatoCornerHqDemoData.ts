import type { HqKpiSnapshot, HqWeeklyRevenueItem } from '../lib/hqKpiService';
import type { ReportsSnapshot } from '../lib/reportsService';
import type {
  HqBranchAlert,
  HqDisplayBranch,
  HqInventoryAlert,
  HqLiveOrder,
  HqSupplierRow,
} from './cofteaHqDemoData';

export const POTATO_CORNER_HQ_TOTAL_BRANCHES = 260;

export const POTATO_CORNER_SAMPLE_SNAPSHOT: HqKpiSnapshot = {
  todayRevenue: 14370385,
  yesterdayRevenue: 13263971,
  todayOrders: 76845,
  yesterdayOrders: 73049,
  avgOrderValue: 187,
  activeBranches: 228,
};

export const potatoCornerSampleRevenue: HqWeeklyRevenueItem[] = [
  { day: 'Mon', revenue: 13800000 },
  { day: 'Tue', revenue: 14240000 },
  { day: 'Wed', revenue: 15120000 },
  { day: 'Thu', revenue: 14630000 },
  { day: 'Fri', revenue: 16280000 },
  { day: 'Sat', revenue: 18590000 },
  { day: 'Sun', revenue: 17940000 },
];

export const potatoCornerBranchesToCheck: HqBranchAlert[] = [
  {
    id: 'ort',
    name: 'Potato Corner Ortigas',
    meta: 'Terminal offline · last sync 2h ago',
    status: 'Offline',
  },
  {
    id: 'smn',
    name: 'Potato Corner SM North',
    meta: 'Below target · 85% of daily goal',
    status: 'Needs Attention',
  },
  {
    id: 'grh3',
    name: 'Potato Corner Greenhills 3',
    meta: 'Terminal offline · last sync 2h ago',
    status: 'Offline',
  },
];

export const potatoCornerInventoryAlerts: HqInventoryAlert[] = [
  { id: 'cup', name: 'PC Cups (Regular)', branch: 'Ortigas', qty: 120, level: 'warn' },
  { id: 'lid', name: 'Cup Lids', branch: 'SM North', qty: 180, level: 'warn' },
  { id: 'chi', name: 'Chili Cheese Powder', branch: 'Trinoma', qty: 0, level: 'critical' },
  { id: 'oil', name: 'Fry Oil', branch: 'Greenhills', qty: 3, level: 'critical' },
];

export const potatoCornerLiveOrders: HqLiveOrder[] = [
  {
    id: '4955',
    branch: 'SM Cebu 4',
    items: 'Cheese Mega, BBQ Regular',
    total: 275,
    status: 'NEW',
    time: 'Just now',
  },
  {
    id: '4954',
    branch: 'SM Baguio 11',
    items: 'Sour Cream x2, Chicken Pops',
    total: 365,
    status: 'PREPARING',
    time: '3 min ago',
  },
  {
    id: '4953',
    branch: 'Tacloban 3',
    items: 'Cheese Giga, Iced Tea',
    total: 245,
    status: 'PREPARING',
    time: '6 min ago',
  },
];

export const potatoCornerSampleBranches: HqDisplayBranch[] = [
  {
    id: 'sample-smc4',
    code: 'BR-SMC4',
    name: 'Potato Corner SM Cebu 4',
    address: 'SM City Cebu · Cebu',
    is_active: true,
    franchisee_name: 'Carlo Lim',
    franchisee_phone: '0917 300 6101',
    franchisee_email: 'carlo.lim@potatocorner.ph',
    opening_date: '2026-07-12',
    onboarding_status: 'active',
  },
  {
    id: 'sample-smb11',
    code: 'BR-SMB11',
    name: 'Potato Corner SM Baguio 11',
    address: 'SM Baguio · Cordillera',
    is_active: true,
    franchisee_name: 'Bianca Reyes',
    franchisee_phone: '0928 411 2209',
    franchisee_email: 'bianca.reyes@potatocorner.ph',
    opening_date: '2026-08-18',
    onboarding_status: 'onboarding',
  },
  {
    id: 'sample-ort',
    code: 'BR-ORT',
    name: 'Potato Corner Ortigas',
    address: 'Robinsons Galleria · Pasig City',
    is_active: false,
    franchisee_name: 'Jonas Villanueva',
    franchisee_phone: '0918 552 3310',
    franchisee_email: 'jonas.villanueva@potatocorner.ph',
    opening_date: '2026-06-25',
    onboarding_status: 'suspended',
  },
  {
    id: 'sample-ewc',
    code: 'BR-EWC',
    name: 'Potato Corner Eastwood City',
    address: 'Eastwood Mall · Quezon City',
    is_active: true,
    franchisee_name: 'Nina Mercado',
    franchisee_phone: '0917 902 7741',
    franchisee_email: 'nina.mercado@potatocorner.ph',
    opening_date: '2026-09-04',
    onboarding_status: 'active',
  },
];

export const potatoCornerSampleSuppliers: HqSupplierRow[] = [
  {
    id: 's-pc-001',
    name: 'PC Commissary',
    contact_person: 'Rica Mendoza',
    phone: '+63 917 800 1201',
    email: 'supply@potatocorner.ph',
    address: 'Laguna Technopark, Biñan, Laguna',
    category: 'Flavor Powder & Seasonings',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-002',
    name: 'McCain Philippines',
    contact_person: 'Jonas Villanueva',
    phone: '+63 2 8888 4410',
    email: 'orders.ph@mccain.com',
    address: 'Taguig City, Metro Manila',
    category: 'Frozen Fries & Potatoes',
    is_active: true,
    created_at: null,
  },
  {
    id: 's-pc-003',
    name: 'PackPro Packaging',
    contact_person: 'Lea Domingo',
    phone: '+63 928 441 2290',
    email: 'sales@packpro.ph',
    address: 'Caloocan City, Metro Manila',
    category: 'Cups, Lids & Paper Bags',
    is_active: true,
    created_at: null,
  },
];

export const potatoCornerSampleReports: ReportsSnapshot = {
  summary: {
    revenue: 110480000,
    orders: 591200,
    avgOrderValue: 186.9,
    activeBranches: 228,
    lowStockBranches: 34,
    prevRevenue: 103260000,
    prevOrders: 552400,
  },
  revenueTrend: [
    { label: 'Mon', revenue: 14380000, orders: 76900 },
    { label: 'Tue', revenue: 14820000, orders: 79200 },
    { label: 'Wed', revenue: 15640000, orders: 83700 },
    { label: 'Thu', revenue: 15180000, orders: 81200 },
    { label: 'Fri', revenue: 16910000, orders: 90400 },
    { label: 'Sat', revenue: 18610000, orders: 99500 },
    { label: 'Sun', revenue: 14940000, orders: 80300 },
  ],
  branchRanking: [
    { branchId: 'sample-smc4', branchName: 'Potato Corner SM Cebu 4', franchiseeName: 'Carlo Lim', revenue: 1284000, orders: 6870, avgOrderValue: 186.9, isActive: true },
    { branchId: 'sample-ewc', branchName: 'Potato Corner Eastwood City', franchiseeName: 'Nina Mercado', revenue: 1142000, orders: 6120, avgOrderValue: 186.6, isActive: true },
    { branchId: 'sample-smb11', branchName: 'Potato Corner SM Baguio 11', franchiseeName: 'Bianca Reyes', revenue: 1018000, orders: 5460, avgOrderValue: 186.4, isActive: true },
    { branchId: 'sample-trinoma', branchName: 'Potato Corner Trinoma', franchiseeName: 'Diego Ramos', revenue: 968000, orders: 5180, avgOrderValue: 186.9, isActive: true },
    { branchId: 'sample-mega', branchName: 'Potato Corner Megamall', franchiseeName: 'Hannah Yu', revenue: 921000, orders: 4930, avgOrderValue: 186.8, isActive: true },
    { branchId: 'sample-ort', branchName: 'Potato Corner Ortigas', franchiseeName: 'Jonas Villanueva', revenue: 0, orders: 0, avgOrderValue: 0, isActive: false },
  ],
  paymentMix: [
    { method: 'CASH', orders: 372400, amount: 68900000 },
    { method: 'GCASH', orders: 168900, amount: 32400000 },
    { method: 'CARD', orders: 49900, amount: 9180000 },
  ],
  inventoryStatus: [
    { branchId: 'sample-trinoma', branchName: 'Potato Corner Trinoma', materialName: 'Chili Cheese Powder', unit: 'g', onHandQty: 0, lowStockQty: 2500, level: 'critical' },
    { branchId: 'sample-ghills', branchName: 'Potato Corner Greenhills', materialName: 'Fry Oil', unit: 'L', onHandQty: 6, lowStockQty: 20, level: 'critical' },
    { branchId: 'sample-ort', branchName: 'Potato Corner Ortigas', materialName: 'PC Cups (Regular)', unit: 'pcs', onHandQty: 240, lowStockQty: 500, level: 'warn' },
    { branchId: 'sample-smn', branchName: 'Potato Corner SM North', materialName: 'Cup Lids', unit: 'pcs', onHandQty: 360, lowStockQty: 500, level: 'warn' },
    { branchId: 'sample-smc4', branchName: 'Potato Corner SM Cebu 4', materialName: 'Frozen Fries', unit: 'kg', onHandQty: 180, lowStockQty: 80, level: 'ok' },
    { branchId: 'sample-ewc', branchName: 'Potato Corner Eastwood City', materialName: 'BBQ Powder', unit: 'g', onHandQty: 5200, lowStockQty: 2500, level: 'ok' },
  ],
};

export const POTATO_CORNER_DEMO_DATA_MESSAGE =
  'Showing Potato Corner demo data until live HQ data is available.';

export const POTATO_CORNER_CHART_STROKE = '#008d36';
export const POTATO_CORNER_CHART_FILL_START = 'rgba(0, 141, 54, 0.24)';
export const POTATO_CORNER_CHART_FILL_END = 'rgba(0, 141, 54, 0.0)';
