# Portal Hub Visual Polish — Design

**Date:** 2026-07-07
**Scope:** `src/portal/PortalHubPage.tsx` + `src/portal/PortalHubPage.css` only. No logic, routing, or data changes.

## Goal

Bring the Franchise City landing page's premium visual language into the Franchisee Portal hub page (Option A: dark hero band + upgraded tiles).

## Design

### 1. Hero panel (replaces plain centered header)

- Full-width rounded (18px) dark panel: linear gradient `#1a1410 → #2a1f15` with a soft radial orange glow in the top-right corner.
- Pill badge above the heading: `★ FRANCHISEE PORTAL` — uppercase, letter-spaced, thin translucent light border.
- Display heading in Plus Jakarta Sans (already loaded via index.html): `Welcome, <branch>.` — "Welcome," in cream `#f6efe6`, branch name in orange `#e8833a`, trailing orange period (landing signature).
- Sub-line "What would you like to do today?" in warm muted gray `#b9a892`.
- "Not linked" warning becomes an amber pill inside the hero.
- Hero colors are fixed local values (`--portal-hero-*` custom properties scoped to `.portal-hub`) — the dark panel reads correctly on both the light Coftea theme and dark brand themes.

### 2. Tile upgrades (same grid, same 10 tiles, same links)

- 18px radius, padding bumped to ~24px, still `var(--bg-card)` + `var(--border)` so brand themes keep working.
- Icon chip: soft peach `#fbe3d0` background with orange `#e2691e` icon; on hover the chip flips to solid orange with white icon.
- Hover: `translateY(-3px)` lift, orange border, warm glow shadow.
- Arrow (→) in the tile's bottom-right corner, hidden by default, fades/slides in on hover.
- Entrance: staggered fade-up animation (~40ms per tile) on load, using existing tile order.

### 3. Constraints

- `resolveFranchiseeBranch` flow, tile list, and routes unchanged.
- Uses existing POS theme variables where the surface must adapt per brand; landing-derived colors are hard-coded locals only inside the hero and icon chips.
- No new dependencies; Plus Jakarta Sans already in `index.html`.

## Testing

Visual change only — verify in the browser at `localhost:5199/portal` (light Coftea theme) with hover and load-animation checks. Existing vitest suite must still pass (`npm test`).
