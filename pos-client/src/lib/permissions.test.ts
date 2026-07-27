import { describe, expect, it } from 'vitest';
import {
  canAccessPath,
  hasPermission,
  homePathForRole,
  normalizeRole,
} from './permissions';

describe('normalizeRole', () => {
  it('maps legacy franchisee to franchise_owner', () => {
    expect(normalizeRole('franchisee')).toBe('franchise_owner');
  });

  it('maps legacy cashier to barista', () => {
    expect(normalizeRole('cashier')).toBe('barista');
  });

  it('maps legacy branch_manager to manager', () => {
    expect(normalizeRole('branch_manager')).toBe('manager');
  });

  it('defaults unknown roles to barista', () => {
    expect(normalizeRole('unknown')).toBe('barista');
  });
});

describe('hasPermission', () => {
  it('grants franchise owner full portal access', () => {
    expect(hasPermission('franchise_owner', 'portal_staff')).toBe(true);
    expect(hasPermission('franchise_owner', 'portal_business')).toBe(true);
    expect(hasPermission('franchise_owner', 'pos')).toBe(true);
    expect(hasPermission('franchise_owner', 'inventory')).toBe(true);
  });

  it('grants barista POS, Orders, view-only Inventory, and EOD', () => {
    expect(hasPermission('barista', 'pos')).toBe(true);
    expect(hasPermission('barista', 'orders')).toBe(true);
    expect(hasPermission('barista', 'inventory_view')).toBe(true);
    expect(hasPermission('barista', 'eod')).toBe(true);
    expect(hasPermission('barista', 'portal')).toBe(false);
    expect(hasPermission('barista', 'portal_staff')).toBe(false);
    expect(hasPermission('barista', 'dashboard')).toBe(false);
    expect(hasPermission('barista', 'inventory')).toBe(false);
  });

  it('grants manager sales and inventory', () => {
    expect(hasPermission('manager', 'pos')).toBe(true);
    expect(hasPermission('manager', 'inventory')).toBe(true);
    expect(hasPermission('manager', 'portal_staff')).toBe(false);
  });
});

describe('homePathForRole', () => {
  it('routes each role to the correct home', () => {
    expect(homePathForRole('franchise_owner')).toBe('/portal');
    expect(homePathForRole('barista')).toBe('/pos');
    expect(homePathForRole('cashier')).toBe('/pos');
    expect(homePathForRole('manager')).toBe('/dashboard');
    expect(homePathForRole('inventory_staff')).toBe('/inventory');
  });
});

describe('canAccessPath', () => {
  it('blocks barista from all portal pages', () => {
    expect(canAccessPath('barista', '/portal')).toBe(false);
    expect(canAccessPath('barista', '/portal/staff')).toBe(false);
    expect(canAccessPath('barista', '/portal/business')).toBe(false);
    expect(canAccessPath('barista', '/portal/reports')).toBe(false);
  });

  it('allows barista on POS, Orders, Inventory (view), and EOD', () => {
    expect(canAccessPath('barista', '/pos')).toBe(true);
    expect(canAccessPath('barista', '/orders')).toBe(true);
    expect(canAccessPath('barista', '/inventory')).toBe(true);
    expect(canAccessPath('barista', '/eod-report')).toBe(true);
    expect(canAccessPath('barista', '/dashboard')).toBe(false);
  });

  it('allows franchise owner on all portal and branch pages', () => {
    expect(canAccessPath('franchise_owner', '/portal')).toBe(true);
    expect(canAccessPath('franchise_owner', '/portal/business')).toBe(true);
    expect(canAccessPath('franchise_owner', '/pos')).toBe(true);
  });
});
