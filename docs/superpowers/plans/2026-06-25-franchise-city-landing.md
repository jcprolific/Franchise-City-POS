# Franchise City Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public single-page Franchise City marketing site that captures franchisee inquiries into Supabase.

**Architecture:** A new `landing-client/` Vite + React 19 + TS workspace inside the `Franchise-City-POS` repo, sibling to `pos-client`/`admin-client`. Presentational section components compose a single page; pure inquiry logic (validation + payload building) is isolated in `src/lib/inquiry.ts` and unit-tested with Vitest; submissions insert into a new `franchise_inquiries` Supabase table protected by RLS (anon INSERT only).

**Tech Stack:** Vite, React 19, TypeScript, `@supabase/supabase-js`, `lucide-react`, plain per-component CSS, Vitest (unit), Node smoke script (live Supabase).

Reference spec: `docs/superpowers/specs/2026-06-25-franchise-city-landing-design.md`
Reference mockup: provided by user (dark hero, orange accent, cream/peach sections).

---

## File Structure

```
landing-client/
  index.html
  package.json
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
  eslint.config.js
  vercel.json
  .gitignore
  public/favicon.svg
  scripts/smoke-test-inquiry.mjs
  src/
    main.tsx
    App.tsx
    App.css
    index.css
    lib/
      supabase.ts
      inquiry.ts
      inquiry.test.ts
    data/
      brands.ts
      steps.ts
      testimonials.ts
    components/
      Nav.tsx          Nav.css
      Hero.tsx         Hero.css
      BrandsSection.tsx BrandsSection.css
      BrandCard.tsx
      WhyChoose.tsx    WhyChoose.css
      StatsBand.tsx    StatsBand.css
      HowToStart.tsx   HowToStart.css
      Testimonials.tsx Testimonials.css
      InquirySection.tsx InquirySection.css
      FinalCTA.tsx     FinalCTA.css
      Footer.tsx       Footer.css
supabase-franchise-inquiries.sql   (repo root, matches existing supabase-*.sql convention)
```

**Shared types/interfaces (defined once, used throughout):**

```ts
// src/data/brands.ts
export interface Brand {
  slug: 'cof-tea' | 'la-lemon' | 'keki' | 'm3ow-m3ow';
  name: string;
  tagline: string;
  initials: string;   // shown in the card swatch, e.g. "c/t"
  swatch: string;     // CSS color for the card swatch background
}

// src/lib/inquiry.ts
export interface InquiryInput {
  fullName: string;
  email: string;
  phone: string;
  interestedBrand: string | null;
}
export interface ValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
}
export interface InquiryRow {
  full_name: string;
  email: string;
  phone: string;
  interested_brand: string | null;
}
```

---

## Task 1: Scaffold the landing-client workspace

**Files:**
- Create: `landing-client/package.json`
- Create: `landing-client/vite.config.ts`
- Create: `landing-client/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `landing-client/eslint.config.js`
- Create: `landing-client/.gitignore`
- Create: `landing-client/vercel.json`
- Create: `landing-client/index.html`
- Create: `landing-client/public/favicon.svg`
- Create: `landing-client/src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`

- [ ] **Step 1: Create `landing-client/package.json`**

```json
{
  "name": "landing-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "smoke:inquiry": "node scripts/smoke-test-inquiry.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.103.0",
    "lucide-react": "^1.8.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/node": "^24.12.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.58.0",
    "vite": "^8.0.4",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `landing-client/vite.config.ts`** (includes Vitest config)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create the three tsconfig files**

`landing-client/tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`landing-client/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

`landing-client/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create `landing-client/eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
```

- [ ] **Step 5: Create `landing-client/.gitignore`, `vercel.json`, `index.html`, `public/favicon.svg`**

`landing-client/.gitignore`:
```
node_modules
dist
.env.local
*.local
.DS_Store
```

`landing-client/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/((?!assets/).*)",
      "destination": "/index.html"
    }
  ]
}
```

`landing-client/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="Franchise City — build your empire with proven Filipino franchise brands." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
    <title>Franchise City — Start With a Franchise</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`landing-client/public/favicon.svg` (simple flame mark):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1a1410"/><path d="M16 6c2 3-1 4-1 6 0 1.5 1 2.5 1 2.5S14 14 13 16c-1.4 2.7.6 6 3 6 2.6 0 4.5-2 4.5-4.7 0-3.5-3-5.3-3-7.8 0-1.4.5-2.5.5-2.5S17 6.8 16 6z" fill="#E8833A"/></svg>
```

- [ ] **Step 6: Create minimal `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css` placeholders**

`landing-client/src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`landing-client/src/App.tsx` (temporary; replaced in Task 13):
```tsx
import './App.css'

export default function App() {
  return <main>Franchise City landing — scaffold OK</main>
}
```

`landing-client/src/App.css`:
```css
main { padding: 2rem; font-family: 'Inter', system-ui, sans-serif; }
```

`landing-client/src/index.css` (temporary minimal; replaced in Task 7):
```css
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; }
```

- [ ] **Step 7: Install dependencies**

Run: `cd "landing-client" && npm install`
Expected: completes with `node_modules/` created, no errors.

- [ ] **Step 8: Verify dev build compiles**

Run: `cd "landing-client" && npm run build`
Expected: `tsc -b` passes and Vite writes `dist/` with no errors.

- [ ] **Step 9: Commit**

```bash
git add landing-client/
git commit -m "feat(landing): scaffold landing-client workspace"
```

---

## Task 2: Supabase table + RLS for inquiries

**Files:**
- Create: `supabase-franchise-inquiries.sql` (repo root)

- [ ] **Step 1: Write the migration SQL**

