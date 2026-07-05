# Franchisee Portal (pos-client) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Franchisee email logins land on a branded `/portal` welcome hub ("WELCOME COFTEA CAFE {BRANCH}!") with 10 tiles routing to existing pages or Coming Soon stubs.

**Architecture:** All changes live in `pos-client`. A new `franchisee` role is resolved from the existing `profiles` table; `/portal` routes render inside the existing `PosShell` behind a `RequireFranchisee` guard. Branch name resolves from `branch.franchisee_email`. The abandoned `franchisee-client/` scaffold is deleted.

**Tech Stack:** React 19 + react-router-dom 7, Supabase JS, lucide-react (already a dependency), Vitest for pure-logic tests, plain CSS with existing theme variables.

**Spec:** `docs/specs/2026-07-06-franchisee-portal-design.md`

**Working branch:** `feature/franchisee-portal` (already created; spec committed).

All paths below are relative to the repo root `/Users/jcprolific/Documents/COFTEA POS/`.
Run all npm commands from `pos-client/`.

---

### Task 1: Branch welcome resolution (`franchiseeBranch.ts`)

**Files:**
- Create: `pos-client/src/lib/franchiseeBranch.ts`
- Test: `pos-client/src/lib/franchiseeBranch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// pos-client/src/lib/franchiseeBranch.test.ts
import { describe, expect, it } from 'vitest';
import { buildWelcome, type FranchiseeBranchRow } from './franchiseeBranch';

const ROW: FranchiseeBranchRow = {
  id: 'b-1',
  name: 'BGC Central',
  business_name: 'Coftea BGC Central Inc.',
};

describe('buildWelcome', () => {
  it('uses branch name when present', () => {
    expect(buildWelcome(ROW, 'owner@coftea.com')).toEqual({
      branchId: 'b-1',
      welcomeName: 'BGC Central',
      isLinked: true,
    });
  });

  it('falls back to business_name when name is missing', () => {
    const row = { ...ROW, name: null };
    expect(buildWelcome(row, 'owner@coftea.com')).toEqual({
      branchId: 'b-1',
      welcomeName: 'Coftea BGC Central Inc.',
      isLinked: true,
    });
  });

  it('falls back to the email user when no branch row matches', () => {
    expect(buildWelcome(null, 'owner@coftea.com')).toEqual({
      branchId: null,
      welcomeName: 'owner',
      isLinked: false,
    });
  });

  it('never returns an empty welcome name', () => {
    expect(buildWelcome(null, '').welcomeName).toBe('Franchisee');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/franchiseeBranch.test.ts`
Expected: FAIL — `Cannot find module './franchiseeBranch'` (or equivalent).

- [ ] **Step 3: Write the implementation**

```ts
// pos-client/src/lib/franchiseeBranch.ts
import { supabase } from './supabase';
import { withTimeout, SUPABASE_TIMEOUT_MS } from './withTimeout';

export interface FranchiseeBranchRow {
  id: string | null;
  name: string | null;
  business_name: string | null;
}

export interface FranchiseeWelcome {
  branchId: string | null;
  welcomeName: string;
  isLinked: boolean;
}

export function buildWelcome(
  row: FranchiseeBranchRow | null,
  email: string
): FranchiseeWelcome {
  if (row?.name) {
    return { branchId: row.id, welcomeName: row.name, isLinked: true };
  }
  if (row?.business_name) {
    return { branchId: row.id, welcomeName: row.business_name, isLinked: true };
  }
  const fallback = email.split('@')[0]?.trim();
  return {
    branchId: null,
    welcomeName: fallback || 'Franchisee',
    isLinked: false,
  };
}

export async function resolveFranchiseeBranch(
  email: string
): Promise<FranchiseeWelcome> {
  if (!email) return buildWelcome(null, email);
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('branch')
        .select('id, name, business_name')
        .ilike('franchisee_email', email)
        .limit(1)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS
    );
    if (error) return buildWelcome(null, email);
    return buildWelcome(data as FranchiseeBranchRow | null, email);
  } catch {
    return buildWelcome(null, email);
  }
}
```

