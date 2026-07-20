# Franchise City Partner Enterprise Backlog

Implemented 2026-07-20 in `Franchise-City-POS` (`pos-client`).

## Order lifecycle

- `NEW` + `UNPAID` = open ticket (future park/resume path)
- **Charge → `COMPLETED` + `PAID`** immediately
- Removed kitchen prep actions from Today's Orders UI
- Per-shift order numbers `0001` via `get_next_shift_order_number`
- Customer name + order note on cart
- Completed order detail drawer with line items + staff timestamp

## Shift / login

- Time In: petty cash + beginning cups on `pos_shift`
- Time Out: ending cups + Z-report; X-report mid-shift copy clarified
- POS gated until shift open
- HQ PIN `1234` blocked when branch POS login target selected
- Mobile Sync badge label in sidebar

## Pricing

- `FREE_DRINK` auto-zero total
- Editable promo %
- Free Upsize / Free Add-ons toggles in customization modal

## Inventory

- Movement history shows staff name
- CSV export of movement log
- WH supply order `delivered` auto-receives into `branch_inventory`

## Reports / presence

- Revenue rule: `COMPLETED` + `PAID` only
- Franchise portal staff activity widget (online / idle / offline heartbeat)

## Database

Run [`supabase-partner-enterprise-backlog.sql`](../../supabase-partner-enterprise-backlog.sql) in Supabase SQL Editor.
