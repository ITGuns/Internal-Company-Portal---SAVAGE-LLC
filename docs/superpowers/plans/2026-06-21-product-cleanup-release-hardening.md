# Product Cleanup Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove repo weight, stale generated files, unused dependencies, and release blockers so Deskii can move toward a cleaner product-ready baseline.

**Architecture:** Keep behavior unchanged. This is a cleanup and verification slice, so every removal must be backed by `rg` evidence and followed by package lock updates plus the release gate.

**Tech Stack:** Next.js frontend, Express/Prisma backend, npm workspaces by package folder, Docker Compose, Prisma, Playwright visual smoke.

---

## Current Evidence Snapshot

- Branch after sync: `main` at `b8b5f80`.
- Post-pull status: clean and aligned with `origin/main`.
- Audit state after sync: root, backend, and frontend `npm audit --audit-level=high` all pass.
- Remaining Ponytail candidates:
  - Generated artifacts: `reports/client-portal-ui-remodel.html`, `temp.zip`, `temp_docx/`, `update_docx.js`.
  - Package-only frontend deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@types/pako`.
  - Package-only backend deps: `express-session`, `@types/express-session`, `rxjs`.
  - Likely unused backend runtime dep: `docx` package; file upload support only uses the string extension and MIME validation, not the package.
  - Unused shadcn/Base UI button path: `frontend/src/components/ui/button.tsx`, `@base-ui/react`, `class-variance-authority`.
  - DaisyUI is only meaningfully present in `frontend/tailwind.config.js` and two `btn` classes in `frontend/src/components/ErrorBoundary.tsx`.

## Files To Touch

- Delete: `reports/client-portal-ui-remodel.html`
- Delete: `temp.zip`
- Delete: `temp_docx/`
- Delete: `update_docx.js`
- Delete: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `docs/dev-notes.md`

## Task 1: Remove Generated And Temporary Artifacts

**Files:**
- Delete: `reports/client-portal-ui-remodel.html`
- Delete: `temp.zip`
- Delete: `temp_docx/`
- Delete: `update_docx.js`

- [x] **Step 1: Confirm these files are not referenced**

Run:

```powershell
rg -n "client-portal-ui-remodel|temp_docx|temp\.zip|update_docx" -g "!node_modules"
```

Expected: only self-references or no application references. If an app/runtime file references them, stop and replan.

- [x] **Step 2: Remove the generated files**

Run:

```powershell
git rm -r -- reports/client-portal-ui-remodel.html temp.zip temp_docx update_docx.js
```

Expected: git stages only those generated files for deletion.

- [x] **Step 3: Verify no stale references remain**

Run:

```powershell
rg -n "client-portal-ui-remodel|temp_docx|temp\.zip|update_docx" -g "!node_modules"
git status --short
```

Expected: no references, and git status shows only expected deletions.

## Task 2: Remove Unused Dependency Packages

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

- [x] **Step 1: Reconfirm package-only usage**

Run:

```powershell
rg -n "@dnd-kit|DndContext|SortableContext|useSortable" frontend -g "!node_modules" -g "!package-lock.json"
rg -n "pako" frontend -g "!node_modules" -g "!package-lock.json"
rg -n "express-session" backend -g "!node_modules" -g "!package-lock.json"
rg -n "rxjs" backend -g "!node_modules" -g "!package-lock.json"
rg -n "from ['""]docx|require\(['""]docx" backend -g "!node_modules" -g "!package-lock.json"
```

Expected: each dependency appears only in package metadata or not at all. If source usage appears, remove that package from this task.

- [x] **Step 2: Uninstall unused frontend packages**

Run:

```powershell
npm --prefix frontend uninstall @dnd-kit/core @dnd-kit/sortable @types/pako
```

Expected: `frontend/package.json` and `frontend/package-lock.json` update.

- [x] **Step 3: Uninstall unused backend packages**

Run:

```powershell
npm --prefix backend uninstall express-session @types/express-session rxjs docx
```

Expected: `backend/package.json` and `backend/package-lock.json` update.

- [x] **Step 4: Run package-level checks**

Run:

```powershell
npm --prefix frontend test
npm --prefix backend test
```

Expected: both test suites pass. If upload validation fails after removing `docx`, inspect `backend/src/uploads/upload.validation.ts` and keep MIME validation string-based.

## Task 3: Remove Unused shadcn/Base UI Button Path

**Files:**
- Delete: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [x] **Step 1: Confirm no imports use the UI button primitive**

Run:

```powershell
rg -n "@/components/ui/button|components/ui/button|buttonVariants|ButtonPrimitive" frontend/src -g "!node_modules"
```

Expected: only `frontend/src/components/ui/button.tsx` appears.

- [x] **Step 2: Delete the unused file**

Run:

```powershell
git rm -- frontend/src/components/ui/button.tsx
```

Expected: only the unused button primitive is deleted. Do not touch `frontend/src/components/Button.tsx`.

- [x] **Step 3: Uninstall unused UI helper packages**

Run:

```powershell
npm --prefix frontend uninstall @base-ui/react class-variance-authority
```

Expected: frontend package files update and existing `frontend/src/components/Button.tsx` remains the active button component.

- [x] **Step 4: Verify frontend still builds**

Run:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: lint and build pass.

## Task 4: Remove DaisyUI From The Frontend

**Files:**
- Modify: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [x] **Step 1: Replace DaisyUI classes in `ErrorBoundary.tsx`**

Replace the fallback markup with token/Tailwind classes:

```tsx
return (
  <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
    <div className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl">
      <h2 className="text-2xl font-semibold text-red-400">
        Something went wrong
      </h2>

      <p className="mt-3 text-sm text-[var(--muted)]">
        The application encountered an unexpected error. Your current session data is still stored locally.
      </p>

      {this.state.error && (
        <div className="my-4 max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm">
          <pre className="whitespace-pre-wrap text-red-300">
            <code>{this.state.error.toString()}</code>
          </pre>
          {this.state.errorInfo?.componentStack && (
            <pre className="mt-3 whitespace-pre-wrap text-xs text-amber-300">
              <code>{this.state.errorInfo.componentStack}</code>
            </pre>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-raised)]"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
        <button
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
          onClick={this.handleReset}
        >
          Try Again
        </button>
      </div>

      <div className="mt-4 text-xs text-[var(--muted)]">
        If this error persists, contact support with the error details above.
      </div>
    </div>
  </div>
);
```

- [x] **Step 2: Remove DaisyUI from Tailwind config**

Change `frontend/tailwind.config.js` to:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [x] **Step 3: Uninstall DaisyUI**

Run:

```powershell
npm --prefix frontend uninstall daisyui
```

Expected: package files update.

- [x] **Step 4: Verify no DaisyUI classes remain**

Run:

```powershell
rg -n "daisyui|bg-base|text-base|card-|mockup-code|btn btn" frontend -g "!node_modules" -g "!package-lock.json"
```

Expected: no DaisyUI usage remains.

## Task 5: Run The Full Release Gate

**Files:**
- Modify: none unless checks uncover issues.

- [x] **Step 1: Run formatting and skill checks**

Run:

```powershell
git diff --check
npm run check:skills
```

Expected: both pass.

- [x] **Step 2: Run backend validation**

Run:

```powershell
npm --prefix backend test
npm --prefix backend run build
npm --prefix backend exec prisma validate
```

Expected: tests pass, TypeScript build passes, Prisma schema validates.

- [x] **Step 3: Run frontend validation**

Run:

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: tests, lint, and build pass.

- [x] **Step 4: Run security audits**

Run:

```powershell
npm audit --audit-level=high
npm --prefix backend audit --audit-level=high
npm --prefix frontend audit --audit-level=high
```

Expected: all report `found 0 vulnerabilities`.

- [x] **Step 5: Validate Docker Compose config**

Run:

```powershell
$env:JWT_SECRET='validation-jwt-secret'
$env:REFRESH_TOKEN_SECRET='validation-refresh-secret'
$env:POSTGRES_PASSWORD='validation-postgres-password'
docker compose config
```

Expected: Docker Compose prints normalized config without errors.

## Task 6: Update Documentation And Commit

**Files:**
- Modify: `docs/dev-notes.md`

- [x] **Step 1: Add a concise dev note**

Add a dated entry:

```md
## 2026-06-21 - Session Summary

### Completed
- Removed generated artifacts and unused dependencies identified by the Ponytail cleanup audit.
- Replaced the DaisyUI-only error boundary fallback with project token/Tailwind styling.
- Verified frontend, backend, audits, Prisma, and Docker Compose after cleanup.

### Files Changed
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/components/ErrorBoundary.tsx`
- `frontend/tailwind.config.js`
- Deleted generated and unused files listed in the cleanup plan.

### Decisions Made
- Keep the existing app-level `frontend/src/components/Button.tsx` as the only button component.
- Treat generated DOCX extraction files and old HTML reports as audit artifacts, not product source.

### How to Test
- `npm run check:skills`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm audit --audit-level=high`
- `npm --prefix backend audit --audit-level=high`
- `npm --prefix frontend audit --audit-level=high`
- `docker compose config`

### Next Steps
- Run visual smoke on affected frontend routes if any UI changes expand beyond `ErrorBoundary`.
```

- [x] **Step 2: Review the final diff**

Run:

```powershell
git status --short
git diff --stat
git diff -- frontend/src/components/ErrorBoundary.tsx frontend/tailwind.config.js frontend/package.json backend/package.json docs/dev-notes.md
```

Expected: diff contains only planned cleanup changes.

- [ ] **Step 3: Commit cleanup after approval**

Run after user approval:

```powershell
git add -A
git commit -m "chore: remove stale artifacts and unused dependencies"
```

Expected: one focused cleanup commit.

## Self-Review

- Spec coverage: covers branch sync, stale artifact removal, unused dependency removal, DaisyUI cleanup, verification, docs, and commit handoff.
- Placeholder scan: no placeholders or TBD tasks.
- Type consistency: keeps existing `frontend/src/components/Button.tsx`; deletes only the unused shadcn/Base UI primitive.