Note: check `pos-client/src/lib/withTimeout.ts` for the exact exported names
(`withTimeout`, `SUPABASE_TIMEOUT_MS` are used by `dashboardRealtime.ts`); if the
signature differs, match how `dashboardRealtime.ts` calls it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/franchiseeBranch.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add pos-client/src/lib/franchiseeBranch.ts pos-client/src/lib/franchiseeBranch.test.ts
git commit -m "feat(portal): branch welcome resolution for franchisee logins"
```

---

### Task 2: SQL migration file

**Files:**
- Create: `supabase-franchisee-portal.sql` (repo root, next to the other supabase-*.sql files)

- [ ] **Step 1: Write the SQL file**

```sql
-- Franchisee Portal role support.
-- Run once in the Supabase SQL Editor (project nooqvrikraglddxkxrul).
-- Adds the 'franchisee' role to profiles and shows how to promote a user.

-- 1) Allow the new role (constraint was created inline as profiles_role_check).
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('cashier', 'hq_admin', 'franchisee'));

-- 2) Promote a franchisee user by email.
--    First create the auth user (Supabase Dashboard → Authentication → Add user,
--    email + password), then run this with the real email:
--
-- update public.profiles p
-- set role = 'franchisee'
-- from auth.users u
-- where p.id = u.id
--   and lower(u.email) = lower('owner@example.com');
--
-- If the user has no profiles row yet:
--
-- insert into public.profiles (id, role)
-- select id, 'franchisee' from auth.users
-- where lower(email) = lower('owner@example.com')
-- on conflict (id) do update set role = 'franchisee';

-- 3) Link the branch so the portal greets them by branch name:
--
-- update public.branch
-- set franchisee_email = 'owner@example.com'
-- where name = 'BGC Central';
```

- [ ] **Step 2: Commit**

```bash
git add supabase-franchisee-portal.sql
git commit -m "feat(portal): SQL for franchisee role + account linking"
```

---

### Task 3: Role plumbing in `App.tsx`

**Files:**
- Modify: `pos-client/src/App.tsx`

- [ ] **Step 1: Extend the role union and resolution**

In `pos-client/src/App.tsx`:

Line 42 — change:
```ts
type UserRole = 'cashier' | 'hq_admin';
```
to:
```ts
type UserRole = 'cashier' | 'hq_admin' | 'franchisee';
```

In `resolveUserRole` (currently returns `data.role === 'hq_admin' ? 'hq_admin' : 'cashier'`), change the return to:
```ts
    if (data.role === 'hq_admin' || data.role === 'franchisee') {
      return data.role;
    }
    return 'cashier';
```

- [ ] **Step 2: Add a home-path helper and use it in all redirects**

Add near `formatToday` (module level):
```ts
function homePathForRole(role: UserRole): string {
  if (role === 'hq_admin') return '/hq';
  if (role === 'franchisee') return '/portal';
  return '/pos';
}
```

Replace every role-based redirect target:
1. Post-login effect (`if (location.pathname === '/login' || location.pathname === '/')`):
   `navigate(auth.role === 'hq_admin' ? '/hq' : '/pos', { replace: true });`
   → `navigate(homePathForRole(auth.role), { replace: true });`
2. `/login` route element:
   `<Navigate to={auth.role === 'hq_admin' ? '/hq' : '/pos'} replace />`
   → `<Navigate to={homePathForRole(auth.role)} replace />`
3. Catch-all `*` route:
   `<Navigate to={auth.isLoggedIn ? (auth.role === 'hq_admin' ? '/hq' : '/pos') : '/login'} replace />`
   → `<Navigate to={auth.isLoggedIn ? homePathForRole(auth.role) : '/login'} replace />`

- [ ] **Step 3: Add the RequireFranchisee guard**

Below `RequireHq`:
```tsx
function RequireFranchisee({ isFranchisee }: { isFranchisee: boolean }) {
  if (!isFranchisee) {
    return <Navigate to="/pos" replace />;
  }
  return <Outlet />;
}
```

- [ ] **Step 4: Franchisee role label + header title**

In `PosShell`, change:
```ts
const roleLabel = auth.role === 'hq_admin' ? 'HQ Admin' : 'Cashier';
```
to:
```ts
const roleLabel =
  auth.role === 'hq_admin' ? 'HQ Admin'
  : auth.role === 'franchisee' ? 'Franchisee'
  : 'Cashier';
```

In `getHeaderTitle`, add before the `/orders` line:
```ts
  if (pathname.startsWith('/portal')) return { title: 'Franchisee Portal', subtitle: terminalLabel };
