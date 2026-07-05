# Franchisee Portal (inside pos-client) — Design Spec

Date: 2026-07-06 (revised same day: build inside `pos-client`, NOT the
standalone `franchisee-client` scaffold)
Repo: `COFTEA POS` (`pos-client`)

## Goal

When a **franchisee** logs in to the existing Coftea app
(coftea-pos.vercel.app — what the landing page's "Franchisee Portal" button
opens), they land on a branded welcome hub:

> WELCOME COFTEA CAFE {Branch}!

followed by module tiles: 📢 Announcements, 📚 Operations Manual, 🛒 Order
Products, 📦 Inventory, 💰 Sales Dashboard, 📈 Reports, 🎥 Training Videos,
📋 Download Forms, 🎫 Support Tickets, plus 🖥️ POS Terminal.

Tiles reuse the app's **existing pages** wherever they exist. No separate
app, no duplicated dashboard.

## Background / current state (verified 2026-07-06)

- `pos-client` areas today: POS shell (`/pos`, `/orders`, `/inventory`,
  `/dashboard`, `/promotions`) and HQ shell (`/hq/*`). Roles: `cashier` and
  `hq_admin`, resolved from `public.profiles` after email login; guest/PIN
  logins are cashiers. After login: `hq_admin → /hq`, everyone else → `/pos`.
- Supabase project `nooqvrikraglddxkxrul` (shared MN+LA ERP + Coftea DB).
- `public.profiles.role` check allows only `'cashier' | 'hq_admin'`.
- `public.branch` has `franchisee_email`, `franchisee_name`, `business_name`,
  `branch_code`, `onboarding_status` (per `supabase-franchisee-fields.sql`).
- `DashboardPage` (the Sales Dashboard): live KPIs + Recent Transactions from
  `pos_order` via `fetchLiveDashboardData(branchValue?)` (branch filtering
  already supported) + realtime; Weekly Sales / Top Sellers / Low Stock are
  sample data.
- `InventoryPage` already lets a branch place supply orders to HQ
  (`placeSupplyOrder`), tracked on the HQ Supply Orders page.
- A standalone `franchisee-client/` scaffold exists, untracked and never
  deployed. **Decision: abandoned** — delete the directory as part of this
  work (it only contains placeholder code).

## Approved decisions

1. Build the portal **inside `pos-client`** — enhance the existing app.
2. **Email login = franchisee**: accounts with `profiles.role = 'franchisee'`
   land on the welcome hub. Cashiers (guest/PIN) still go straight to `/pos`;
   HQ admins still go to `/hq`.
3. **Hub + existing pages + stubs**: tiles open existing pages where they
   exist; the 5 new content modules open branded "Coming Soon" pages.
4. Hub layout: full-page tile grid, Coftea POS branding (cream background,
   orange accents, serif display headings, warm cards).
5. For franchisees, **Dashboard comes before POS** in navigation order.

## Tile → destination map (v1)

| Tile | Destination |
| --- | --- |
| 📢 Announcements | `/portal/announcements` — Coming Soon |
| 📚 Operations Manual | `/portal/manual` — Coming Soon |
| 🛒 Order Products | `/inventory` (existing supply-order flow lives there) |
| 📦 Inventory | `/inventory` (existing) |
| 💰 Sales Dashboard | `/dashboard` (existing) |
| 📈 Reports | `/portal/reports` — Coming Soon (HQ reports stay HQ-gated) |
| 🎥 Training Videos | `/portal/training` — Coming Soon |
| 📋 Download Forms | `/portal/forms` — Coming Soon |
| 🎫 Support Tickets | `/portal/support` — Coming Soon |
| 🖥️ POS Terminal | `/pos` (existing) |

## Architecture (pos-client changes)

```
src/
  App.tsx                add 'franchisee' role; after-login redirect → /portal;
                         RequireFranchisee guard; /portal routes
  portal/
    PortalHubPage.tsx    welcome + 10 tiles (+ .css)
    ComingSoonPage.tsx   shared stub, title/icon from route config (+ .css)
  lib/
    franchiseeBranch.ts  resolve branch by auth email → { branchName, branchId }
  components/Sidebar.tsx franchisee tweaks (see Navigation)
```

- `/portal` renders inside the existing `PosShell` so the franchisee keeps the
  familiar sidebar/header chrome and can navigate anywhere without dead ends.
- `resolveUserRole` returns `'franchisee'` when `profiles.role` says so.
  Redirect after login: `hq_admin → /hq`, `franchisee → /portal`,
  `cashier → /pos`. Direct `/portal` access by cashiers → redirect `/pos`.
- Welcome name: `branch.franchisee_email = login email` (case-insensitive,
  first match) → `branch.name`; fallback `business_name`, then a generic
  welcome + "contact HQ to link your branch" note. Branch id is kept in
  context for later branch-scoped dashboard filtering.

## Navigation (franchisee only)

- Sidebar gains a **Portal Home** item at the top, and for franchisees the
  order is: Portal Home, Dashboard, POS, Orders, Inventory, Promotions
  (Dashboard before POS, per request). Cashier sidebar stays unchanged.
- The hub is the franchisee's post-login landing page; the sidebar makes the
  hub reachable from every existing page.

## Auth & SQL

One idempotent file `supabase-franchisee-portal.sql` (run once in the SQL
editor):
- extend `profiles.role` check to `('cashier','hq_admin','franchisee')`
- commented example: create/promote a franchisee user by email and link
  `branch.franchisee_email`

No RLS changes: franchisees use the same read paths cashiers already have.

## Error handling

- Wrong password → existing LoginPage inline error (unchanged).
- Franchisee with no matching `branch` row → hub still opens with fallback
  welcome + notice.
- `/portal` visited while logged out → `/login` (existing RequireAuth).

## Out of scope (later phases)

- Real content modules: Announcements, Ops Manual, Training Videos, Forms,
  Support Tickets (each its own phase: tables + HQ authoring UI).
- Branch-scoped dashboard filtering wired to the resolved branch id (needs
  `pos_order.branch_id` to be populated consistently first).
- Franchisee-specific Reports page.
- Multi-branch franchisees (v1 = first matching branch).
- Landing-page copy changes (login flow/URL unchanged — nothing to update).

## Success criteria

- Email login with role `franchisee` lands on "WELCOME COFTEA CAFE {BRANCH}!"
  with all 10 tiles, Coftea-branded; tiles route per the map above.
- Guest/PIN cashier login still lands on `/pos` exactly as today; HQ login
  unchanged. No regressions for existing roles.
- Franchisee sidebar shows Portal Home first and Dashboard before POS.
- The 5 content tiles open branded Coming Soon pages with a back-to-hub link.
- `franchisee-client/` directory removed.
- `npm run build` passes in `pos-client`.
