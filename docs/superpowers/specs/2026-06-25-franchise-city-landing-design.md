# Franchise City Landing Page — Design Spec

**Date:** 2026-06-25
**Status:** Approved (design), pending implementation plan
**Repo:** `jcprolific/Franchise-City-POS` (COFTEA POS)

## Goal

A public, single-page marketing landing site for **Franchise City** — an umbrella
franchising platform — whose primary purpose is **franchisee lead generation**.
It is separate from the operational POS/ERP (`pos-client`, `admin-client`) but lives
in the same repo and shares the same Supabase project. A visitor learns about the
brands and submits an inquiry that is saved to Supabase for the HQ team to follow up.

## Scope

### In scope
- New `landing-client/` Vite + React 19 + TypeScript workspace.
- Single marketing page with the sections defined below.
- Franchise inquiry form (Name, Email, Phone) that writes to a new
  `franchise_inquiries` Supabase table.
- Brand-aware "Get Started" CTAs that pre-tag the inquiry with the chosen brand.

### Out of scope (YAGNI for now)
- Store Locations page (footer link is a placeholder/anchor for now).
- Multi-language / i18n.
- CMS or admin UI for editing content (content lives in TS data files).
- Analytics / tracking.
- HQ-side inquiry management UI (the table is queryable; building the HQ view is a
  later, separate task).

## Tech & conventions

- **Stack:** Vite + React 19 + TypeScript, matching `pos-client`.
- **Styling:** plain per-component CSS files (`Component.css`) + a global
  `index.css`, matching `pos-client` conventions. No CSS framework.
- **Supabase client:** mirror `pos-client/src/lib/supabase.ts` — read
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `import.meta.env`, expose
  `supabase` and `isSupabaseConfigured()`.
- **Env:** `landing-client/.env.local` with `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` (same Supabase project as the POS).
- **Routing:** single page, no router. Navigation uses in-page smooth-scroll anchors.
- **Deploy:** own `vercel.json`, modeled on `pos-client/vercel.json`.

## Visual identity (from approved mockup)

- **Logo:** 🔥 **FRANCHISE CITY**
- **Palette / design tokens** (defined as CSS custom properties):
  - `--fc-black: #1a1410` (warm near-black — hero, footer, stats band)
  - `--fc-orange: #E8833A` (primary accent / CTAs)
  - `--fc-orange-solid: #E2691E` (solid CTA band)
  - `--fc-cream: #FAF6F0` (light section background)
  - `--fc-peach: #FBE3D0` (alternating section background)
- **Typography:** heavy/bold display sans for headings, with a signature "."
  accent on key headlines (e.g. "Build Your Empire**.**"). Body in a clean sans.
- **Hero background:** dark with warm bokeh/blurred-light treatment.

## Page structure (top → bottom)

Single page. All "Franchise Now" / "Get Started" / "Start Your Journey" CTAs
smooth-scroll to the **Inquiry** section.

1. **Nav** — logo (left), center links (Home, Brands, Why Us, Get Started),
   "Franchise Now" button (right). Sticky, dark.
2. **Hero** — badge "★ Start Your Business Journey"; headline
   "Build Your Empire. Start With a Franchise."; subtext; two CTAs
   ("Franchise Now", "Explore Brands"); stat pills
   (300+ Branches · Proven Brands · End-to-End Support).
3. **Our Brands** — heading "Our Brands" + "Choose the brand that fits you." +
   4 brand cards, each with a "Get Started →" CTA:
   - **cof/tea cafe** (`cof-tea`) — "TARA! Let's Build Your Own Cafe!"
   - **La Lemon** (`la-lemon`) — "When life gives you lemon, squeeze it with La Lemon."
   - **KēKi Japanese Cake** (`keki`) — "Delight in every bite."
   - **m3ow m3ow** (`m3ow-m3ow`) — "A big scoop of happiness."
4. **Why Choose Franchise City?** — 3 cards: Proven Brands · Full Support System ·
   Nationwide Reach.
