/** Canonical app roles — mirrors public.profiles.role after migration. */
export type UserRole =
  | 'hq_admin'
  | 'franchise_owner'
  | 'barista'
  | 'manager'
  | 'supervisor'
  | 'cashier'
  | 'inventory_staff';

/** Legacy DB values mapped on login. */
const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  franchisee: 'franchise_owner',
  branch_manager: 'manager',
  cashier: 'barista',
};

export type Capability =
  | 'portal'
  | 'portal_reports'
  | 'portal_staff'
  | 'portal_manual'
  | 'portal_orders'
  | 'portal_business'
  | 'pos'
  | 'orders'
  | 'inventory'
  | 'inventory_view'
  | 'dashboard'
  | 'promotions'
  | 'hq';

const ALL_CAPABILITIES: Capability[] = [
  'portal',
  'portal_reports',
  'portal_staff',
  'portal_manual',
  'portal_orders',
  'portal_business',
  'pos',
  'orders',
  'inventory',
  'dashboard',
  'promotions',
  'hq',
];

const ROLE_CAPABILITIES: Record<UserRole, Capability[] | '*'> = {
  hq_admin: '*',
  /** Franchisee (owner) — full franchisee portal + branch operations. */
  franchise_owner: '*',
  /** Barista — POS, Orders, and view-only Inventory. No portal, dashboard, or stock edits. */
  barista: ['pos', 'orders', 'inventory_view'],
  manager: [
    'portal',
    'portal_reports',
    'portal_manual',
    'portal_orders',
    'pos',
    'orders',
    'inventory',
    'dashboard',
    'promotions',
  ],
  supervisor: [
    'portal',
    'portal_manual',
    'portal_orders',
    'pos',
    'orders',
    'inventory',
    'dashboard',
    'promotions',
  ],
  cashier: ['pos', 'orders', 'inventory_view'],
  inventory_staff: [
    'portal',
    'portal_manual',
    'portal_orders',
    'portal_reports',
    'dashboard',
    'inventory',
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  hq_admin: 'HQ Admin',
  franchise_owner: 'Franchisee',
  barista: 'Barista',
  manager: 'Manager',
  supervisor: 'Supervisor',
  cashier: 'Barista',
  inventory_staff: 'Inventory Staff',
};

/** Staff roles a franchisee may create via the portal. */
export type BranchStaffRole = 'barista';

export const BRANCH_STAFF_ROLE_LABELS: Record<BranchStaffRole, string> = {
  barista: 'Barista',
};

export function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return 'barista';
  if (raw in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[raw as keyof typeof LEGACY_ROLE_MAP];
  }
  if (raw in ROLE_LABELS) {
    return raw as UserRole;
  }
  return 'barista';
}

export function hasPermission(role: UserRole, capability: Capability): boolean {
  const caps = ROLE_CAPABILITIES[role];
  if (caps === '*') return capability !== 'hq' || role === 'hq_admin';
  if (capability === 'hq') return false;
  return caps.includes(capability);
}

export function getCapabilities(role: UserRole): Capability[] {
  const caps = ROLE_CAPABILITIES[role];
  if (caps === '*') {
    return role === 'hq_admin'
      ? [...ALL_CAPABILITIES]
      : ALL_CAPABILITIES.filter((c) => c !== 'hq');
  }
  return caps;
}

export function homePathForRole(role: UserRole): string {
  if (role === 'hq_admin') return '/hq';
  if (role === 'franchise_owner') return '/portal';
  if (role === 'manager' || role === 'supervisor') return '/dashboard';
  if (role === 'inventory_staff') return '/inventory';
  if (role === 'barista' || role === 'cashier') return '/pos';
  return '/pos';
}

/** Route prefix → required capability. */
export const ROUTE_CAPABILITY: Record<string, Capability> = {
  '/hq': 'hq',
  '/portal/staff': 'portal_staff',
  '/portal/business': 'portal_business',
  '/portal/reports': 'portal_reports',
  '/portal/manual': 'portal_manual',
  '/portal/orders': 'portal_orders',
  '/portal': 'portal',
  '/pos': 'pos',
  '/orders': 'orders',
  '/inventory': 'inventory',
  '/dashboard': 'dashboard',
  '/eod-report': 'dashboard',
  '/promotions': 'promotions',
};

export function capabilityForPath(pathname: string): Capability | null {
  const sorted = Object.keys(ROUTE_CAPABILITY).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return ROUTE_CAPABILITY[prefix];
    }
  }
  return null;
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const cap = capabilityForPath(pathname);
  if (!cap) return true;
  if (cap === 'inventory' && !hasPermission(role, 'inventory')) {
    return hasPermission(role, 'inventory_view');
  }
  return hasPermission(role, cap);
}

export function isPortalRole(role: UserRole): boolean {
  return hasPermission(role, 'portal');
}

export function isFranchiseOwner(role: UserRole): boolean {
  return role === 'franchise_owner';
}

export function isBarista(role: UserRole): boolean {
  return role === 'barista' || role === 'cashier';
}
