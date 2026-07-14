# Barista → Franchisee Order Sync Fix

**Date:** 2026-07-14  
**Status:** Approved — implement

## Problem

Barista punches create `audit_log` rows with `synced: false` but never land in `pos_order`. Franchisee reports stay empty.

Root cause: `pos_order.cashier_id` FK references empty legacy `pos_user`, while the app writes `auth.users` / `profiles.id`. Insert fails.

Secondary: franchise reports only count `COMPLETED` + `PAID`, so even synced punches (`status: NEW`) would not show in sales.

## Decision (Option A)

Paid orders count toward franchisee sales **immediately**, regardless of kitchen status (`NEW` / `PREPARING` / `READY` / `COMPLETED`). Exclude `VOIDED` and `REFUNDED`.

## Solution

1. **DB:** Retarget `cashier_id` FK → `profiles(id)` ON DELETE SET NULL.
2. **App write path:** Require real `branch_id` + `brand_id` for email staff; hard-fail sync errors (do not pretend success).
3. **Reports / dashboard / product sales:** Shared paid-sale eligibility = PAID and not void/refund.
4. **Tests:** Eligibility helper + insert payload still stamps cashier/branch/brand.

## Out of scope

- Reviving `pos_user` as a parallel identity system
- Backfilling historical null-branch April orders
- Portal “Order History” (supply orders, not POS sales)
