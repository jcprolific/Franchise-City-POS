# Franchisee Branch Inventory Page — Design Spec

Date: 2026-07-03
Repo: `COFTEA POS` (pos-client)

## Goal

Rebuild the POS **Inventory** page so a logged-in Coftea franchisee sees the
**complete real Coftea raw-materials list** (from the 2026 PO Form) and the
**current stock levels for their branch**, backed by Supabase and editable.

## Background / current state

- The current `InventoryPage.tsx` renders 100% static placeholder data
  (`inventoryDashboardData.ts` — Potato Corner-style items). Not Coftea, not persisted.
- The Supabase project (`nooqvrikraglddxkxrul`) is a **shared MN+LA garment/ERP + Artisan Cafe**
  database. It contains a `brands` table with a `coftea` brand
  (`a1000000-0000-4000-8000-000000000002`).
- The tables the pos-client code already expects (`raw_material`, `branch`,
  `branch_inventory`, `menu_*`) were **never deployed** to this project, so the HQ
  catalog + inventory features are all running on static fallback today.
- The ERP's own `products` (35k rows) / `inventory` / `locations` / `cafe_*` tables
  belong to a **different business** and must not be used for Coftea supplies.

## Source of truth for materials

`COFTEA_PO_FORM_2026` (saved at `franchise-city-landing/docs/data/COFTEA_PO_FORM_2026.xlsx`).
68 items across 4 categories, each with packaging + unit price:

| Category | Items |
| --- | --- |
| COF/TEA SYRUPS | 15 |
| COF/TEA FRUIT SERIES | 7 |
| COF/TEA POWDERED BASE | 9 |
| COF/TEA SINKERS AND ETC | 37 |

## Decisions (approved)

1. **Backend**: dedicated Coftea supply tables, isolated from the MN+LA ERP.
2. **Branch identity**: single default branch — "Coftea — BGC Central" (matches the
   brand config). Structured so a branch picker can be added later.
3. **Editable**: franchisee can adjust / set stock counts; persisted to Supabase.

## Data model (new Supabase tables, brand-scoped)

`raw_material` (extends what pos-client already reads):
- `id uuid pk`, `brand_id uuid → brands`, `name text`, `category text`,
  `packaging text`, `unit text`, `price numeric`, `icon text`,
  `on_hand_qty numeric` (brand baseline), `low_stock_qty numeric`,
  `sort_order int`, timestamps. Unique `(brand_id, name)`.

`branch`:
- `id uuid pk`, `brand_id uuid → brands`, `name text`, `code text`,
  `is_active bool`, timestamps.

`branch_inventory`:
- `id uuid pk`, `brand_id`, `branch_id → branch`, `raw_material_id → raw_material`,
  `on_hand_qty numeric`, `low_stock_qty numeric`, `updated_at`.
  Unique `(branch_id, raw_material_id)`.

RLS: open read+write for anon/authenticated (demo parity with existing setup SQL).

Seed: 68 materials for the Coftea brand; one branch
`b1000000-0000-4000-8000-000000000001` = "Coftea — BGC Central"; a
`branch_inventory` row per material with a realistic starting `on_hand_qty` and a
per-item `low_stock_qty`.

## App layer (pos-client)

- `src/data/cofteaRawMaterials.ts` — local fallback catalog (the 68 items) used when
  Supabase is unconfigured/empty, mirroring the "try Supabase → fallback static" pattern.
- `src/lib/branchContext.ts` — resolves the current branch id (default seeded branch,
  stored in localStorage; future-proofed for a picker).
- `src/lib/inventoryService.ts`:
  - `fetchBranchInventory(brandDbId, branchId)` → joins `branch_inventory` + `raw_material`.
  - `updateBranchStock(branchInventoryId, onHandQty)` → persists an edit.
  - Returns `null` on error/empty so the page can fall back to local data.
- `src/pages/InventoryPage.tsx` rebuild:
  - Grouped by category (Syrups / Fruit Series / Powdered Base / Sinkers & Supplies),
    with category filter chips + search.
  - Each item shows name, packaging, unit price, on-hand qty + unit, low-stock state.
  - Header: total items, low-stock count, total inventory value (qty × price).
  - Editable: +/- step and an inline "set count" input; writes to Supabase (optimistic),
    reverts on failure. Local-only when unconfigured.
  - Loading + empty + offline/fallback states.

## Out of scope (next iteration)

- Franchisee supply **ordering** page (order raw materials from HQ).
- Real per-user auth → branch mapping / multi-branch picker.
- Automatic stock deduction from POS sales.

## Success criteria

- Inventory page lists all 68 Coftea materials with packaging + price, grouped by category.
- Stock levels load from `branch_inventory` for the BGC Central branch.
- Editing a count persists to Supabase and survives reload.
- With Supabase unconfigured, the page still renders the full catalog from local data.
- pos-client typechecks/builds with no new lint errors.
