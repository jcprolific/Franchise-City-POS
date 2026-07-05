# Franchisee Portal (franchisee-client) — Design Spec

Date: 2026-07-06
Repo: `COFTEA POS` (`franchisee-client`)

## Goal

Turn the scaffolded `franchisee-client` app into the real **Coftea Franchisee
Portal**: a branded welcome hub that a franchisee reaches after logging in with
their branch email, showing the sequence:

> WELCOME COFTEA CAFE {Branch}!

followed by module tiles: 📢 Announcements, 📚 Operations Manual, 🛒 Order
Products, 📦 Inventory, 💰 Sales Dashboard, 📈 Reports, 🎥 Training Videos,
📋 Download Forms, 🎫 Support Tickets, plus 🖥️ POS Terminal.

The **Sales Dashboard** is the first fully built module — an in-portal version
of the pos-client Dashboard page (KPI cards, Weekly Sales, Top Sellers,
Recent Transactions, Low Stock Alert), scoped to the franchisee's branch.

## Background / current state (verified 2026-07-06)

- `franchisee-client/` exists but is **untracked in git**: a single-file React
  app (`src/App.tsx`) with a fake login (any branch name enters) and a 9-tile
  grid already matching the desired module list. Dependencies installed:
  react 19, react-router-dom 7, @supabase/supabase-js, lucide-react, vite 8.
- `pos-client` uses Supabase project **`nooqvrikraglddxkxrul`** (shared MN+LA
  ERP + Coftea database) via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in
  `.env.local`. `franchisee-client` has no `.env` yet.
- `public.profiles` (per `supabase-role-setup.sql`): `role` check allows only
  `'cashier' | 'hq_admin'` — pos-client resolves roles from it.
- `public.branch` has franchisee registration fields (per
  `supabase-franchisee-fields.sql`): `franchisee_name`, `franchisee_email`,
  `business_name`, `branch_code`, `onboarding_status`, etc.
- pos-client `DashboardPage.tsx`: KPIs + Recent Transactions are **live** from
  `pos_order` via `fetchLiveDashboardData(branchValue?)` (already supports
  branch filtering) with realtime refresh; Weekly Sales, Top Sellers, and Low
  Stock Alert render **sample data** (`inventoryDashboardData.ts`).
- The pos-client Dashboard shows Potato Corner-style sample content (Cheese,
  Mega Fries…); Coftea real inventory work is specced separately in
  `2026-07-03-franchisee-inventory-page.md`.

## Approved decisions

1. Enhance the **existing `franchisee-client`** app in place — no new custom
   pages inside pos-client. It remains a standalone app (own login, own deploy).
2. **Real Supabase email login** against the same project pos-client uses.
   Role `franchisee` required to enter.
3. **Hub + stubs first**: welcome hub with all 10 tiles; the 5 new content
   modules (Announcements, Ops Manual, Training, Forms, Support) open branded
   "Coming Soon" pages; Inventory / Order Products / Reports / POS Terminal
   open the live POS app; **Sales Dashboard opens a real in-portal page**.
4. Layout: full-page tile grid (Option A — what the scaffold already is),
   restyled with Coftea POS branding (cream background, orange accents, warm
   card style).
5. Sales Dashboard is built **first**, before any POS-app enhancements.

## Architecture

```
franchisee-client/
  src/
    main.tsx              BrowserRouter + AuthProvider
    App.tsx               routes
    lib/
      supabase.ts         client from VITE_SUPABASE_URL/ANON_KEY (copy of pos-client pattern)
      withTimeout.ts      copied from pos-client
      timezone.ts         copied from pos-client
      dashboardRealtime.ts copied from pos-client (fetchLiveDashboardData)
      portalAuth.ts       login, session persistence, role + branch resolution
      posUrl.ts           VITE_POS_URL, fallback https://coftea-pos.vercel.app
    data/
      dashboardSamples.ts sample weekly sales / top sellers / low stock (Coftea-flavored)
    pages/
      LoginPage.tsx       email + password
      HubPage.tsx         welcome + 10 tiles
      DashboardPage.tsx   in-portal sales dashboard
      ComingSoonPage.tsx  shared stub (title + icon via route config)
    components/           shared header (logo, branch, logout)
```

