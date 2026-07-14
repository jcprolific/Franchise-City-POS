# Franchisee Portal Roles — Enterprise Design

Date: 2026-07-09
Status: Implemented (Phase 3)

## Goal

Two franchisee-side roles with clear access boundaries:

| Role | Label | Access |
|------|-------|--------|
| `franchise_owner` | Franchisee | Full franchisee portal + POS, Orders, Inventory, Dashboard |
| `barista` | Barista | **POS, Orders, and view-only Inventory** — no portal, dashboard, or stock edits |

HQ (`hq_admin`) remains separate and unchanged.

## Architecture

```
HQ Admin
  └─ creates branch + provisions franchise_owner (edge: provision-franchise-owner)

Franchisee (franchise_owner)
  └─ /portal hub (all tiles)
  └─ creates barista staff (edge: create-branch-staff, role=barista only)

Barista
  └─ login → /pos (home)
  └─ sidebar: POS + Orders + Inventory (view-only)
  └─ Inventory: stock levels + history; no adjust / reorder
  └─ RLS: branch-scoped pos_order + pos_shift
```

## Backend (Supabase Phase 3)

Migration: `supabase-enterprise-phase3-franchise-roles.sql`

- Role enums: `franchise_owner`, `barista` on `profiles` and `staff_access`
- Legacy `cashier` → `barista` migration
- Helper functions: `current_user_role()`, `current_user_branch_id()`, `is_hq_admin()`, `is_franchise_owner()`, `is_barista()`
- Enterprise RLS:
  - `branch`: HQ insert; owner/barista read scoped
  - `staff_access`: owner creates `barista` only
  - `pos_order` / `pos_shift`: barista branch-scoped; anon preserved for guest demo
  - `profiles`: HQ reads all; owner reads branch staff

## App layer

- `permissions.ts`: `barista` → `['pos', 'orders', 'inventory_view']` (no full `inventory`)
- `canAccessPath` / `Sidebar`: `inventory_view` unlocks `/inventory` nav without write capability
- `InventoryPage`: hides qty editors, reorder, and checkout when role lacks `inventory`
- `App.tsx`: passes `role` via outlet context; syncs `branch_id` from profile on email login
- `StaffManagementPage.tsx`: creates barista staff only

## Test plan

1. Franchisee login → lands on `/portal`, sees all portal tiles + POS nav
2. Franchisee creates barista via Manage Staff
3. Barista login → lands on `/pos`, sidebar shows POS + Orders + Inventory
4. Barista can open `/inventory` and see stock (read-only); cannot adjust or reorder
5. Barista cannot navigate to `/portal` or `/dashboard` (redirected)
6. Barista orders save to their branch only (RLS)
