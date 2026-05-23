# Frontend Redesign Plan

## Direction

MyDeskii should become a focused internal product interface for daily operations. The redesign should feel closer to a workbench than a landing page: readable, compact, status-rich, and predictable.

## Design Inputs

- Impeccable: product register, restrained color, familiar app patterns, no nested cards, no decorative motion.
- Emil Kowalski design engineering: small feedback details, fast transitions, purposeful motion only.
- Taste skill: stronger hierarchy, non-generic spacing, careful typography, complete loading, empty, error, disabled, and success states.
- Existing stack: Next.js, React, Tailwind CSS v4, lucide-react, daisyUI, shadcn CSS, React Query, FullCalendar.

## Physical Scene

Employees, managers, and admins use MyDeskii during active work hours on laptops and occasional mobile screens. They are checking deadlines, logging work, reviewing approvals, and confirming time entries in normal office lighting, so the default UI should be light, quiet, and fast to scan.

## Implementation Order

1. Foundation
   - Consolidate tokens for background, surface, borders, accent, semantic states, radius, shadows, and motion.
   - Normalize shared Button, Card, focus, input, and shell behavior.

2. App Shell
   - Remodel sidebar and header as the stable frame for the app.
   - Keep command palette, notifications, profile, theme toggle, and time clock visible without crowding the header.
   - Improve mobile drawer behavior and route titles.

3. Auth
   - Polish login, signup, forgot password, reset password, and approval-pending copy.
   - Keep department and role selection visible and explain disabled role states clearly.

4. Dashboard
   - Make the first viewport a real command center.
   - Prioritize needs attention, time status, tasks, daily log status, approvals, and quick actions.
   - Remove decorative hero patterns and nested cards.

5. Task Tracking And Daily Logs
   - Redesign the task detail workflow before changing the full board.
   - Add the task-finished to daily-log handoff:
     - User marks task finished.
     - App offers notes before posting to daily log.
     - User can skip notes.
     - Daily log receives the task context and timestamp.

6. Payroll
   - Improve payroll calendar, day review, employee overview, pending approvals, warnings, and payslip review.
   - Make correction notes and audit context visible.

7. Collaboration And Files
   - Polish chat, announcements, private messages, file directory, folders, upload states, and file preview behavior.

8. Operations And Admin
   - Refine departments, role options, typed confirmations, approval state, profile settings, and whiteboard access.

## First Pass Scope

This first implementation pass covers the product/design context, global visual tokens, shared Card and Button behavior, app shell, auth styling, and dashboard first viewport. It intentionally does not rewrite task tracking, daily logs, payroll, or chat internals yet.

## Verification

- Run frontend lint, tests, and build.
- Open the app locally and check login, signup, dashboard, desktop shell, and mobile shell.
- Confirm no overlapping text, broken select controls, missing focus states, or unreadable dark-mode surfaces.
- Run backend checks only when frontend work changes API assumptions.

## Follow-up Checklist

- Task detail side panel and finish-to-daily-log workflow.
- Daily log composer and task import polish.
- Payroll review screen and employee approval polish.
- File directory and chat visual pass.
- Browser screenshots for desktop and mobile before merging.
