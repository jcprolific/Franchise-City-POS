# Barista → Franchisee Order Sync Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Barista punches persist to `pos_order` and appear immediately in franchisee sales (Option A).

**Architecture:** Fix broken `cashier_id` FK to `profiles`; centralize paid-sale eligibility; harden POS checkout when branch/sync fails.

**Tech Stack:** Supabase Postgres, Vite/React pos-client, Vitest

---

### Task 1: Paid-sale eligibility helper + tests

**Files:**
- Create: `pos-client/src/lib/saleEligibility.ts`
- Create: `pos-client/src/lib/saleEligibility.test.ts`

- [ ] Write failing tests for Option A rules
- [ ] Implement `isCountablePaidSale(status, paymentStatus)`
- [ ] Wire into franchise reports, dashboard, product sales, HQ KPIs

### Task 2: Database migration

**Files:**
- Create: `supabase-pos-order-cashier-profiles-fk.sql`
- Apply via Supabase `apply_migration`

- [ ] Drop `pos_order_cashier_id_fkey`
- [ ] Add FK to `profiles(id)` ON DELETE SET NULL

### Task 3: POS checkout hardening

**Files:**
- Modify: `pos-client/src/pages/POSPage.tsx`
- Modify: `pos-client/src/lib/branchContext.ts` (export seed-branch detector if needed)

- [ ] Block email-staff checkout without real linked branch
- [ ] On sync failure (non-offline): keep cart, show hard error

### Task 4: Verify

- [ ] Run vitest for touched suites
- [ ] Confirm FK constraint in remote DB