Routes: `/login`, `/` (hub), `/dashboard`, `/announcements`, `/manual`,
`/training`, `/forms`, `/support` (stubs). Tiles for Inventory, Order
Products, Reports, POS Terminal are external links (new tab) to the POS app.
All non-login routes are guarded: no session → redirect to `/login`.

## Auth & branch resolution

- `supabase.auth.signInWithPassword({ email, password })`.
- After login, read `profiles.role` for the user:
  - `franchisee` → enter portal.
  - anything else → sign out + message "This login is for franchisees. Use the
    POS app for cashier/HQ access."
- Branch: `select * from branch where lower(franchisee_email) = lower(user.email)`
  (first match). Welcome shows `branch.name` (e.g. "BGC Central"); fallback to
  `business_name`, then the email, with a "contact HQ" note if no branch found.
- Session persisted by supabase-js (localStorage); Log Out signs out and
  returns to `/login`.

One idempotent SQL file `supabase-franchisee-portal.sql` (run once in the SQL
editor):
- extend `profiles.role` check to `('cashier','hq_admin','franchisee')`
- promote-by-email example block (commented, with instructions)
- commented instructions for creating a franchisee auth user + linking
  `branch.franchisee_email`

## Sales Dashboard module (first full module)

Port of pos-client `DashboardPage` with the same layout and cards:
- KPI row: Today's Sales, Orders, Avg Order Value, Top Flavor.
- Weekly Sales bar chart; Top Sellers donut; Recent Transactions table;
  Low Stock Alert list.
- Live data: `fetchLiveDashboardData(branchValue)` + `pos_order` realtime
  channel — **passing the resolved branch id** so a franchisee only sees their
  branch's KPIs/transactions. If the branch id is unknown, fall back to
  unfiltered totals (single-branch reality today).
- Weekly Sales / Top Sellers / Low Stock stay sample data in v1 (same as the
  POS app today), relabeled to Coftea items. Real per-branch aggregates are a
  later phase (after the Coftea inventory tables from the 2026-07-03 spec land).
- Status badges: Syncing / Live / cached-fallback, same behavior as pos-client.

## Branding

Match the Coftea POS look: cream `#f5efe6`-family background, orange accent,
dark-brown text, serif display for headings (same font stack as pos-client
CSS), warm rounded cards with soft shadows. Login page gets the same
treatment (logo circle, centered card).

## Config / env

`franchisee-client/.env.local` (git-ignored) + `.env.example` (committed):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — same values as pos-client.
- `VITE_POS_URL` — optional, defaults to `https://coftea-pos.vercel.app`.
Missing Supabase env → login page shows a clear setup message (pos-client
pattern) instead of crashing.

## Error handling

- Wrong credentials → inline error under the form.
- Non-franchisee role → friendly denial message (and signed out).
- No matching branch row → portal still opens with fallback welcome + notice.
- Dashboard fetch failure/timeout → cached/sample values + warning badge.

## Out of scope (later phases)

- Real content for Announcements, Ops Manual, Training Videos, Forms, Support
  Tickets (each becomes its own phase; tables + HQ authoring UI).
- In-portal Inventory / Order Products / Reports (v1 links to POS app).
- Multi-branch franchisees (v1 = first matching branch).
- Deployment as a Vercel project + pointing the landing "Franchisee Portal"
  link at it (done after the portal works locally).

## Success criteria

- Franchisee with role `franchisee` logs in with email/password and sees
  "WELCOME COFTEA CAFE {BRANCH}!" with all 10 tiles, Coftea-branded.
- Cashier/HQ accounts cannot enter; wrong passwords show an inline error.
- Sales Dashboard renders in-portal with live branch-scoped KPIs and
  transactions when `pos_order` has data, sample data otherwise.
- The 5 content tiles open branded Coming Soon pages; POS-linked tiles open
  the POS app in a new tab.
- `npm run build` (tsc + vite) passes in `franchisee-client`.
