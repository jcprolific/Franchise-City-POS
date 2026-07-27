# Partner POS + Portal Backlog Design

**Date:** 2026-07-27  
**Product:** Franchise City / Coftea POS (`pos-client`)  
**Supabase:** coftea-pos (`wuthacuizslfsadkwmad`)

## Decisions (locked)

| # | Decision |
|---|----------|
| EOD submit | Barista → HQ direct. Franchisee sees submitted EODs; no franchisee approve gate. |
| Edit access | EOD corrections + inventory stock edits = franchisee (+ HQ) only. Barista cannot edit stock or submitted EODs. |
| Current Stocks | Rename Stock tab; light Portal Home low-stock summary linking to Inventory. |
| Announcements | Full cleanup: no samples, hide expired, simplify hub spotlight. |
| EOD qty | Auto from POS; drink/addon qty read-only. Barista edits cash/GCash/expenses/frees/notes. |
| HitPay | Out of scope this release. |
| Delivery | Batch B: P0 UI/fixes first, then P1 EOD/roles. |

## Scope

### P0
1. Remove Enter as Guest
2. Tablet portrait Login visibility (sync with landscape)
3. Fix unclickable + on POS (barista/franchisee)
4. Support tickets: branch-only list for franchisee
5. Portal Home: remove duplicate quick actions (Get Help vs Technical Support; dedupe Inventory/EOD/POS)
6. Remove Yesterday’s balance from EOD
7. Announcements cleanup
8. Current Stocks rename + hub summary

### P1
9. Barista EOD access + submit to HQ
10. Lock drink/addon qty from POS; franchisee/HQ edit rules after submit

### Out of scope
- HitPay · Gyud fork · Landing site

## Behavior notes

- **Guest:** Remove UI and stop accepting guest login for production POS.
- **Login mobile:** Card scrolls within viewport on portrait tablets (~768px); Login CTA always reachable.
- **+ button:** Ensure product add control is not covered by sticky search/category overlays; adequate tap target.
- **Tickets:** Portal support fetches with hard `branch_id = current branch` (no null/other-branch leakage from local fallback).
- **Portal hub:** Quick actions keep EOD, Open POS, Reports only. Technical Support remains as section tile.
- **Yesterday’s:** Remove from UI and from `totalCashOnHand` formula (`= cashOnHand`). Persist `yesterday_balance: 0`.
- **EOD permissions:** New `eod` capability for barista (+ roles that already run EOD). `/eod-report` gated by `eod`, not full `dashboard`.
- **Post-submit:** Barista read-only. Franchisee/HQ may correct. Submit still lands in HQ inbox immediately.