```

- [ ] **Step 5: Typecheck**

Run: `npm run build`
Expected: PASS (no TS errors; routes not added yet, guard is unused — if
`noUnusedLocals` complains about `RequireFranchisee`, proceed to Task 4 before
building, then build once).

- [ ] **Step 6: Commit**

```bash
git add pos-client/src/App.tsx
git commit -m "feat(portal): franchisee role, guard, and role-aware redirects"
```

---

### Task 4: Portal hub page

**Files:**
- Create: `pos-client/src/portal/PortalHubPage.tsx`
- Create: `pos-client/src/portal/PortalHubPage.css`
- Modify: `pos-client/src/App.tsx` (routes)

- [ ] **Step 1: Create the hub page**

```tsx
// pos-client/src/portal/PortalHubPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  BookOpen,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  Video,
  ClipboardList,
  Ticket,
  Monitor,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  resolveFranchiseeBranch,
  type FranchiseeWelcome,
} from '../lib/franchiseeBranch';
import './PortalHubPage.css';

const TILES = [
  { icon: Megaphone, label: 'Announcements', desc: 'News & updates from HQ', to: '/portal/announcements' },
  { icon: BookOpen, label: 'Operations Manual', desc: 'SOPs and guides', to: '/portal/manual' },
  { icon: ShoppingCart, label: 'Order Products', desc: 'Order supplies from HQ', to: '/inventory' },
  { icon: Package, label: 'Inventory', desc: 'Track branch stock', to: '/inventory' },
  { icon: Wallet, label: 'Sales Dashboard', desc: 'Daily sales at a glance', to: '/dashboard' },
  { icon: TrendingUp, label: 'Reports', desc: 'Performance reports', to: '/portal/reports' },
  { icon: Video, label: 'Training Videos', desc: 'Staff training library', to: '/portal/training' },
  { icon: ClipboardList, label: 'Download Forms', desc: 'Printable documents', to: '/portal/forms' },
  { icon: Ticket, label: 'Support Tickets', desc: 'Get help from HQ', to: '/portal/support' },
  { icon: Monitor, label: 'POS Terminal', desc: 'Ring up sales', to: '/pos' },
];

