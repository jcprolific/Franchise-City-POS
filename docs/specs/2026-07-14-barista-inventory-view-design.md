# Barista Inventory View-Only Access

Date: 2026-07-14
Status: Implemented

## Goal

Baristas can **see** branch inventory (stock levels, low stock, movement history) without adjusting counts or placing supply orders.

## Approach

Reuse the existing `inventory_view` capability:

| Capability | Barista | Franchisee / Manager |
|------------|---------|----------------------|
| `inventory_view` | Yes | Via `*` / `inventory` |
| `inventory` (write + reorder) | No | Yes |

## Changes

1. **`permissions.ts`** — `barista` (and legacy `cashier`) gain `inventory_view`
2. **`InventoryPage.tsx`** — `canManageInventory = hasPermission(role, 'inventory')`; read-only qty UI when false
3. **`App.tsx`** — outlet context includes `role` so Inventory can gate UI
4. **Tests** — barista may access `/inventory`; still lacks `inventory`

No Supabase RLS migration required: `branch_inventory` already allows authenticated reads; write UI is client-gated.

## Out of scope

- Barista stock adjustments
- Barista supply reorder / checkout
- New roles or staff-create options
