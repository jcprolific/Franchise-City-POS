# Franchise owner sale push notifications (2026-07-14)

## Goal
When a POS order is punched, notify the branch franchise owner via PWA Web Push with:
- Total sales (order amount)
- Number of cups sold (`item_count` / line qty sum)
- Punch time (Asia/Manila)

## Audience
`branch.owner_user_id` only.

## Architecture
1. `pos_order` AFTER INSERT trigger (paid, not void/refund) → `invoke_notify_owner_sale`
2. `pg_net` POST → Edge Function `notify-owner-sale` (secret header)
3. Function loads owner push subscriptions and sends VAPID Web Push
4. Portal PWA (`sw.js` + manifest) displays notification; click opens `/dashboard`
5. Owner enables via Portal banner (`OwnerPushBanner`)

## Config
- Table `push_dispatch_config`: `supabase_project_url`, `owner_sale_push_secret`
- Edge secrets: `WEB_PUSH_VAPID_*`, `OWNER_SALE_PUSH_SECRET`
- Edge `push-config` exposes public VAPID key to the browser

## Client
- `public/sw.js`, `public/manifest.webmanifest`
- `src/lib/pushNotifications.ts`
- Banner on `/portal` for `franchise_owner`