export default function PortalHubPage() {
  const [welcome, setWelcome] = useState<FranchiseeWelcome | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const email = session?.user?.email ?? '';
      const resolved = await resolveFranchiseeBranch(email);
      if (!cancelled) setWelcome(resolved);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="portal-hub" id="portal-hub">
      <header className="portal-hub-header">
        <h1 className="portal-hub-welcome">
          WELCOME COFTEA CAFE{' '}
          <span className="portal-hub-branch">
            {welcome ? welcome.welcomeName.toUpperCase() : '…'}
          </span>
          !
        </h1>
        <p className="portal-hub-sub">What would you like to do today?</p>
        {welcome && !welcome.isLinked && (
          <p className="portal-hub-note">
            Your account isn&apos;t linked to a branch yet — contact HQ to link it.
          </p>
        )}
      </header>

      <div className="portal-hub-grid">
        {TILES.map(({ icon: Icon, label, desc, to }) => (
          <Link key={label} to={to} className="portal-tile" id={`tile-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <span className="portal-tile-icon">
              <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="portal-tile-label">{label}</span>
            <span className="portal-tile-desc">{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS (theme-variable driven, matches Coftea brand)**

```css
/* pos-client/src/portal/PortalHubPage.css */
.portal-hub {
  padding: 28px 32px 40px;
  max-width: 1080px;
  margin: 0 auto;
}

.portal-hub-header {
  text-align: center;
  margin-bottom: 28px;
}

.portal-hub-welcome {
  font-family: var(--font-display, var(--font-family));
  font-size: 30px;
  letter-spacing: 0.02em;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.portal-hub-branch {
  color: var(--accent);
}

.portal-hub-sub {
  color: var(--text-secondary);
  margin: 0;
  font-size: 15px;
}

.portal-hub-note {
  margin: 10px auto 0;
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--accent-glow);
  color: var(--accent-dark);
  font-size: 13px;
}

.portal-hub-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}

.portal-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.portal-tile:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 8px 20px var(--accent-glow);
}

.portal-tile-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  color: var(--accent);
  margin-bottom: 4px;
}

.portal-tile-label {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-primary);
}

.portal-tile-desc {
  font-size: 13px;
  color: var(--text-secondary);
}
```

Check `pos-client/src/index.css` (and the `brand-coftea` overrides) — if there is
no `--font-display` variable, the fallback `var(--font-family)` covers it.

- [ ] **Step 3: Add the route**

In `pos-client/src/App.tsx`, import at top:
```ts
import PortalHubPage from './portal/PortalHubPage';
```
Inside the `PosShell` route group, after the `/promotions` route add:
```tsx
          <Route element={<RequireFranchisee isFranchisee={auth.role === 'franchisee'} />}>
            <Route path="/portal" element={<PortalHubPage />} />
          </Route>
```

- [ ] **Step 4: Typecheck + run tests**

Run: `npm run build && npm test`
Expected: build PASS, all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add pos-client/src/portal/ pos-client/src/App.tsx
git commit -m "feat(portal): welcome hub page with 10 module tiles"
```

---

### Task 5: Coming Soon pages

**Files:**
- Create: `pos-client/src/portal/ComingSoonPage.tsx`
- Create: `pos-client/src/portal/ComingSoonPage.css`
- Modify: `pos-client/src/App.tsx` (route)

- [ ] **Step 1: Create the stub page (config-driven by route param)**

```tsx
// pos-client/src/portal/ComingSoonPage.tsx
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  Megaphone,
  BookOpen,
  TrendingUp,
  Video,
  ClipboardList,
  Ticket,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import './ComingSoonPage.css';

const MODULES: Record<string, { icon: LucideIcon; title: string; blurb: string }> = {
  announcements: {
    icon: Megaphone,
    title: 'Announcements',
    blurb: 'News and updates from HQ will appear here.',
  },
  manual: {
    icon: BookOpen,
    title: 'Operations Manual',
    blurb: 'SOPs, recipes, and store guides will live here.',
  },
  reports: {
    icon: TrendingUp,
    title: 'Reports',
    blurb: 'Branch performance reports are on the way.',
  },
  training: {
    icon: Video,
    title: 'Training Videos',
    blurb: 'The staff training library is being prepared.',
  },
  forms: {
    icon: ClipboardList,
    title: 'Download Forms',
    blurb: 'Printable forms and documents will be posted here.',
  },
  support: {
    icon: Ticket,
    title: 'Support Tickets',
    blurb: 'Soon you can raise and track help requests to HQ.',
  },
};

export default function ComingSoonPage() {
  const { module } = useParams();
  const config = module ? MODULES[module] : undefined;

  if (!config) {
    return <Navigate to="/portal" replace />;
  }

  const Icon = config.icon;

  return (
    <div className="portal-soon" id={`portal-soon-${module}`}>
      <div className="portal-soon-card">
        <span className="portal-soon-icon">
          <Icon size={34} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="portal-soon-title">{config.title}</h1>
        <p className="portal-soon-blurb">{config.blurb}</p>
        <span className="portal-soon-badge">Coming Soon</span>
        <Link to="/portal" className="portal-soon-back">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Portal Home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS**

```css
/* pos-client/src/portal/ComingSoonPage.css */
.portal-soon {
  display: flex;
  justify-content: center;
  padding: 60px 24px;
}

.portal-soon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 44px 56px;
  max-width: 440px;
}

.portal-soon-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-glow);
  color: var(--accent);
}

.portal-soon-title {
  font-family: var(--font-display, var(--font-family));
  font-size: 24px;
  color: var(--text-primary);
  margin: 4px 0 0;
}

