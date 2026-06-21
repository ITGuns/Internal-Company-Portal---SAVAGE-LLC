# Frontend Redesign Plan

## Direction

MyDeskii stays MyDeskii: an internal operations portal for SAVAGE LLC, not a renamed consulting-site template. The boss-approved reference should guide the visual style toward a premium dark command center with neon cyan and magenta accents, sharp metric cards, glassy dark panels, and stronger executive-dashboard polish.

The redesign must still behave like a work product. It should be readable, compact, status-rich, predictable, accessible, and fast for repeated daily use.

## Design Inputs

- Boss reference: dark premium command-center style, cyan primary action, magenta secondary highlights, high-contrast cards, data panels, precise borders, and restrained glow.
- MyDeskii product register: internal tasks, daily logs, payroll, chat, files, announcements, operations, and employee approval workflows.
- Impeccable: product register, restrained color, familiar app patterns, no nested cards, no decorative motion.
- Emil Kowalski design engineering: small feedback details, fast transitions, purposeful motion only.
- Taste skill: stronger hierarchy, non-generic spacing, careful typography, complete loading, empty, error, disabled, and success states.
- Frontend visual quality skill: responsive grids, no text overlap, stable dimensions, readable typography, consistent spacing, focus states, and real browser verification.
- Web Interface Guidelines: accessible labels, semantic actions/navigation, visible focus, form labels, `Intl.*` formatting, URL-reflected UI state, reduced motion, safe dark mode, and no `transition: all`.
- React/Next.js best practices: reduce request waterfalls, avoid unnecessary client bundle weight, use direct imports, split heavy components deliberately, keep data fetching and render work cheap, and avoid unnecessary re-renders.
- Existing stack: Next.js, React, Tailwind CSS v4, lucide-react, daisyUI, shadcn CSS, React Query, FullCalendar.

## Physical Scene

Employees, managers, and admins use MyDeskii during active work hours on laptops and occasional mobile screens. The target feel is a SAVAGE operations command center: dark, polished, and modern, but still clear enough for task tracking, daily logs, payroll review, chat, file work, and approvals.

The Gemfield-style reference should influence color, contrast, metric treatment, cards, borders, navigation, and dashboard energy. It should not introduce landing-page sections, testimonials, logo rows, case-study blocks, marketing hero copy, or fake decorative metrics.

## Frontend Best-Practice Gates

- Accessibility: every icon-only control needs an accessible name; form controls need labels; interactive elements must support keyboard use; decorative icons should be hidden from assistive tech.
- Focus and interaction: never remove outlines without a visible `focus-visible` replacement; hover, active, disabled, loading, and selected states must be distinct.
- Forms: use meaningful `name`, `type`, `inputmode`, `autocomplete`, helper text, inline errors, and first-error focus on submit when practical.
- Responsive layout: define desktop, tablet, and mobile behavior for navigation, dashboards, tables, calendars, modals, drawers, and dense panels.
- Content handling: support empty, short, normal, and very long values with `min-w-0`, wrapping, truncation, or line clamping as appropriate.
- URL state: filters, tabs, search, pagination, detail panels, and dashboard workflow entry points should be deep-linkable when they affect user workflow.
- Performance: avoid unnecessary client components, avoid request waterfalls, avoid large barrel imports, use `content-visibility` or virtualization for large lists, and keep expensive render work memoized only when it is actually expensive.
- Data formatting: use `Intl.DateTimeFormat` and `Intl.NumberFormat` for dates, times, currency, percentages, and counts.
- Motion: animate only transform and opacity, list transition properties explicitly, and honor `prefers-reduced-motion`.
- Dark mode: set appropriate color scheme behavior, preserve native input readability, and verify contrast for text, borders, charts, and semantic states.

## Implementation Order

1. Foundation
   - Keep the MyDeskii name, routes, and product purpose.
   - Consolidate dark command-center tokens for background, surface, borders, cyan accent, magenta secondary accent, semantic states, radius, shadows, and restrained glow.
   - Normalize shared Button, Card, focus, input, badge, skeleton, and shell behavior.
   - Add quality gates for accessible names, focus states, reduced motion, native control contrast, and text overflow.

2. App Shell
   - Remodel sidebar and header as the stable premium frame for the app.
   - Keep command palette, notifications, profile, theme toggle, and time clock visible without crowding the header.
   - Improve mobile drawer behavior and route titles.
   - Use glowing active navigation only where it clarifies current location.

3. Auth
   - Polish login, signup, forgot password, reset password, and approval-pending copy in the MyDeskii command-center style.
   - Keep department and role selection visible and explain disabled role states clearly.
   - Preserve accessible labels, useful autocomplete values, password-manager compatibility, and inline validation.

4. Dashboard
   - Make the first viewport a real MyDeskii command center.
   - Prioritize needs attention, time status, tasks, daily log status, approvals, and quick actions.
   - Adapt the boss reference into real operational cards: live metrics, work status, attention queue, team signals, payroll alerts, and quick actions.
   - Remove marketing hero patterns, fake stats, decorative-only panels, and nested cards.

5. Task Tracking And Daily Logs
   - Redesign the task detail workflow before changing the full board.
   - Add the task-finished to daily-log handoff:
     - User marks task finished.
     - App offers notes before posting to daily log.
     - User can skip notes.
     - Daily log receives the task context and timestamp.
   - Keep board/list state URL-addressable and preserve mobile usability.
   - Use compact command-center cards without making dense task data harder to scan.

6. Payroll
   - Improve payroll calendar, day review, employee overview, pending approvals, warnings, and payslip review.
   - Make correction notes and audit context visible.
   - Use dark premium surfaces carefully because payroll tables, numbers, and warnings need stronger contrast than decorative dashboard cards.
   - Format money, time, dates, and percentages with `Intl.*`.

7. Collaboration And Files
   - Polish chat, announcements, private messages, file directory, folders, upload states, and file preview behavior.
   - Preserve message readability, upload progress, empty states, error states, long filenames, and responsive file-grid behavior.

8. Operations And Admin
   - Refine departments, role options, typed confirmations, approval state, profile settings, and whiteboard access.
   - Keep destructive and permission-sensitive actions visually distinct from normal neon action styling.

## First Pass Scope

This first implementation pass covers the updated product/design context, global visual tokens, shared Card and Button behavior, app shell, auth styling, and dashboard first viewport. It intentionally does not rewrite task tracking, daily logs, payroll, or chat internals yet.

The first pass must prove that the boss-reference style can work as MyDeskii: real portal content, real navigation, readable forms, no marketing sections, no decorative-only metrics, and no broken mobile layouts.

## Verification

- Run frontend lint, tests, and build.
- Open the app locally and check login, signup, dashboard, desktop shell, and mobile shell.
- Confirm no overlapping text, broken select controls, missing accessible labels, missing focus states, unreadable dark-mode surfaces, or clipped mobile content.
- Check console errors, missing assets, and obvious network/API failures.
- Check URL-driven workflow states for dashboard quick actions and affected filters.
- Run visual smoke coverage when protected frontend routes are touched.
- Run backend checks only when frontend work changes API assumptions.

## Follow-up Checklist

- Create a visual comparison pass between current MyDeskii and the boss-reference direction before broad route rewrites.
- Task detail side panel and finish-to-daily-log workflow.
- Daily log composer and task import polish.
- Payroll review screen and employee approval polish.
- File directory and chat visual pass.
- Browser screenshots for desktop and mobile before merging.