`supabase-franchise-inquiries.sql`:
```sql
-- Franchise City landing page: public franchisee inquiry capture.
-- Run in Supabase SQL Editor (Franchise-City-POS project).

create table if not exists public.franchise_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text not null,
  interested_brand text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed')),
  source text not null default 'landing'
);

alter table public.franchise_inquiries enable row level security;

-- Public landing form may INSERT only, and only as a fresh 'new' lead.
drop policy if exists "anon can submit inquiry" on public.franchise_inquiries;
create policy "anon can submit inquiry"
  on public.franchise_inquiries
  for insert
  to anon
  with check (status = 'new' and source = 'landing');

-- No anon SELECT/UPDATE/DELETE policies: reads are for authenticated/HQ only.
```

- [ ] **Step 2: Apply the migration**

Apply `supabase-franchise-inquiries.sql` in the Supabase SQL Editor for the Franchise-City-POS project (or via the Supabase MCP `apply_migration` tool with name `franchise_inquiries`).
Expected: table `public.franchise_inquiries` exists with RLS enabled and one insert policy. Verify with `list_tables` (or the SQL Editor table list).

- [ ] **Step 3: Commit**

```bash
git add supabase-franchise-inquiries.sql
git commit -m "feat(landing): add franchise_inquiries table and RLS"
```

---

## Task 3: Inquiry validation (TDD)

**Files:**
- Create: `landing-client/src/lib/inquiry.ts`
- Test: `landing-client/src/lib/inquiry.test.ts`

- [ ] **Step 1: Write the failing test**

`landing-client/src/lib/inquiry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateInquiry } from './inquiry'

describe('validateInquiry', () => {
  const valid = { fullName: 'Juan Dela Cruz', email: 'juan@example.com', phone: '09171234567', interestedBrand: null }

  it('returns no errors for valid input', () => {
    expect(validateInquiry(valid)).toEqual({})
  })

  it('flags a blank name', () => {
    expect(validateInquiry({ ...valid, fullName: '  ' }).fullName).toBeDefined()
  })

  it('flags an invalid email', () => {
    expect(validateInquiry({ ...valid, email: 'not-an-email' }).email).toBeDefined()
  })

  it('flags a blank email', () => {
    expect(validateInquiry({ ...valid, email: '' }).email).toBeDefined()
  })

  it('flags a too-short phone', () => {
    expect(validateInquiry({ ...valid, phone: '123' }).phone).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "landing-client" && npm test`
Expected: FAIL — `validateInquiry` is not exported / module not found.

- [ ] **Step 3: Write minimal implementation**

`landing-client/src/lib/inquiry.ts`:
```ts
export interface InquiryInput {
  fullName: string;
  email: string;
  phone: string;
  interestedBrand: string | null;
}

export interface ValidationErrors {
  fullName?: string;
  email?: string;
  phone?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInquiry(input: InquiryInput): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!input.fullName.trim()) errors.fullName = 'Pakilagay ang iyong pangalan.';
  if (!input.email.trim()) errors.email = 'Pakilagay ang iyong email.';
  else if (!EMAIL_RE.test(input.email.trim())) errors.email = 'Hindi wastong email address.';
  if (input.phone.replace(/\D/g, '').length < 7) errors.phone = 'Pakilagay ang wastong contact number.';
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "landing-client" && npm test`
Expected: PASS — all 5 `validateInquiry` tests green.

- [ ] **Step 5: Commit**

```bash
git add landing-client/src/lib/inquiry.ts landing-client/src/lib/inquiry.test.ts
git commit -m "feat(landing): add inquiry validation"
```

---

## Task 4: Inquiry payload builder (TDD)

**Files:**
- Modify: `landing-client/src/lib/inquiry.ts`
- Modify: `landing-client/src/lib/inquiry.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `landing-client/src/lib/inquiry.test.ts`:
```ts
import { buildInquiryPayload } from './inquiry'

