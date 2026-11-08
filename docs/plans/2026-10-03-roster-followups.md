# Roster import follow-ups (not in first pass)

The 2025 all-brand Excel workbook (`!!!UPDATED ALL BRAND ROSTER 2025.xlsx`) contains more than the five per-brand roster sheets imported into `public.branch`. Track these as separate HQ workflows.

## Pipeline / pre-store sheets

- **EXPO FRANCHISEE** (~64 rows): Buy-1-Take-1 deals, mixed brands, LOI/contract pipeline. Merge into a CRM-style pipeline (person → brand intent → payment → contract), not `branch` until a store exists.
- **NEW FRANCHISEES** (~121 rows): Many incomplete rows; overlap with EXPO. Deduplicate by email + brand before insert.
- **LOIs** (~13 rows): Letter-of-intent queue; link to pipeline CRM and later promote to `branch` on contract signing.

## Compliance / ops sheets

- **FOR BREACH** (~80 rows): Follow-up queue with last-order hints and Viber status. Tie to `branch.store_status = breach` and supply-order last PO dates.
- **New Ownership** (3 rows): Map to existing owner-transfer flow in `/hq/branches` (`owner_transfer_requests`, `transfer-franchise-owner`).
- **Reason for Termination** (~111 rows): Backfill `branch.termination_reason` and `terminated_at` for terminated/closed stores (match on franchise/store name).
- **CC Roster Store Status** / legacy **Roster**: Older Coftea copies—do not re-import; use for audit only if discrepancies are found.

## HQ product follow-ups

- **Canned Response** sheet: Template library for Support Inbox (`/hq/support`).
- **Bulk Auth provisioning**: Optional create franchise-owner logins from roster emails—requires explicit HQ confirm, temp passwords, and audit log (high risk).
- **Sister brand POS**: Full menus/themes for La Lemon, Keki, Meow Meow, Pizza Pocholo (roster HQ works without POS catalogs).
- **Potato Corner roster**: Not present in this workbook; keep PC brand in DB for legacy POS, import when a PC roster file is available.

## Re-import procedure

1. Copy xlsx to `pos-client/data/private/all-brand-roster-2025.xlsx` (gitignored).
2. `npm run import:roster` (dry-run).
3. `npm run import:roster:apply` as HQ (`hq@coftea.com`) or with `SUPABASE_SERVICE_ROLE_KEY`.

Upsert key: `(brand_id, source_sheet, source_row)`.
