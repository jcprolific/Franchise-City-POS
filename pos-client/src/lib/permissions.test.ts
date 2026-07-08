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

  it('maps legacy branch_manager to manager', () => {
    expect(normalizeRole('branch_manager')).toBe('manager');
  });

  it('defaults unknown roles to cashier', () => {
    expect(normalizeRole('unknown')).toBe('cashier');
  });
});

describe('hasPermission', () => {
  it('grants franchise owner full portal access', () => {
    expect(hasPermission('franchise_owner', 'portal_staff')).toBe(true);
    expect(hasPermission('franchise_owner', 'portal_business')).toBe(true);
  });

  it('grants cashier branch terminal access including portal read', () => {
    expect(hasPermission('cashier', 'pos')).toBe(true);
    expect(hasPermission('cashier', 'inventory_view')).toBe(true);
    expect(hasPermission('cashier', 'inventory')).toBe(false);
    expect(hasPermission('cashier', 'portal')).toBe(true);
    expect(hasPermission('cashier', 'dashboard')).toBe(true);
    expect(hasPermission('cashier', 'portal_staff')).toBe(false);
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
    expect(homePathForRole('manager')).toBe('/dashboard');
    expect(homePathForRole('cashier')).toBe('/pos');
    expect(homePathForRole('inventory_staff')).toBe('/inventory');
  });
});

describe('canAccessPath', () => {
  it('blocks cashier from owner-only portal pages', () => {
    expect(canAccessPath('cashier', '/portal/staff')).toBe(false);
    expect(canAccessPath('cashier', '/portal/business')).toBe(false);
  });

  it('allows cashier on portal hub and reports', () => {
    expect(canAccessPath('cashier', '/portal')).toBe(true);
    expect(canAccessPath('cashier', '/portal/reports')).toBe(true);
    expect(canAccessPath('cashier', '/dashboard')).toBe(true);
  });

  it('allows owner on business info page', () => {
    expect(canAccessPath('franchise_owner', '/portal/business')).toBe(true);
  });
});
