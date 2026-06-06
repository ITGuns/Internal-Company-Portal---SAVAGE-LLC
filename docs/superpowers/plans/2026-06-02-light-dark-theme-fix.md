# Light And Dark Theme Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MyDeskii render correctly in both dark and light modes while preserving the boss-approved premium command-center direction.

**Architecture:** Treat theme as a shared frontend contract, not a page-by-page patch. First consolidate global CSS variables, then migrate the shared shell and client workspace surfaces to those variables, then prove both themes through visual smoke coverage.

**Tech Stack:** Next.js, React, Tailwind CSS v4, CSS custom properties, Playwright visual smoke script, lucide-react.

---

## Evidence

- `frontend/src/app/globals.css` already has runtime theme support through `html[data-theme="dark"]`, `html.dark`, and `html[data-theme="light"]`, but dark variables are duplicated and light mode does not override all shared variables.
- `frontend/src/app/layout.tsx` injects an initial theme script before hydration and defaults to dark when no saved theme exists.
- `frontend/src/components/ThemeToggle.tsx` already updates `data-theme`, `.dark`, and `localStorage`.
- `frontend/src/components/Header.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Card.tsx`, and most shared shell elements already use CSS variables.
- `frontend/src/components/workspace/ProductionWorkspace.tsx`, `frontend/src/components/client-portal/ClientOperationsShell.tsx`, and `frontend/src/app/client/page.tsx` still use hard-coded cyan-on-dark classes for deep workspace panels.
- The live in-app browser tab is currently on `/operations/clients?client=...` in dark mode with `data-theme="dark"` and `.dark` set on `<html>`.
- `--workspace-ink`, `--workspace-ink-soft`, `--workspace-ink-muted`, `--workspace-ink-foreground`, and `--workspace-ink-border` are used by workspace components but are not defined in the sampled root theme variables.
- `frontend/scripts/visual-smoke.mjs` covers client/admin routes at desktop and mobile sizes, but it does not currently run a light/dark theme matrix.

## File Structure

- Modify: `frontend/src/app/globals.css`
  - Owns the canonical theme variables and app-wide native control/theme behavior.
- Modify: `frontend/src/app/layout.tsx`
  - Owns initial no-flash theme setup before hydration.
- Modify: `frontend/src/components/ThemeToggle.tsx`
  - Owns runtime switching, accessible labels, and persistence.
- Modify: `frontend/src/components/Header.tsx`
  - Owns top-shell theme consistency.
- Modify: `frontend/src/components/Sidebar.tsx`
  - Owns side-shell theme consistency and mobile scrim.
- Modify: `frontend/src/components/Button.tsx`
  - Owns legacy shared button variants.
- Modify: `frontend/src/components/ui/button.tsx`
  - Owns shadcn/base-ui button variants.
- Modify: `frontend/src/components/workspace/ProductionWorkspace.tsx`
  - Owns deep workspace panels, metric strips, and command-center surfaces.
- Modify: `frontend/src/components/client-portal/ClientOperationsShell.tsx`
  - Owns admin client operations hero, top nav, and client summary copy.
- Modify: `frontend/src/app/client/page.tsx`
  - Owns client-facing hero/workspace content that uses the same hard-coded deep colors.
- Modify: `frontend/scripts/visual-smoke.mjs`
  - Owns automated route smoke checks and should add theme coverage.
- Modify after implementation: `docs/dev-notes.md`
  - Record what changed and how it was verified.

## Task 1: Consolidate Theme Variables

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Inventory duplicate and missing variables**

Run:

```powershell
rg -n "data-theme|html\.dark|--workspace-ink|--sidebar|--status-|--card-bg|--background|color-scheme" frontend/src/app/globals.css
```

Expected: confirm the duplicate dark blocks, the light block, and all workspace variable usages.

- [ ] **Step 2: Make `:root` the canonical dark default**

Keep dark as the default product style. Ensure the root block includes these groups:

```css
:root {
  color-scheme: dark;
  --background: #050816;
  --foreground: #f5fbff;
  --muted: #93a6bd;
  --muted-foreground: #93a6bd;
  --card-bg: #09111f;
  --card-surface: #0d1a2b;
  --surface-raised: #0b1424;
  --surface-hover: #10233a;
  --border: rgba(102, 220, 255, 0.18);
  --accent: #17d9f5;
  --accent-foreground: #041018;
  --accent-secondary: #f23bbf;
  --accent-secondary-foreground: #fff6fc;
  --workspace-ink: #070d1a;
  --workspace-ink-soft: #0d1a2b;
  --workspace-ink-muted: rgba(213, 241, 255, 0.68);
  --workspace-ink-foreground: #f5fbff;
  --workspace-ink-border: rgba(102, 220, 255, 0.2);
  --workspace-ink-accent: #8eeeff;
  --workspace-ink-accent-soft: rgba(23, 217, 245, 0.12);
  --scrim: rgba(5, 8, 22, 0.62);
}
```