.portal-soon-blurb {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.portal-soon-badge {
  margin-top: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  background: var(--accent-glow);
  color: var(--accent-dark);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.portal-soon-back {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.portal-soon-back:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3: Add the route**

In `pos-client/src/App.tsx`, import:
```ts
import ComingSoonPage from './portal/ComingSoonPage';
```
Inside the `RequireFranchisee` group added in Task 4:
```tsx
            <Route path="/portal/:module" element={<ComingSoonPage />} />
```

- [ ] **Step 4: Typecheck + tests**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pos-client/src/portal/ pos-client/src/App.tsx
git commit -m "feat(portal): coming-soon pages for content modules"
```

---

### Task 6: Franchisee sidebar (Portal Home first, Dashboard before POS)

**Files:**
- Modify: `pos-client/src/components/Sidebar.tsx`
- Modify: `pos-client/src/App.tsx:165-170` (pass the new prop)

- [ ] **Step 1: Add `isFranchisee` prop and a Home icon**

In `Sidebar.tsx` add to the interface:
```ts
interface SidebarProps {
  userName: string;
  userRole: string;
  canAccessHq: boolean;
  isFranchisee: boolean;
  onLogout: () => void;
}
```

Add an icon component next to the others:
```tsx
function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}
```

- [ ] **Step 2: Make the nav list data-driven with role-aware order**

Replace the hard-coded `<NavLink>` blocks in the `<nav>` (keep the HQ link and
footer as-is) with:

```tsx
  const baseItems = [
    { id: 'nav-pos', to: '/pos', label: 'POS', icon: <PosIcon /> },
    { id: 'nav-orders', to: '/orders', label: 'Orders', icon: <OrdersIcon /> },
    { id: 'nav-inventory', to: '/inventory', label: 'Inventory', icon: <InventoryIcon /> },
    { id: 'nav-dashboard', to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'nav-promotions', to: '/promotions', label: 'Promotions', icon: <PromotionsIcon /> },
  ];

  const franchiseeItems = [
    { id: 'nav-portal', to: '/portal', label: 'Portal Home', icon: <HomeIcon /> },
    { id: 'nav-dashboard', to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'nav-pos', to: '/pos', label: 'POS', icon: <PosIcon /> },
    { id: 'nav-orders', to: '/orders', label: 'Orders', icon: <OrdersIcon /> },
    { id: 'nav-inventory', to: '/inventory', label: 'Inventory', icon: <InventoryIcon /> },
    { id: 'nav-promotions', to: '/promotions', label: 'Promotions', icon: <PromotionsIcon /> },
  ];

  const items = isFranchisee ? franchiseeItems : baseItems;
```

and render:

```tsx
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink key={item.id} id={item.id} className={navClassName} to={item.to}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {canAccessHq && (
          <NavLink className={navClassName} to="/hq">
            <span className="nav-icon"><HqIcon /></span>
            HQ Portal
          </NavLink>
        )}
      </nav>
```

Remember to destructure the new prop:
`export default function Sidebar({ userName, userRole, canAccessHq, isFranchisee, onLogout }: SidebarProps)`.

- [ ] **Step 3: Pass the prop from `PosShell` in `App.tsx`**

```tsx
        <Sidebar
          userName={auth.userName}
          userRole={roleLabel}
          canAccessHq={auth.role === 'hq_admin'}
          isFranchisee={auth.role === 'franchisee'}
          onLogout={onLogout}
        />
```

- [ ] **Step 4: Typecheck + tests**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pos-client/src/components/Sidebar.tsx pos-client/src/App.tsx
git commit -m "feat(portal): franchisee sidebar with Portal Home and Dashboard-first order"
```

---

### Task 7: Delete the abandoned `franchisee-client/` scaffold

**Files:**
- Delete: `franchisee-client/` (entire directory — untracked in git, placeholder only; decision recorded in the spec)

- [ ] **Step 1: Delete the directory**

```bash
rm -rf "/Users/jcprolific/Documents/COFTEA POS/franchisee-client"
```

- [ ] **Step 2: Verify git is clean of it**

Run: `git status --porcelain | grep franchisee-client`
Expected: no output (it was never tracked, so no commit is needed).

---

### Task 8: Verification (build, tests, preview flows)

- [ ] **Step 1: Full test + build**

Run (in `pos-client/`): `npm test && npm run build && npm run lint`
Expected: all PASS.

- [ ] **Step 2: Preview — cashier flow unchanged (regression check)**

Start the dev server (launch config "pos", port 5198). Verify:
- Guest login → lands on `/pos` exactly as before.
- Sidebar order for cashier: POS, Orders, Inventory, Dashboard, Promotions.
- Navigating to `/portal` as guest → redirected to `/pos`.

- [ ] **Step 3: Preview — franchisee flow (needs a test account)**

Prerequisite (user action, one time): run `supabase-franchisee-portal.sql` in
the Supabase SQL editor, create a test user (email + password) in Supabase
Auth, promote it to `franchisee`, and set `branch.franchisee_email` per the
comments in the SQL file.

Then verify in the preview:
- Email login with the franchisee account → lands on `/portal`.
- Welcome reads "WELCOME COFTEA CAFE {BRANCH}!" with the linked branch name.
- All 10 tiles render; Sales Dashboard → `/dashboard`, Inventory/Order
  Products → `/inventory`, POS Terminal → `/pos`; the 5 content tiles open
  Coming Soon pages with a working "Back to Portal Home" link.
- Sidebar shows: Portal Home, Dashboard, POS, Orders, Inventory, Promotions.
- Log Out returns to `/login`.

- [ ] **Step 4: Screenshot proof**

Capture the hub and one Coming Soon page for the user.
