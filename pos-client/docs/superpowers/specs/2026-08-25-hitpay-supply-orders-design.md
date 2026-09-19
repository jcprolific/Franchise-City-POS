# HitPay Supply Order Payments Design

**Date:** 2026-08-25  
**Product:** Franchise City / Coftea POS (`pos-client`)  
**Supabase:** coftea-pos (`wuthacuizslfsadkwmad`)  
**Reference:** [HitPay Online Payments](https://docs.hitpayapp.com/apis/guide/online-payments)

## Decisions (locked)

| # | Decision |
|---|----------|
| Scope | **Supply orders only** — franchisee raw-material reorders to HQ |
| POS | **No HitPay in POS.** In-store checkout stays manual (cash / GCash ref / card label). |
| Landing | **No payments** on franchise-city-landing |
| Environment | Production HitPay (`https://api.hit-pay.com/v1`) |
| Currency | PHP |
| Checkout UX | Redirect to HitPay hosted checkout page |
| Payment timing | **Pay first** — order reaches HQ only after webhook confirms payment |
| Backend | Supabase Edge Functions (same pattern as `notify-owner-sale`, `create-staff-user`) |
| Bank transfer | Removed from supply checkout in Phase 1; HitPay covers online methods (GCash, card, etc.) |

## Problem

Franchisees place supply orders from **Inventory → Checkout** (`InventoryPage.tsx`). Today they pick GCash or bank transfer, the order is saved as `pending`, and HQ manually verifies payment. There is no online payment capture.

## Goal

When a franchisee checks out a supply order:

1. They are redirected to HitPay to pay in PHP.
2. The order is **not** visible to HQ for fulfillment until payment is confirmed.
3. HitPay webhook marks the order paid and advances it to HQ's normal `pending` queue.

## Out of scope

- POS in-store payments (`POSPage`, `CheckoutModal`, `Cart`)
- Franchise onboarding fees
- Refunds via HitPay API (Phase 2)
- HitPay Drop-in embedded UI (redirect only for Phase 1)
- Landing site checkout

---

## Current state

| Piece | Location | Notes |
|-------|----------|-------|
| Supply checkout UI | `src/pages/InventoryPage.tsx` | Cart drawer, GCash / bank transfer picker, `handlePlaceOrder` |
| Supply order service | `src/lib/supplyOrderService.ts` | Inserts `supply_order` + line items, status `pending` |
| HQ fulfillment | `src/hq/pages/SupplyOrdersPage.tsx` | Status workflow pending → delivered |
| Portal order history | `src/portal/modules/OrderHistoryModule.tsx` | Read-only list |
| Edge functions | `supabase/functions/` | Staff/auth/push only — no payment functions yet |

---

## Payment flow

```
Franchisee (Inventory checkout)
    │
    ▼
create-hitpay-payment (edge function)
    ├─ Validate auth + branch access
    ├─ Insert supply_order (status: pending_payment, payment_status: unpaid)
    ├─ Insert supply_order_item rows
    ├─ POST HitPay /v1/payment-requests
    └─ Return { checkoutUrl, referenceNo }
    │
    ▼
Browser redirect → HitPay checkout
    │
    ├─ Success → redirect_url (success page, informational only)
    │
    └─ HitPay webhook → hitpay-webhook (edge function)
           ├─ Verify Hitpay-Signature (HMAC-SHA256 + salt)
           ├─ Match reference_number → supply_order
           ├─ Set payment_status = paid, paid_at = now()
           └─ Set status = pending (HQ queue)
```

**Important:** Per HitPay docs, never mark an order paid from `redirect_url` alone. Only the webhook (`payment_request.completed`) confirms payment.

---

## Schema migration

Add to `supply_order`:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `payment_status` | text | `'unpaid'` | `unpaid` \| `paid` \| `failed` \| `expired` |
| `hitpay_payment_request_id` | text | null | From HitPay create response `id` |
| `paid_at` | timestamptz | null | Set on webhook |
| `payment_reference` | text | null | HitPay payment id / reference |

Extend `status` enum with **`pending_payment`** (before existing `pending`).

Status lifecycle:

```
pending_payment  ──(webhook paid)──►  pending  ──►  approved  ──►  …  ──►  delivered
                 ──(expired/cancel)──►  cancelled
```

Existing rows: backfill `payment_status = 'paid'` where `status != 'pending_payment'` and created before migration (legacy manual-payment orders).

---

## Edge functions

### `create-hitpay-payment`

- **Auth:** JWT required (franchisee / branch staff with inventory permission)
- **Input:** cart lines, notes, branchId, brandId
- **HitPay request:**
  - `amount` — order total (2 decimal places)
  - `currency` — `PHP`
  - `reference_number` — `reference_no` (e.g. `SO-2026-1234`)
  - `redirect_url` — `https://pos.franchisecity.ph/portal/orders/payment-success`
  - `name`, `email` — from auth profile
  - `purpose` — `Coftea Supply Order {reference_no}`
  - `payment_methods[]` — GCash + card (confirm available methods for PH in HitPay dashboard)
- **Headers:** `X-BUSINESS-API-KEY`, `Content-Type: application/x-www-form-urlencoded`
- **Output:** `{ checkoutUrl, referenceNo, orderId }`

### `hitpay-webhook`

- **Auth:** `--no-verify-jwt`; validate `Hitpay-Signature` header with `HITPAY_SALT`
- **Event:** `payment_request.completed` (registered in HitPay Dashboard → Developers → Webhook Endpoints)
- **Action:** Update matching `supply_order` by `reference_number`; idempotent if already `paid`
- **Response:** `200 OK`

Deploy webhook URL:
```
https://wuthacuizslfsadkwmad.supabase.co/functions/v1/hitpay-webhook
```

---

## Frontend changes

### `InventoryPage.tsx`

- Remove GCash / bank transfer picker from checkout drawer
- Replace **Place order** with **Pay & place order**
- On click: invoke `create-hitpay-payment` → `window.location.href = checkoutUrl`
- Show loading state while creating payment request
- Handle errors (not configured, empty cart, HitPay API failure)

### New routes

| Route | Purpose |
|-------|---------|
| `/portal/orders/payment-success` | Post-redirect confirmation; poll or show "payment processing" until webhook completes |
| `/portal/orders/payment-failed` | Cancelled or failed checkout |

### `SupplyOrdersPage.tsx` (HQ)

- Show **Paid** badge on orders (`payment_status = paid`)
- Hide or separate `pending_payment` orders (franchisee-only, not in HQ queue)
- Optional filter: All / Awaiting payment / Ready to fulfill

### `OrderHistoryModule.tsx` (Portal)

- Show payment status: Awaiting payment / Paid / Cancelled
- **Pay now** link for unpaid `pending_payment` orders (reuse `create-hitpay-payment` with existing order id)

---

## Secrets (Supabase project secrets)

```
HITPAY_API_KEY=<production key from HitPay Dashboard → Settings → API Keys>
HITPAY_SALT=<production salt from HitPay Dashboard>
HITPAY_BASE_URL=https://api.hit-pay.com/v1
HITPAY_REDIRECT_URL=https://pos.franchisecity.ph/portal/orders/payment-success
```

**Never** expose API key or salt in client env (`VITE_*`).

---

## HitPay dashboard setup (merchant checklist)

1. Production API key + salt copied to Supabase secrets
2. Webhook endpoint registered: `hitpay-webhook` URL above
3. Subscribe to event: `payment_request.completed`
4. Enable PHP payment methods (GCash, cards, etc.) for Philippines
5. Test one small live payment before announcing to franchisees

---

## Phase 1 deliverables

1. SQL migration for `supply_order` payment columns + `pending_payment` status
2. Edge function `create-hitpay-payment`
3. Edge function `hitpay-webhook`
4. Inventory checkout → HitPay redirect
5. Payment success / failed pages
6. HQ + portal payment status display
7. Deploy + register webhook on production HitPay

## Phase 2 (later)

- HitPay refunds when HQ cancels a paid order
- Retry / pay-now for expired `pending_payment` orders
- Email receipt to franchisee on webhook
- Payment analytics in HQ reports

## Test plan

- [ ] Franchisee with inventory access can checkout and reach HitPay page
- [ ] Unpaid order stays `pending_payment`; HQ does not see it in fulfill queue
- [ ] Webhook with valid signature marks order `paid` + `pending`
- [ ] Webhook with invalid signature returns 401; order unchanged
- [ ] Duplicate webhook is idempotent (no double-update)
- [ ] POS checkout unchanged — no HitPay calls from POS routes
- [ ] Success redirect page shows correct reference number

## Files to touch (implementation)

| Area | Files |
|------|-------|
| Migration | `supabase/migrations/…_supply_order_hitpay.sql` (new) |
| Edge functions | `supabase/functions/create-hitpay-payment/index.ts`, `supabase/functions/hitpay-webhook/index.ts` |
| Checkout UI | `src/pages/InventoryPage.tsx`, `src/pages/InventoryPage.css` |
| Service | `src/lib/supplyOrderService.ts` |
| Portal pages | `src/portal/modules/OrderHistoryModule.tsx`, new payment result pages |
| HQ | `src/hq/pages/SupplyOrdersPage.tsx` |
| Routes | `src/App.tsx` |