- [ ] **Step 3: Make `html[data-theme="light"]` fully override the shared contract**

Add light values for every shared variable used by shell/workspace components, including `--sidebar`, status tokens, scrollbars, `--workspace-ink-*`, and `--scrim`.

Use a light command-center style: off-white background, white panels, ink text, visible cool borders, cyan primary accent, and restrained magenta secondary accent.

- [ ] **Step 4: Keep only one runtime dark override**

Keep one `html[data-theme="dark"], html.dark` block. Remove conflicting duplicate values inside other dark blocks so the final computed theme is predictable.

- [ ] **Step 5: Re-run the inventory command**

Run:

```powershell
rg -n "html\[data-theme=\"dark\"\]|html\.dark|html\[data-theme=\"light\"\]|--workspace-ink" frontend/src/app/globals.css
```

Expected: one clear light block, one clear runtime dark block, workspace tokens defined for both.

## Task 2: Tighten Theme Initialization And Toggle

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Keep the initial script dark-default and deterministic**

Confirm the script still does this exact behavior:

```js
var t = localStorage.getItem('theme');
if (t === 'light') {
  r.setAttribute('data-theme', 'light');
  r.classList.remove('dark');
} else {
  r.setAttribute('data-theme', 'dark');
  r.classList.add('dark');
}
```

Do not introduce system-preference defaulting unless the user asks for it, because the product design direction defaults to dark.

- [ ] **Step 2: Improve toggle accessible text**

Update the toggle label to describe the next action:

```tsx
aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
title={isDark ? "Switch to light mode" : "Switch to dark mode"}
```

Keep `aria-pressed={isDark}` and the current fixed `h-10 w-10` sizing.

## Task 3: Normalize Shared Shell And Buttons

**Files:**
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/Button.tsx`
- Modify: `frontend/src/components/ui/button.tsx`

- [ ] **Step 1: Replace shell-only hard-coded overlays**

Change the mobile sidebar overlay from hard-coded slate to the shared scrim token:

```tsx
className="fixed inset-0 z-40 bg-[var(--scrim)] backdrop-blur-[2px] md:hidden"
```

- [ ] **Step 2: Convert legacy success/danger button variants to semantic tokens**

Update `frontend/src/components/Button.tsx` variants:

```ts
success: 'border border-[var(--status-completed)] bg-[var(--status-completed)] text-white hover:brightness-105',
danger: 'border border-[var(--status-blocked)] bg-[var(--status-blocked)] text-white hover:brightness-105',
```

- [ ] **Step 3: Verify the shadcn/base-ui button remains tokenized**

Keep `frontend/src/components/ui/button.tsx` on semantic classes like `bg-primary`, `text-primary-foreground`, `bg-secondary`, `text-destructive`, `border-border`, and `ring`.

Only adjust dark-only variants if they produce a visible light-mode contrast problem during browser verification.

## Task 4: Fix Deep Workspace Components

**Files:**
- Modify: `frontend/src/components/workspace/ProductionWorkspace.tsx`
- Modify: `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- Modify: `frontend/src/app/client/page.tsx`

- [ ] **Step 1: Replace hard-coded deep cyan text with workspace tokens**

In `ProductionWorkspace.tsx`, replace hard-coded classes like:

```tsx
text-cyan-300
text-cyan-200/80
text-cyan-100
text-cyan-100/70
text-cyan-50
border-cyan-200/15
bg-cyan-400/10
```

with tokenized equivalents:

```tsx
text-[var(--workspace-ink-accent)]
text-[var(--workspace-ink-muted)]
text-[var(--workspace-ink-foreground)]
border-[var(--workspace-ink-border)]
bg-[var(--workspace-ink-accent-soft)]
```

- [ ] **Step 2: Tokenize the client operations hero detail column**

In `ClientOperationsShell.tsx`, replace cyan-on-dark classes in the status badge, labels, website link, slug, tier, and members values with workspace token classes.

Use this pattern:

```tsx
className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]"
className="mt-1 truncate text-sm font-semibold text-[var(--workspace-ink-foreground)]"
className="inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--workspace-ink-foreground)] transition-colors hover:bg-[var(--workspace-ink-accent-soft)] hover:text-[var(--workspace-ink-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-ink-accent)]"
```

