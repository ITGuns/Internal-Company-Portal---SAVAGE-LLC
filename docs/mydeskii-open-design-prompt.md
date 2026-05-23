# MyDeskii Open Design Prompt

Use this prompt in Open Design after the local app is running and the current screens have been reviewed.

```text
Design a modern internal operations portal UI direction for "MyDeskii" by SAVAGE LLC.

Context:
MyDeskii is a real internal company portal, not a landing page. It is used daily by employees, managers, and admins to manage tasks, daily logs, payroll, announcements, chat, files, approvals, and department operations.

Current app structure:
- Left navigation with Dashboard, Task Tracking, Payroll Calendar, Announcements, Daily Logs, Messages & Chat, File Directory, Whiteboard, and admin operations.
- Fixed top header with page title, command search, time clock, theme toggle, notifications, and profile.
- Dashboard includes a command-center summary, needs-attention list, metrics, quick links, company chat, announcements, shoutouts, and quick actions.
- Task Tracking is currently a calendar-heavy work surface with actions, task search, view toggles, overdue summaries, and PDF/EOD tools.
- Daily Logs has filters, stats, manager review metrics, empty states, and log creation.
- Payroll Calendar includes calendar, employee audit, time clock, payroll warnings, and event management.
- Chat uses a channel/direct-message sidebar plus message thread.
- File Directory and Announcements rely heavily on empty states and filter controls.

Primary design goal:
Create a professional daily-workspace interface inspired by Open Design's clean shell, compact navigation, command-focused top bar, pill controls, and spacious but useful cards. It should feel more like a serious internal command center than a generic SaaS template.

Do not:
- Do not make a marketing landing page.
- Do not use oversized hero sections.
- Do not use generic purple/blue gradients, decorative blobs, glassmorphism, or fake bento decoration.
- Do not hide operational density behind excessive whitespace.
- Do not design a one-off dashboard that cannot scale across tasks, logs, payroll, chat, and files.

Design direction:
- Light professional workspace theme with restrained SAVAGE red accent, neutral backgrounds, clear dividers, and strong readability.
- Open Design-inspired left rail pattern, but adapted for an operations app: clear active states, icon consistency, grouped navigation, and usable mobile drawer behavior.
- Compact top bar with page title, command/search, time clock, notifications, and profile actions that does not overflow on mobile.
- Dashboard as the homepage command center: today's priorities, approvals, tasks, time, daily log status, and quick actions.
- Tables, calendars, filters, and cards should share one component language.
- Empty states should be useful and action-oriented, not oversized.
- Mobile must stack cleanly with no clipped header text, no horizontal overflow, and comfortable touch targets.

Required outputs:
1. Design system direction: color tokens, typography scale, spacing scale, card/table/button/input rules, icon style, status badge rules.
2. App shell mockup: desktop and mobile navigation/header behavior.
3. Dashboard mockup: command center, attention queue, metrics, chat preview, announcements, quick actions.
4. Task Tracking mockup: calendar/list/board controls, overdue task treatment, action toolbar, mobile behavior.
5. Daily Logs mockup: filters, stats, empty state, log cards/table, create-log action.
6. Payroll mockup: calendar plus audit controls, time entries, warnings, employee selector.
7. Chat/File/Announcements treatment: consistent sidebars, empty states, and action bars.
8. Implementation notes: what should be built as reusable components first.

Practical constraints:
- Keep this implementable in a Next.js/Tailwind app.
- Prefer reusable shell, card, toolbar, filter-pill, metric-card, empty-state, and table/list components.
- Prioritize clarity, responsive behavior, and repeated daily use over visual novelty.
```

## Current Audit Notes

- The app is functionally reachable locally at `http://localhost:3000` with backend on `http://localhost:4000`.
- Protected-screen smoke covered dashboard, task tracking, daily logs, payroll, chat, file directory, operations, and announcements.
- The highest-value first remodel pass is the shared shell and dashboard because every page inherits the header/sidebar rhythm.
- Mobile dashboard previously exposed header overflow; the shell pass should keep the top bar compact and move dense controls out of the mobile header.
- Dashboard should be tightened into a command-center view with less stretched empty space and more useful priority/action grouping.
