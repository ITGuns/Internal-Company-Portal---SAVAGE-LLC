# Client Delivery Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the admin Client Delivery route so forms, records, empty states, and mobile layout meet the repo's frontend quality gates.

**Architecture:** Keep the work inside the existing client operations surface. `WorkItemsPanel` owns the delivery work-item form and list, while `production-records/shared.tsx` owns reusable production-record form controls.

**Tech Stack:** Next.js, React, Tailwind CSS v4, lucide-react, Node test runner, Playwright visual smoke.

---

### Task 1: Shared Production Record Control Hardening

**Files:**
- Modify: `frontend/src/components/forms/FormField.tsx`
- Modify: `frontend/src/components/client-portal/production-records/shared.tsx`

- [x] **Step 1: Add control metadata to `TextareaField`**

Update `TextareaField` to accept `name`, `autoComplete`, and `rows`, pass them to `<textarea>`, and default `autoComplete` to `"off"` for non-auth operational fields.

- [x] **Step 2: Add control metadata to inline record controls**

Add `name="record-status"` and `name="record-visible-to-client"` to the shared inline select and checkbox so the controls are identifiable and satisfy form-control metadata checks.

- [x] **Step 3: Keep focus and touch states intact**

Preserve the existing `focus:ring-2`, `min-h-10`, and checkbox label hit target classes.

### Task 2: Delivery Work Item UX States

**Files:**
- Modify: `frontend/src/components/client-portal/AdminClientProjectsPanel.tsx`
- Modify: `frontend/src/components/client-portal/AdminClientUpdatesPanel.tsx`
- Modify: `frontend/src/components/client-portal/production-records/WorkItemsPanel.tsx`
- Modify: `frontend/src/app/operations/clients/delivery/page.tsx`

- [x] **Step 1: Add field metadata**

Give work-item inputs stable names and autocomplete behavior:

```tsx
name="work-title"
autoComplete="off"
```

Use equivalent unique names for edit fields such as `work-title-${item.id}` and `work-progress-${item.id}`.

- [x] **Step 2: Improve empty state behavior**

When the selected client has no work items, render a compact empty state under the create form instead of an empty list region.

- [x] **Step 3: Harden long content**

Use `break-words` on completed-work titles and preserve date metadata with readable small text.

- [x] **Step 4: Use guideline-compliant placeholder copy**

Change text-area placeholder copy to end with the ellipsis character, for example:

```tsx
placeholder="Add client-visible task details…"
```

### Task 3: Documentation And Verification

**Files:**
- Modify: `docs/dev-notes.md`

- [x] **Step 1: Add session note**

Record the additional Client Delivery polish pass, changed files, decisions, and verification commands.

- [x] **Step 2: Run focused checks**

Run:

```powershell
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
VISUAL_SMOKE_ROUTES='/operations/clients/delivery' npm --prefix frontend run test:visual
git diff --check -- frontend/src/components/forms/FormField.tsx frontend/src/components/client-portal/AdminClientProjectsPanel.tsx frontend/src/components/client-portal/AdminClientUpdatesPanel.tsx frontend/src/components/client-portal/production-records/shared.tsx frontend/src/components/client-portal/production-records/WorkItemsPanel.tsx frontend/src/app/operations/clients/delivery/page.tsx docs/dev-notes.md docs/superpowers/plans/2026-06-02-client-delivery-polish.md
```

- [x] **Step 3: Browser recheck**

Render `/operations/clients/delivery?client=cmpj9xge1000o9kju2bfwtejr` at desktop and mobile widths. Check no console errors, no failed toasts, no horizontal overflow, no clipped content, and no undersized controls.

### Self-Review

- Spec coverage: Covers skill-first planning, delivery UI continuation, frontend best-practice gates, and implementation without waiting for approval.
- Placeholder scan: No TBD/TODO placeholders.
- Type consistency: Uses existing component names and route paths only.