- [ ] **Step 3: Apply the same token pattern to the client-facing landing workspace**

In `frontend/src/app/client/page.tsx`, replace hard-coded cyan hero classes with the same workspace tokens so the restored client side works in both themes.

- [ ] **Step 4: Keep route structure unchanged**

Do not rename routes, query parameters, API calls, or client navigation constants. This task is visual/theme-only.

## Task 5: Add Theme Matrix To Visual Smoke

**Files:**
- Modify: `frontend/scripts/visual-smoke.mjs`

- [ ] **Step 1: Add theme configuration**

Add:

```js
const themes = (process.env.VISUAL_SMOKE_THEMES || "dark,light")
  .split(",")
  .map((theme) => theme.trim())
  .filter((theme) => theme === "dark" || theme === "light");
```

- [ ] **Step 2: Apply theme before page load**

Update `installMocks` to accept `theme`, then set theme storage and root attributes:

```js
async function installMocks(page, theme) {
  await page.addInitScript(({ currentUser, themeName }) => {
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    localStorage.setItem("accessToken", "visual-smoke-token");
    localStorage.setItem("refreshToken", "visual-smoke-refresh-token");
    localStorage.setItem("theme", themeName);
    document.documentElement.setAttribute("data-theme", themeName);
    document.documentElement.classList.toggle("dark", themeName === "dark");
  }, { currentUser: user, themeName: theme });
}
```

Keep the existing API mocks intact.

- [ ] **Step 3: Loop routes by theme and viewport**

Change the main loop so each route is checked for each theme and each viewport:

```js
for (const routePath of routesToCheck) {
  for (const theme of themes) {
    for (const viewport of viewports) {
      results.push(await inspectRoute(browser, routePath, viewport, theme));
    }
  }
}
```

Include `theme` in each result and summary row.

## Task 6: Verify

**Files:**
- No direct edits unless verification finds issues.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm --prefix frontend test
```

Expected: all frontend unit tests pass.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm --prefix frontend run lint
```

Expected: no ESLint errors.

- [ ] **Step 3: Run build**

Run:

```powershell
npm --prefix frontend run build
```

Expected: production build completes.

- [ ] **Step 4: Run focused visual smoke in both themes**

Run:

```powershell
$env:VISUAL_SMOKE_ROUTES = "/operations/clients,/operations/clients/delivery,/client,/dashboard,/login"
$env:VISUAL_SMOKE_THEMES = "dark,light"
npm --prefix frontend run test:visual
```

Expected: no login redirects, no horizontal overflow, no small controls, no page errors in either theme.

- [ ] **Step 5: Browser review the current route**

Use the in-app browser on:

```text
http://localhost:3000/operations/clients?client=cmpj9xge1000o9kju2bfwtejr
```

Check dark and light:

- page background, header, sidebar, top client nav, client picker, hero, metric strip, and detail panels are readable
- no cyan-on-white unreadable text
- no missing backgrounds from undefined workspace variables
- focus states are visible
- no horizontal overflow on desktop or mobile
- no console errors caused by the theme changes

## Task 7: Document

**Files:**
- Modify: `docs/dev-notes.md`
- Modify only if design language changes: `DESIGN.md`

- [ ] **Step 1: Add a dev-notes session summary**

Use the repo format:

```md
## 2026-06-02 - Light And Dark Theme Fix

### Completed
- Consolidated MyDeskii light/dark theme variables.
- Tokenized the shared shell and client workspace surfaces.
- Added visual smoke coverage for dark and light mode.

### Files Changed
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/workspace/ProductionWorkspace.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/scripts/visual-smoke.mjs`
- `docs/dev-notes.md`

### Decisions Made
- Kept dark mode as the default MyDeskii visual direction.
- Treated light mode as a premium operational theme, not a generic white inversion.
- Preserved all routes and API contracts.

### How to Test
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_ROUTES='/operations/clients,/operations/clients/delivery,/client,/dashboard,/login' VISUAL_SMOKE_THEMES='dark,light' npm --prefix frontend run test:visual`

### Next Steps
- Continue token migration on lower-priority payroll, file directory, and chat internals as those screens enter review scope.
```

## Guardrails

- Do not change backend, Prisma, auth, routes, query params, or API contracts.
- Do not commit unless the user explicitly asks.
- Do not broad-rewrite every colored badge in the app in this pass.
- Preserve the existing dirty worktree and unrelated user changes.
- Prefer token migration and browser verification over visual guessing.