5. **Stats band** (dark) — 300+ Branches Nationwide · 4 Franchise Brands ·
   100% Filipino-Owned.
6. **How to Get Started** — 3 numbered steps: Choose Your Brand → Apply Online →
   Launch Your Store.
7. **Testimonials** — "What Our Franchisees Say" + 3 five-star quote cards
   (Maria T. / Quezon City, James R. / Cebu, Ana L. / Davao).
8. **Inquiry section** ("Apply Now") — the franchise inquiry form (see below).
9. **Final CTA** (solid orange band) — "Ready to Be Your Own Boss?" + button that
   scrolls to the inquiry form.
10. **Footer** (dark) — logo + tagline; Navigate links (Home, Brands,
    Store Locations, Contact Us, Franchise Now); social icons;
    "© 2026 Franchise City PH. All rights reserved."

## Components

- `Nav`
- `Hero`
- `BrandsSection` + `BrandCard`
- `WhyChoose`
- `StatsBand`
- `HowToStart`
- `Testimonials`
- `InquirySection` (the form + submit logic)
- `FinalCTA`
- `Footer`

Content data lives in `src/data/`:
- `brands.ts` — brand id/slug, name, tagline, card initials/style.
- `steps.ts` — the 3 "How to Get Started" steps.
- `testimonials.ts` — the 3 testimonial entries.

## Inquiry form & lead capture

### Visible form fields
- **Full name** (required)
- **Email** (required, email format)
- **Phone** (required)

### Behavior
- A brand's "Get Started →" sets `interested_brand` (hidden) and scrolls to the
  form. Submitting from a generic CTA leaves `interested_brand` null.
- On submit: insert one row into `franchise_inquiries`, then show a success state
  ("Salamat! Aabutin ka ng team namin within 24–48 hours."). On error, show a
  retry message. Disable submit while in flight.
- Basic client-side validation (required + email format) before insert.

### Supabase table: `franchise_inquiries`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `created_at` | timestamptz | default `now()` |
| `full_name` | text | NOT NULL |
| `email` | text | NOT NULL |
| `phone` | text | NOT NULL |
| `interested_brand` | text | NULL; expected slugs `cof-tea`/`la-lemon`/`keki`/`m3ow-m3ow` |
| `status` | text | default `'new'`, check in (`new`,`contacted`,`closed`) |
| `source` | text | default `'landing'` |

### RLS
- Enable RLS on the table.
- Policy: allow **INSERT** for the `anon` role (public form submission) with a
  `with check` that constrains `status = 'new'` and `source = 'landing'`.
- **No** public SELECT/UPDATE/DELETE. Reads are for authenticated/HQ roles only
  (HQ view is out of scope here).
- Delivered as a new SQL migration file (e.g. `supabase-franchise-inquiries.sql`),
  consistent with the repo's existing `supabase-*.sql` setup-script convention.

## Error handling

- Missing Supabase env vars → form shows a disabled state with a configuration
  notice (mirrors `isSupabaseConfigured()` usage in `pos-client`).
- Insert failure → inline error with retry; do not lose the user's input.
- All CTAs degrade to scrolling to the form even if JS-driven smooth scroll is
  unavailable (anchor `href="#inquiry"`).

## Testing

- Form validation: required fields and email format reject invalid input.
- Successful submit inserts a row with correct `interested_brand` when launched
  from a brand card, and null otherwise.
- Smoke test against Supabase (a `scripts/smoke-test-inquiry.mjs`, mirroring the
  existing `pos-client` `smoke:franchisee` script) inserts and verifies a row.
- Manual: responsive check (mobile + desktop), all CTAs scroll to the form,
  success/error states render.

## Open questions / confirmations for spec review

- `interested_brand` is captured silently (not a visible field) — confirm this is
  desired vs. adding a visible brand dropdown later.
- Footer "Store Locations" / "Contact Us" links: placeholder anchors for now —
  confirm OK.