describe('buildInquiryPayload', () => {
  it('trims fields and maps to db column names', () => {
    const row = buildInquiryPayload({
      fullName: '  Juan  ', email: ' juan@example.com ', phone: ' 0917 123 4567 ', interestedBrand: 'cof-tea',
    })
    expect(row).toEqual({
      full_name: 'Juan',
      email: 'juan@example.com',
      phone: '0917 123 4567',
      interested_brand: 'cof-tea',
    })
  })

  it('keeps interested_brand null when none chosen', () => {
    const row = buildInquiryPayload({ fullName: 'A', email: 'a@b.co', phone: '0917123', interestedBrand: null })
    expect(row.interested_brand).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "landing-client" && npm test`
Expected: FAIL — `buildInquiryPayload` is not exported.

- [ ] **Step 3: Add the implementation**

Append to `landing-client/src/lib/inquiry.ts`:
```ts
export interface InquiryRow {
  full_name: string;
  email: string;
  phone: string;
  interested_brand: string | null;
}

export function buildInquiryPayload(input: InquiryInput): InquiryRow {
  return {
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    interested_brand: input.interestedBrand,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "landing-client" && npm test`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add landing-client/src/lib/inquiry.ts landing-client/src/lib/inquiry.test.ts
git commit -m "feat(landing): add inquiry payload builder"
```

---

## Task 5: Supabase client + submit function

**Files:**
- Create: `landing-client/src/lib/supabase.ts`
- Modify: `landing-client/src/lib/inquiry.ts`

- [ ] **Step 1: Create the Supabase client** (mirrors `pos-client/src/lib/supabase.ts`)

`landing-client/src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in landing-client/.env.local, then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
```

- [ ] **Step 2: Add `submitInquiry` to `inquiry.ts`**

Append to `landing-client/src/lib/inquiry.ts`:
```ts
import { supabase } from './supabase';

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export async function submitInquiry(input: InquiryInput): Promise<SubmitResult> {
  const payload = buildInquiryPayload(input);
  const { error } = await supabase.from('franchise_inquiries').insert(payload);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
```

- [ ] **Step 3: Verify type-check/build still passes**

Run: `cd "landing-client" && npm run build`
Expected: PASS — no TS errors. (`submitInquiry` is covered live by the Task 6 smoke test, not a unit test, since it requires Supabase.)

- [ ] **Step 4: Commit**

```bash
git add landing-client/src/lib/supabase.ts landing-client/src/lib/inquiry.ts
git commit -m "feat(landing): add supabase client and submitInquiry"
```

---

## Task 6: Live smoke test for inquiry insert + RLS

**Files:**
- Create: `landing-client/scripts/smoke-test-inquiry.mjs`
- Create (manually, not committed): `landing-client/.env.local`

- [ ] **Step 1: Create `landing-client/.env.local`** (gitignored — copy values from `pos-client/.env.local`)

```
VITE_SUPABASE_URL=<same as pos-client>
VITE_SUPABASE_ANON_KEY=<same as pos-client>
```

- [ ] **Step 2: Write the smoke test** (mirrors `pos-client/scripts/smoke-test-franchisee.mjs`)

`landing-client/scripts/smoke-test-inquiry.mjs`:
```js
/**
 * Smoke test: franchise inquiry insert + RLS against Supabase.
 * Usage (from landing-client/):
 *   node scripts/smoke-test-inquiry.mjs
 * Verifies: anon can INSERT a 'new' lead, and anon SELECT is blocked by RLS.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
    }
  } catch {
    console.error('Could not read landing-client/.env.local');
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('FAIL: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function request(method, path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  console.log('Franchise inquiry smoke test');
  console.log('Supabase URL:', url);

  // 1. Anon INSERT should succeed.
  const insert = await request('POST', 'franchise_inquiries', {
    full_name: `Smoke Test ${Date.now()}`,
    email: `smoke+${Date.now()}@test.local`,
    phone: '09170000000',
    interested_brand: 'cof-tea',
    status: 'new',
    source: 'landing',
  });
  if (!insert.ok) {
    console.error('FAIL insert:', insert.status, insert.json);
    process.exit(1);
  }
  console.log('PASS anon insert (status', insert.status + ')');

  // 2. Anon SELECT should be blocked by RLS (returns [] under default policies).
  const read = await request('GET', 'franchise_inquiries?select=id&limit=1');
  const blocked = Array.isArray(read.json) && read.json.length === 0;
  if (!blocked) {
    console.error('FAIL: anon SELECT returned rows — RLS not blocking reads:', read.status, read.json);
    process.exit(1);
  }
  console.log('PASS anon SELECT blocked by RLS');

  console.log('\nAll smoke tests passed. (Note: test row remains; clean up via service role if needed.)');
}

main().catch((err) => {
  console.error('FAIL network/runtime:', err.message);
  process.exit(1);
});
```

- [ ] **Step 3: Run the smoke test**

Run: `cd "landing-client" && npm run smoke:inquiry`
Expected: `PASS anon insert`, `PASS anon SELECT blocked by RLS`, then `All smoke tests passed.`
If insert fails with a 401/permission error, re-check the Task 2 policy was applied.

- [ ] **Step 4: Commit**

```bash
git add landing-client/scripts/smoke-test-inquiry.mjs
git commit -m "test(landing): add live inquiry smoke test"
```

---

## Task 7: Global styles & design tokens

**Files:**
- Modify: `landing-client/src/index.css`

- [ ] **Step 1: Replace `index.css` with design tokens + base styles**

`landing-client/src/index.css`:
```css
:root {
  --fc-black: #1a1410;
  --fc-black-soft: #221a14;
  --fc-orange: #e8833a;
  --fc-orange-solid: #e2691e;
  --fc-cream: #faf6f0;
  --fc-peach: #fbe3d0;
  --fc-text: #2a2118;
  --fc-text-muted: #6b5d4f;
  --fc-on-dark: #f6efe6;
  --fc-on-dark-muted: #b9a892;
  --fc-radius: 18px;
  --fc-maxw: 1120px;
  --fc-font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --fc-font-display: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  color-scheme: light;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--fc-font-body);
  color: var(--fc-text);
  background: var(--fc-cream);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 { font-family: var(--fc-font-display); margin: 0; line-height: 1.05; }
p { margin: 0; }
a { color: inherit; text-decoration: none; }

.fc-container { max-width: var(--fc-maxw); margin: 0 auto; padding: 0 24px; }
.fc-section { padding: 88px 0; }
.fc-eyebrow {
  font-family: var(--fc-font-display);
  font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--fc-orange);
}
.fc-section-title { font-size: clamp(28px, 4vw, 42px); font-weight: 800; text-align: center; }
.fc-section-sub { text-align: center; color: var(--fc-text-muted); margin-top: 10px; }

.fc-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--fc-font-display); font-weight: 700; font-size: 15px;
  padding: 13px 22px; border-radius: 999px; border: none; cursor: pointer;
  transition: transform .15s ease, opacity .15s ease;
}
.fc-btn:hover { transform: translateY(-1px); }
.fc-btn-primary { background: var(--fc-orange); color: #fff; }
.fc-btn-ghost { background: transparent; color: var(--fc-on-dark); border: 1px solid rgba(255,255,255,.35); }
.fc-btn-light { background: #fff; color: var(--fc-text); }

@media (max-width: 760px) {
  .fc-section { padding: 60px 0; }
}
```

- [ ] **Step 2: Verify build**

Run: `cd "landing-client" && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add landing-client/src/index.css
git commit -m "feat(landing): add global styles and design tokens"
```

---

## Task 8: Content data files

**Files:**
- Create: `landing-client/src/data/brands.ts`
- Create: `landing-client/src/data/steps.ts`
- Create: `landing-client/src/data/testimonials.ts`

- [ ] **Step 1: Create `brands.ts`**

```ts
export interface Brand {
  slug: 'cof-tea' | 'la-lemon' | 'keki' | 'm3ow-m3ow';
  name: string;
  tagline: string;
  initials: string;
  swatch: string;
}

export const brands: Brand[] = [
  { slug: 'cof-tea',   name: 'cof/tea cafe',        tagline: "TARA! Let's Build Your Own Cafe!",            initials: 'c/t', swatch: '#f7eec9' },
  { slug: 'la-lemon',  name: 'La Lemon',            tagline: 'When life gives you lemon, squeeze it with La Lemon.', initials: 'LL', swatch: '#e6f0cf' },
  { slug: 'keki',      name: 'KēKi Japanese Cake',  tagline: 'Delight in every bite.',                      initials: 'Kē',  swatch: '#fbdfe6' },
  { slug: 'm3ow-m3ow', name: 'm3ow m3ow',           tagline: 'A big scoop of happiness.',                   initials: 'm3',  swatch: '#f7eec9' },
];
```

- [ ] **Step 2: Create `steps.ts`**

```ts
export interface Step {
  number: number;
  title: string;
  description: string;
}

export const steps: Step[] = [
  { number: 1, title: 'Choose Your Brand',  description: 'Browse our portfolio and pick the brand that matches your vision and budget.' },
  { number: 2, title: 'Apply Online',       description: 'Fill out our franchise inquiry form and our team will reach out within 24–48 hours.' },
  { number: 3, title: 'Launch Your Store',  description: 'We handle training, setup support, and supply chain so you can open with confidence.' },
];
```

- [ ] **Step 3: Create `testimonials.ts`**

```ts
export interface Testimonial {
  quote: string;
  name: string;
  location: string;
  initials: string;
}

export const testimonials: Testimonial[] = [
  { quote: 'Franchise City made it so easy to get started. Within 3 months, my La Lemon branch was already profitable!', name: 'Maria T.', location: 'Quezon City', initials: 'MT' },
  { quote: 'The support team is always there. Best decision I made was franchising cof/tea cafe.', name: 'James R.', location: 'Cebu', initials: 'JR' },
  { quote: 'I had zero business experience. Franchise City guided me through everything.', name: 'Ana L.', location: 'Davao', initials: 'AL' },
];
```

- [ ] **Step 4: Verify build & commit**

Run: `cd "landing-client" && npm run build`
Expected: PASS.
```bash
git add landing-client/src/data/
git commit -m "feat(landing): add content data (brands, steps, testimonials)"
```

---

## Task 9: Nav, Hero, Footer

**Files:**
- Create: `Nav.tsx`/`Nav.css`, `Hero.tsx`/`Hero.css`, `Footer.tsx`/`Footer.css` under `landing-client/src/components/`

All three accept an `onApply: () => void` prop (scrolls to the inquiry section; wired in Task 13).

- [ ] **Step 1: Create `Nav.tsx` + `Nav.css`**

`Nav.tsx`:
```tsx
import { Flame } from 'lucide-react'
import './Nav.css'

export default function Nav({ onApply }: { onApply: () => void }) {
  return (
    <header className="nav">
      <div className="fc-container nav__inner">
        <a href="#top" className="nav__logo"><Flame size={20} /> FRANCHISE<span>CITY</span></a>
        <nav className="nav__links">
          <a href="#brands">Brands</a>
          <a href="#why">Why Us</a>
          <a href="#how">How It Works</a>
        </nav>
        <button className="fc-btn fc-btn-primary nav__cta" onClick={onApply}>Franchise Now</button>
      </div>
    </header>
  )
}
```

`Nav.css`:
```css
.nav { position: sticky; top: 0; z-index: 50; background: rgba(26,20,16,.92); backdrop-filter: blur(8px); }
.nav__inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.nav__logo { display: flex; align-items: center; gap: 8px; font-family: var(--fc-font-display); font-weight: 800; letter-spacing: .04em; color: var(--fc-on-dark); }
.nav__logo svg { color: var(--fc-orange); }
.nav__logo span { color: var(--fc-orange); margin-left: 4px; }
.nav__links { display: flex; gap: 28px; }
.nav__links a { color: var(--fc-on-dark-muted); font-size: 14px; font-weight: 500; }
.nav__links a:hover { color: var(--fc-on-dark); }
.nav__cta { padding: 9px 18px; font-size: 14px; }
@media (max-width: 760px) { .nav__links { display: none; } }
```

- [ ] **Step 2: Create `Hero.tsx` + `Hero.css`**

`Hero.tsx`:
```tsx
import { ArrowRight } from 'lucide-react'
import './Hero.css'

export default function Hero({ onApply }: { onApply: () => void }) {
  return (
    <section className="hero" id="top">
      <div className="hero__glow" aria-hidden />
      <div className="fc-container hero__inner">
        <span className="hero__badge">★ Start Your Business Journey</span>
        <h1 className="hero__title">
          Build Your Empire<span className="dot">.</span><br />
          <span className="hero__title-accent">Start With a Franchise<span className="dot">.</span></span>
        </h1>
        <p className="hero__sub">
          Franchise City gives aspiring entrepreneurs the tools, brands, and support to
          launch a successful business — anywhere in the Philippines.
        </p>
        <div className="hero__cta">
          <button className="fc-btn fc-btn-primary" onClick={onApply}>Franchise Now <ArrowRight size={16} /></button>
          <a className="fc-btn fc-btn-ghost" href="#brands">Explore Brands</a>
        </div>
        <ul className="hero__stats">
          <li>● 300+ Branches</li>
          <li>● Proven Brands</li>
          <li>● End-to-End Support</li>
        </ul>
      </div>
    </section>
  )
}
```

`Hero.css`:
```css
.hero { position: relative; background: var(--fc-black); color: var(--fc-on-dark); overflow: hidden; padding: 120px 0 100px; }
.hero__glow { position: absolute; inset: 0; background:
  radial-gradient(420px 280px at 78% 28%, rgba(232,131,58,.38), transparent 70%),
  radial-gradient(320px 220px at 92% 70%, rgba(232,131,58,.22), transparent 70%); }
.hero__inner { position: relative; }
.hero__badge { font-family: var(--fc-font-display); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--fc-on-dark-muted); border: 1px solid rgba(255,255,255,.18); padding: 7px 14px; border-radius: 999px; display: inline-block; }
.hero__title { font-size: clamp(40px, 7vw, 76px); font-weight: 800; margin-top: 26px; letter-spacing: -0.02em; }
.hero__title-accent { color: var(--fc-orange); }
.dot { color: var(--fc-orange); }
.hero__sub { max-width: 540px; margin-top: 22px; color: var(--fc-on-dark-muted); font-size: 17px; line-height: 1.6; }
.hero__cta { display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap; }
.hero__stats { display: flex; gap: 32px; list-style: none; padding: 0; margin: 44px 0 0; color: var(--fc-orange); font-family: var(--fc-font-display); font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; flex-wrap: wrap; }
.hero__stats li { color: var(--fc-on-dark-muted); }
```

- [ ] **Step 3: Create `Footer.tsx` + `Footer.css`**

`Footer.tsx`:
```tsx
import { Flame, Facebook, Instagram, Twitter } from 'lucide-react'
import './Footer.css'

export default function Footer({ onApply }: { onApply: () => void }) {
  return (
    <footer className="footer">
      <div className="fc-container footer__inner">
        <div className="footer__brand">
          <a href="#top" className="footer__logo"><Flame size={18} /> FRANCHISE<span>CITY</span></a>
          <p>A Filipino franchising platform helping entrepreneurs launch proven brands across the Philippines.</p>
        </div>
        <div className="footer__col">
          <h4>Navigate</h4>
          <a href="#top">Home</a>
          <a href="#brands">Brands</a>
          <a href="#how">How It Works</a>
          <button className="footer__linkbtn" onClick={onApply}>Franchise Now</button>
        </div>
        <div className="footer__col">
          <h4>Follow</h4>
          <div className="footer__social">
            <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
            <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
            <a href="#" aria-label="Twitter"><Twitter size={18} /></a>
          </div>
        </div>
      </div>
      <div className="fc-container footer__copy">© 2026 Franchise City PH. All rights reserved.</div>
    </footer>
  )
}
```

`Footer.css`:
```css
.footer { background: var(--fc-black); color: var(--fc-on-dark-muted); padding: 56px 0 28px; }
.footer__inner { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 32px; }
.footer__logo { display: inline-flex; align-items: center; gap: 8px; font-family: var(--fc-font-display); font-weight: 800; color: var(--fc-on-dark); }
.footer__logo svg, .footer__logo span { color: var(--fc-orange); }
.footer__brand p { margin-top: 14px; max-width: 320px; font-size: 14px; line-height: 1.6; }
.footer__col h4 { font-family: var(--fc-font-display); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--fc-on-dark); margin-bottom: 14px; }
.footer__col a, .footer__linkbtn { display: block; color: var(--fc-on-dark-muted); font-size: 14px; margin-bottom: 10px; background: none; border: none; padding: 0; cursor: pointer; font: inherit; text-align: left; }
.footer__col a:hover, .footer__linkbtn:hover { color: var(--fc-on-dark); }
.footer__social { display: flex; gap: 12px; }
.footer__social a { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 999px; background: rgba(255,255,255,.06); }
.footer__copy { margin-top: 40px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.08); font-size: 13px; text-align: center; }
@media (max-width: 760px) { .footer__inner { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Commit**

```bash
git add landing-client/src/components/Nav.tsx landing-client/src/components/Nav.css landing-client/src/components/Hero.tsx landing-client/src/components/Hero.css landing-client/src/components/Footer.tsx landing-client/src/components/Footer.css
git commit -m "feat(landing): add Nav, Hero, Footer components"
```

---

## Task 10: BrandsSection + BrandCard, WhyChoose

**Files:**
- Create: `BrandsSection.tsx`/`BrandsSection.css`, `BrandCard.tsx`, `WhyChoose.tsx`/`WhyChoose.css`

- [ ] **Step 1: Create `BrandCard.tsx`**

```tsx
import { ArrowRight } from 'lucide-react'
import type { Brand } from '../data/brands'

export default function BrandCard({ brand, onGetStarted }: { brand: Brand; onGetStarted: (slug: string) => void }) {
  return (
    <article className="brandcard">
      <div className="brandcard__swatch" style={{ background: brand.swatch }}>{brand.initials}</div>
      <h3 className="brandcard__name">{brand.name}</h3>
      <p className="brandcard__tagline">{brand.tagline}</p>
      <button className="brandcard__cta" onClick={() => onGetStarted(brand.slug)}>
        Get Started <ArrowRight size={14} />
      </button>
    </article>
  )
}
```

- [ ] **Step 2: Create `BrandsSection.tsx` + `BrandsSection.css`**

`BrandsSection.tsx`:
```tsx
import { brands } from '../data/brands'
import BrandCard from './BrandCard'
import './BrandsSection.css'

export default function BrandsSection({ onGetStarted }: { onGetStarted: (slug: string) => void }) {
  return (
    <section className="brands fc-section" id="brands">
      <div className="fc-container">
        <h2 className="fc-section-title">Our Brands</h2>
        <p className="fc-section-sub">Choose the brand that fits you.</p>
        <div className="brands__grid">
          {brands.map((b) => <BrandCard key={b.slug} brand={b} onGetStarted={onGetStarted} />)}
        </div>
      </div>
    </section>
  )
}
```

`BrandsSection.css`:
```css
.brands { background: var(--fc-cream); }
.brands__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; margin-top: 44px; }
.brandcard { background: #fff; border: 1px solid #efe6da; border-radius: var(--fc-radius); padding: 18px; transition: transform .15s ease, box-shadow .15s ease; }
.brandcard:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(40,30,20,.08); }
.brandcard__swatch { height: 96px; border-radius: 12px; display: grid; place-items: center; font-family: var(--fc-font-display); font-weight: 800; font-size: 28px; color: #6b5d4f; }
.brandcard__name { font-size: 17px; font-weight: 700; margin-top: 16px; }
.brandcard__tagline { color: var(--fc-text-muted); font-size: 13px; margin-top: 6px; min-height: 38px; line-height: 1.5; }
.brandcard__cta { margin-top: 14px; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: var(--fc-peach); color: var(--fc-orange-solid); border: none; border-radius: 999px; padding: 10px; font-family: var(--fc-font-display); font-weight: 700; font-size: 13px; cursor: pointer; }
.brandcard__cta:hover { background: var(--fc-orange); color: #fff; }
@media (max-width: 900px) { .brands__grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .brands__grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Create `WhyChoose.tsx` + `WhyChoose.css`**

`WhyChoose.tsx`:
```tsx
import { BadgeCheck, LifeBuoy, MapPin } from 'lucide-react'
import './WhyChoose.css'

const items = [
  { icon: BadgeCheck, title: 'Proven Brands', text: 'Handpicked brands with loyal customer bases and track records.' },
  { icon: LifeBuoy, title: 'Full Support System', text: 'From onboarding to daily ops, we guide you every step.' },
  { icon: MapPin, title: 'Nationwide Reach', text: '300+ branches and growing across the Philippines.' },
]

export default function WhyChoose() {
  return (
    <section className="why fc-section" id="why">
      <div className="fc-container">
        <h2 className="fc-section-title">Why Choose Franchise City?</h2>
        <p className="fc-section-sub">Built for Filipino entrepreneurs who want to start strong and grow further.</p>
        <div className="why__grid">
          {items.map(({ icon: Icon, title, text }) => (
            <div className="why__card" key={title}>
              <div className="why__icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`WhyChoose.css`:
```css
.why { background: var(--fc-peach); }
.why__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 44px; }
.why__card { background: rgba(255,255,255,.55); border: 1px solid rgba(255,255,255,.7); border-radius: var(--fc-radius); padding: 26px; }
.why__icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: #fff; color: var(--fc-orange-solid); }
.why__card h3 { font-size: 18px; font-weight: 700; margin-top: 16px; }
.why__card p { color: var(--fc-text-muted); font-size: 14px; margin-top: 8px; line-height: 1.6; }
@media (max-width: 820px) { .why__grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Commit**

```bash
git add landing-client/src/components/BrandsSection.tsx landing-client/src/components/BrandsSection.css landing-client/src/components/BrandCard.tsx landing-client/src/components/WhyChoose.tsx landing-client/src/components/WhyChoose.css
git commit -m "feat(landing): add Brands and WhyChoose sections"
```

---

## Task 11: StatsBand, HowToStart, Testimonials

**Files:**
- Create: `StatsBand.tsx`/`StatsBand.css`, `HowToStart.tsx`/`HowToStart.css`, `Testimonials.tsx`/`Testimonials.css`

- [ ] **Step 1: Create `StatsBand.tsx` + `StatsBand.css`**

`StatsBand.tsx`:
```tsx
import './StatsBand.css'

const stats = [
  { value: '300+', label: 'Branches Nationwide' },
  { value: '4', label: 'Franchise Brands' },
  { value: '100%', label: 'Filipino-Owned' },
]

export default function StatsBand() {
  return (
    <section className="statsband">
      <div className="fc-container statsband__grid">
        {stats.map((s) => (
          <div className="statsband__item" key={s.label}>
            <div className="statsband__value">{s.value}</div>
            <div className="statsband__label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

`StatsBand.css`:
```css
.statsband { background: var(--fc-black); color: var(--fc-on-dark); padding: 54px 0; }
.statsband__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; text-align: center; }
.statsband__value { font-family: var(--fc-font-display); font-weight: 800; font-size: clamp(34px, 5vw, 52px); color: var(--fc-orange); }
.statsband__label { font-family: var(--fc-font-display); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--fc-on-dark-muted); margin-top: 6px; }
@media (max-width: 620px) { .statsband__grid { grid-template-columns: 1fr; gap: 28px; } }
```

- [ ] **Step 2: Create `HowToStart.tsx` + `HowToStart.css`**

`HowToStart.tsx`:
```tsx
import { steps } from '../data/steps'
import './HowToStart.css'

export default function HowToStart() {
  return (
    <section className="how fc-section" id="how">
      <div className="fc-container">
        <h2 className="fc-section-title">How to Get Started</h2>
        <p className="fc-section-sub">Three simple steps from inquiry to opening day.</p>
        <div className="how__grid">
          {steps.map((s) => (
            <div className="how__step" key={s.number}>
              <div className="how__num">{s.number}</div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`HowToStart.css`:
```css
.how { background: var(--fc-cream); }
.how__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 50px; text-align: center; }
.how__num { width: 46px; height: 46px; margin: 0 auto 18px; border-radius: 999px; background: var(--fc-orange); color: #fff; display: grid; place-items: center; font-family: var(--fc-font-display); font-weight: 800; }
.how__step h3 { font-size: 18px; font-weight: 700; }
.how__step p { color: var(--fc-text-muted); font-size: 14px; margin-top: 8px; line-height: 1.6; max-width: 300px; margin-left: auto; margin-right: auto; }
@media (max-width: 820px) { .how__grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Create `Testimonials.tsx` + `Testimonials.css`**

`Testimonials.tsx`:
```tsx
import { Star } from 'lucide-react'
import { testimonials } from '../data/testimonials'
import './Testimonials.css'

export default function Testimonials() {
  return (
    <section className="tm fc-section">
      <div className="fc-container">
        <h2 className="fc-section-title">What Our Franchisees Say</h2>
        <p className="fc-section-sub">Real stories from owners building their empire with us.</p>
        <div className="tm__grid">
          {testimonials.map((t) => (
            <figure className="tm__card" key={t.name}>
              <div className="tm__stars">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption className="tm__person">
                <span className="tm__avatar">{t.initials}</span>
                <span><strong>{t.name}</strong><small>{t.location}</small></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`Testimonials.css`:
```css
.tm { background: var(--fc-peach); }
.tm__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 44px; }
.tm__card { background: rgba(255,255,255,.6); border: 1px solid rgba(255,255,255,.7); border-radius: var(--fc-radius); padding: 24px; margin: 0; }
.tm__stars { display: flex; gap: 3px; color: var(--fc-orange); }
.tm__card blockquote { margin: 14px 0 18px; font-size: 14px; line-height: 1.65; color: var(--fc-text); }
.tm__person { display: flex; align-items: center; gap: 12px; }
.tm__avatar { width: 38px; height: 38px; border-radius: 999px; background: var(--fc-orange); color: #fff; display: grid; place-items: center; font-family: var(--fc-font-display); font-weight: 700; font-size: 13px; }
.tm__person strong { display: block; font-size: 14px; }
.tm__person small { color: var(--fc-text-muted); font-size: 12px; }
@media (max-width: 820px) { .tm__grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 4: Commit**

```bash
git add landing-client/src/components/StatsBand.tsx landing-client/src/components/StatsBand.css landing-client/src/components/HowToStart.tsx landing-client/src/components/HowToStart.css landing-client/src/components/Testimonials.tsx landing-client/src/components/Testimonials.css
git commit -m "feat(landing): add StatsBand, HowToStart, Testimonials sections"
```

---

## Task 12: InquirySection (form) + FinalCTA

**Files:**
- Create: `InquirySection.tsx`/`InquirySection.css`, `FinalCTA.tsx`/`FinalCTA.css`

`InquirySection` receives the currently selected brand (`selectedBrand: string | null`) and exposes the form. It uses `validateInquiry` and `submitInquiry` from `lib/inquiry.ts` and `isSupabaseConfigured` from `lib/supabase.ts`.

- [ ] **Step 1: Create `InquirySection.tsx`**

```tsx
import { useState } from 'react'
import { brands } from '../data/brands'
import { validateInquiry, submitInquiry, type ValidationErrors } from '../lib/inquiry'
import { isSupabaseConfigured } from '../lib/supabase'
import './InquirySection.css'

export default function InquirySection({ selectedBrand }: { selectedBrand: string | null }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  const brandName = brands.find((b) => b.slug === selectedBrand)?.name ?? null
  const configured = isSupabaseConfigured()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = { fullName, email, phone, interestedBrand: selectedBrand }
    const found = validateInquiry(input)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setStatus('sending')
    setServerError('')
    const result = await submitInquiry(input)
    if (result.ok) {
      setStatus('done')
      setFullName(''); setEmail(''); setPhone('')
    } else {
      setStatus('error')
      setServerError(result.error ?? 'May naganap na error. Pakisubukan muli.')
    }
  }

  return (
    <section className="inquiry fc-section" id="inquiry">
      <div className="fc-container inquiry__inner">
        <div className="inquiry__intro">
          <span className="fc-eyebrow">Apply Now</span>
          <h2 className="inquiry__title">Start Your Franchise Journey<span className="dot">.</span></h2>
          <p>Fill out the form and our team will reach out within 24–48 hours.
            {brandName && <> You're inquiring about <strong>{brandName}</strong>.</>}
          </p>
        </div>

        {status === 'done' ? (
          <div className="inquiry__success" role="status">
            <h3>Salamat! 🎉</h3>
            <p>Na-receive namin ang iyong inquiry. Aabutin ka ng team namin within 24–48 hours.</p>
          </div>
        ) : (
          <form className="inquiry__form" onSubmit={handleSubmit} noValidate>
            <label>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
              {errors.fullName && <span className="inquiry__err">{errors.fullName}</span>}
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@email.com" />
              {errors.email && <span className="inquiry__err">{errors.email}</span>}
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917 123 4567" />
              {errors.phone && <span className="inquiry__err">{errors.phone}</span>}
            </label>
            {!configured && <p className="inquiry__err">Form temporarily unavailable (missing configuration).</p>}
            {status === 'error' && <p className="inquiry__err">{serverError}</p>}
            <button className="fc-btn fc-btn-primary inquiry__submit" disabled={!configured || status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Submit Inquiry'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `InquirySection.css`**

```css
.inquiry { background: var(--fc-cream); }
.inquiry__inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.inquiry__title { font-size: clamp(28px, 4vw, 40px); font-weight: 800; margin: 12px 0 14px; }
.inquiry__intro p { color: var(--fc-text-muted); line-height: 1.65; max-width: 420px; }
.inquiry__form { background: #fff; border: 1px solid #efe6da; border-radius: var(--fc-radius); padding: 28px; display: grid; gap: 16px; box-shadow: 0 16px 40px rgba(40,30,20,.06); }
.inquiry__form label { display: grid; gap: 7px; font-family: var(--fc-font-display); font-size: 13px; font-weight: 700; color: var(--fc-text); }
.inquiry__form input { padding: 12px 14px; border: 1px solid #e3d8c9; border-radius: 12px; font: inherit; font-weight: 400; }
.inquiry__form input:focus { outline: none; border-color: var(--fc-orange); }
.inquiry__err { color: #c4341f; font-size: 12px; font-weight: 500; }
.inquiry__submit { justify-content: center; margin-top: 4px; }
.inquiry__submit:disabled { opacity: .6; cursor: not-allowed; }
.inquiry__success { background: #fff; border: 1px solid #efe6da; border-radius: var(--fc-radius); padding: 36px; text-align: center; }
.inquiry__success h3 { font-size: 24px; font-weight: 800; }
.inquiry__success p { color: var(--fc-text-muted); margin-top: 10px; }
@media (max-width: 820px) { .inquiry__inner { grid-template-columns: 1fr; gap: 28px; } }
```

- [ ] **Step 3: Create `FinalCTA.tsx` + `FinalCTA.css`**

`FinalCTA.tsx`:
```tsx
import { ArrowRight } from 'lucide-react'
import './FinalCTA.css'

export default function FinalCTA({ onApply }: { onApply: () => void }) {
  return (
    <section className="finalcta">
      <div className="fc-container finalcta__inner">
        <h2>Ready to Be Your Own Boss?</h2>
        <p>Join hundreds of successful franchisees across the Philippines.</p>
        <button className="fc-btn fc-btn-light" onClick={onApply}>Start Your Franchise Journey <ArrowRight size={16} /></button>
      </div>
    </section>
  )
}
```

`FinalCTA.css`:
```css
.finalcta { background: var(--fc-orange-solid); color: #fff; padding: 84px 0; text-align: center; }
.finalcta h2 { font-size: clamp(28px, 4.5vw, 46px); font-weight: 800; }
.finalcta p { margin: 14px 0 28px; color: rgba(255,255,255,.9); }
```

- [ ] **Step 4: Commit**

```bash
git add landing-client/src/components/InquirySection.tsx landing-client/src/components/InquirySection.css landing-client/src/components/FinalCTA.tsx landing-client/src/components/FinalCTA.css
git commit -m "feat(landing): add inquiry form and final CTA"
```

---

## Task 13: Compose the page in App.tsx

**Files:**
- Modify: `landing-client/src/App.tsx`
- Modify: `landing-client/src/App.css`

- [ ] **Step 1: Replace `App.tsx`** — holds `selectedBrand` state, wires `onApply`/`onGetStarted` to scroll to `#inquiry`

```tsx
import { useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import BrandsSection from './components/BrandsSection'
import WhyChoose from './components/WhyChoose'
import StatsBand from './components/StatsBand'
import HowToStart from './components/HowToStart'
import Testimonials from './components/Testimonials'
import InquirySection from './components/InquirySection'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import './App.css'

export default function App() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)

  function scrollToInquiry() {
    document.getElementById('inquiry')?.scrollIntoView({ behavior: 'smooth' })
  }
  function handleGetStarted(slug: string) {
    setSelectedBrand(slug)
    scrollToInquiry()
  }

  return (
    <>
      <Nav onApply={scrollToInquiry} />
      <Hero onApply={scrollToInquiry} />
      <BrandsSection onGetStarted={handleGetStarted} />
      <WhyChoose />
      <StatsBand />
      <HowToStart />
      <Testimonials />
      <InquirySection selectedBrand={selectedBrand} />
      <FinalCTA onApply={scrollToInquiry} />
      <Footer onApply={scrollToInquiry} />
    </>
  )
}
```

- [ ] **Step 2: Replace `App.css`** (reset the scaffold styles)

```css
#root { width: 100%; }
```

- [ ] **Step 3: Run the dev server and verify visually**

Run: `cd "landing-client" && npm run dev`
Expected: page renders at the printed localhost URL with all sections in order (Nav → Hero → Brands → Why → Stats → How → Testimonials → Inquiry → FinalCTA → Footer). Clicking "Franchise Now", "Start Your Franchise Journey", and any brand "Get Started" scrolls to the inquiry form; "Get Started" shows "You're inquiring about <brand>".

- [ ] **Step 4: Commit**

```bash
git add landing-client/src/App.tsx landing-client/src/App.css
git commit -m "feat(landing): compose landing page in App"
```

---

## Task 14: Final verification

- [ ] **Step 1: Lint**

Run: `cd "landing-client" && npm run lint`
Expected: no errors.

- [ ] **Step 2: Unit tests**

Run: `cd "landing-client" && npm test`
Expected: all `inquiry` tests pass.

- [ ] **Step 3: Production build**

Run: `cd "landing-client" && npm run build`
Expected: `tsc -b` + Vite build succeed, `dist/` produced.

- [ ] **Step 4: Live submit check**

Run: `cd "landing-client" && npm run dev`, open the page, submit the inquiry form with valid data.
Expected: success state appears. Confirm a new row exists in `franchise_inquiries` (via Supabase dashboard or service-role query) with the correct `interested_brand`.

- [ ] **Step 5: Responsive check**

In the browser, narrow to mobile width (~380px).
Expected: nav links hide, grids collapse to one/two columns, no horizontal overflow.

- [ ] **Step 6: Final commit (if any tweaks made)**

```bash
git add -A
git commit -m "chore(landing): final verification fixes"
```

---

## Self-Review Notes (author checklist — already verified)

- **Spec coverage:** workspace location (T1), Supabase table + RLS (T2), validation (T3), payload (T4), client/submit (T5), live RLS smoke (T6), tokens/visual identity (T7), content incl. all 4 brands (T8), all 9 page sections (T9–T13), error/disabled states + degrade-to-anchor (T9/T12), testing (T3/T4/T6/T14). ✔
- **interested_brand** captured silently via `handleGetStarted` → `selectedBrand` → `InquirySection`, never a visible field. ✔ (matches spec confirmation)
- **Type consistency:** `InquiryInput`, `ValidationErrors`, `InquiryRow`, `Brand`, `Step`, `Testimonial` defined once and reused; `validateInquiry`/`buildInquiryPayload`/`submitInquiry`/`isSupabaseConfigured` names consistent across tasks. ✔
- **Footer links** Store Locations omitted from nav per YAGNI; remaining links are anchors/`#`. ✔
