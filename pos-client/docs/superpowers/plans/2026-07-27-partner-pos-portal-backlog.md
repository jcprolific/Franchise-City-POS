# Partner POS + Portal Backlog Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes track progress.

**Goal:** Ship partner Franchise City POS/portal fixes (P0) then barista EOD → HQ (P1).

**Architecture:** Changes stay in `pos-client`. Permissions gain an `eod` capability. EOD auto-fills from existing `refreshEodFromPos` / create path; qty inputs become read-only for drink/addon lines.

**Tech Stack:** React 19, TypeScript, Vite, Supabase JS

---

### Task 1: Login — remove guest + tablet portrait
- Modify: `src/pages/LoginPage.tsx`, `LoginPage.css`, `App.tsx` (guest mode if needed)

### Task 2: POS + button hit target
- Modify: `POSPage.css`, `ProductCard.tsx` / related CSS

### Task 3: Support tickets branch filter + portal dedupe + Current Stocks hub
- Modify: `supportTicketService.ts`, `SupportModule.tsx`, `PortalHubPage.tsx`, `InventoryPage.tsx`, announcements modules/services

### Task 4: EOD Yesterday’s removal + lock qty + barista eod permission
- Modify: `eodReportService.ts`, `EodReportPage.tsx`, `permissions.ts`, Sidebar nav
