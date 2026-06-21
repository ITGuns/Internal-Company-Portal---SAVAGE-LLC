# Browser Experience Review

Use this reference when Vibe Auto Research touches UI, navigation, forms, dashboards, responsive layout, or user workflow.

## Goal

Review the actual website or app experience, not just the code. The question is whether a real user can understand, navigate, and complete the workflow without friction.

## When Browser Review Is Required

Use Browser/in-app browser when practical for:

- frontend implementation or redesign
- visual polish requests
- navigation or routing changes
- dashboard, table, form, modal, or menu changes
- loading, empty, error, success, disabled, or focus-state work
- mobile/responsive changes
- client/admin workflow changes
- release checks that include user-facing routes

If the app cannot be started or accessed, explain the blocker and use static review plus any available screenshots or visual tests as a fallback.

## Tool Routing

- Browser/in-app browser is the default for local web apps, localhost routes, DOM inspection, console/network-visible issues, and responsive checks.
- Chrome plugin is for explicit Chrome/Google Chrome requests, existing Chrome tabs, logged-in Chrome profiles, cookies/sessions, extensions, or remote authenticated sites.
- Computer Use is for actual Windows desktop/app surfaces: native apps, occluded windows, file pickers, Office/export review, or browser UI that DOM tools cannot inspect.
- Repo visual-smoke scripts are preferred for broad, safe route/persona coverage when they exist; use Browser, Chrome, or Computer Use to inspect visible issues and workflows directly.
- If the requested surface is unavailable, mark the browser review as blocked or not applicable and report the fallback evidence.

## Review Passes

Choose the audit scope before opening the browser:

- **Affected-flow audit**: focused UI or workflow work. Check every changed route, important control, form path, dialog, state transition, and navigation path.
- **Full-feature audit**: cross-cutting shell, auth, role, navigation, dashboard, theme, routing, shared-state, release/publish, broad redesign, or explicit "all features" requests. Check primary admin, employee, client, and anonymous/auth workflows across desktop and mobile where practical.
- **Blocked or not applicable**: document why the app could not be rendered or why the task has no browser surface, then use static review, existing smoke tests, screenshots, or manual instructions as fallback.

### 1. First Impression

- Is the page purpose clear in the first viewport?
- Does the hierarchy guide the eye to the next action?
- Does the screen feel like the product domain, not a generic template?
- Are density, spacing, and typography appropriate for the user's job?

### 2. Flow

- Can the target user complete the primary task without guessing?
- Are entry points, next steps, back paths, and success states clear?
- Are modals, side panels, filters, tabs, and deep links preserving context?
- Are errors actionable, not vague?

### 3. Visual Quality

- Check alignment, spacing, wrapping, overflow, clipping, and overlap.
- Check repeated components for consistent size, rhythm, and styling.
- Check buttons, inputs, tables, cards, and navigation feel like one system.
- Check realistic content, long labels, empty data, and dense states.

### 4. Responsive Behavior

- Check desktop and mobile widths at minimum.
- Confirm navigation remains usable on mobile.
- Confirm tables, grids, cards, toolbars, and forms have intentional small-screen behavior.
- Check touch targets and button labels.

### 5. Interaction And Accessibility

- Check hover, focus, active, disabled, loading, empty, error, and success states when relevant.
- Confirm important controls have accessible names or visible labels.
- Confirm keyboard/focus behavior for forms, menus, dialogs, and primary actions where practical.
- Confirm state is not communicated by color alone.

### 6. Technical Browser Health

- Check for console errors.
- Check obvious failed network/API calls.
- Check missing images, fonts, icons, and assets.
- Reload after code changes when the framework or runtime may not hot-reload reliably.

## Evidence To Report

Summarize browser evidence in normal language:

- route or URL checked
- viewport sizes checked
- core task path attempted
- visible issues found and fixed
- whether the pass was affected-flow, full-feature, blocked, or not applicable
- remaining limitations, such as blocked auth or unavailable backend

Do not dump raw console logs unless the user asks. Quote only the error text that matters.
