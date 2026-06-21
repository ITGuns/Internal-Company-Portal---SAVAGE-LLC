# Design

## Visual Theme

MyDeskii keeps the MyDeskii name, product identity, and internal-operations purpose. The boss-approved visual reference points the product toward a premium command-center interface: dark, sharp, high-contrast, data-rich, and polished without becoming a marketing landing page.

The primary scene is an employee, manager, or admin checking operational status, tasks, time, approvals, chat, files, and payroll from one focused workspace. The interface can use a dark executive-dashboard look, but every screen must remain readable during repeated work sessions.

## Color

- Strategy: Premium command center with operational restraint.
- Background: near-black or deep navy app shell with subtle depth, never pure black as the only surface.
- Surface: layered dark panels for sidebars, headers, dashboards, tables, and forms, with clear border separation.
- Accent: electric cyan for primary action, active navigation, focus, and high-value highlights.
- Secondary accent: magenta or violet for limited emphasis, charts, selected metrics, or special callouts.
- SAVAGE red: reserved for brand-specific moments and destructive/urgent state only, so it does not compete with normal action color.
- Semantic states: green for success, amber for warning, red for destructive or overdue, blue or sky only for informational states.
- Avoid: copying marketing-page sections, glow on every element, low-contrast neon text, one-note purple/blue gradients, decorative blobs, oversized hero layouts, and style that makes forms or tables harder to read.

## Typography

- Font: Geist Sans via the existing Next.js font setup.
- Mono: Geist Mono for timers, durations, IDs, and tabular numeric data.
- Headings: compact, confident, medium to semibold weight.
- Body: 14px to 16px for app text, with stronger hierarchy through weight and spacing rather than oversized display type.
- Numbers: use tabular figures where values need scanning or comparison.

## Layout

- App shell: fixed sidebar on desktop, compact drawer on mobile, fixed top header for context and actions.
- Page content: max-width constrained where useful, with dense but breathable grids.
- Cards: use for panels, repeated records, metrics, and contained tools only. Avoid nested cards.
- Tables and calendars: keep data readable through borders, row rhythm, sticky context, and mobile overflow strategies.
- Mobile: collapse to one column, keep touch targets comfortable, and avoid hiding critical actions.
- Dashboard: should feel like the MyDeskii command center, with metrics, attention items, time state, quick actions, and live workflow status visible before decorative content.

## Components

- Buttons: 8px radius, clear primary, secondary, ghost, outline, success, and danger variants.
- Cards and panels: 8px radius, visible dark-mode borders, restrained shadow, and glow only for selected active or high-priority elements.
- Forms: label above input, helper or error text below, visible required state, accessible focus.
- Navigation: active route must be visually obvious and announced with `aria-current`.
- Empty states: explain what is missing and give the next action when possible.
- Loading states: use skeletons that match final layout before using spinners.
- Icon buttons: use accessible labels, consistent icon sizing, and visible hover/focus states.
- Data displays: use tabular numbers, readable labels, and responsive behavior before adding chart decoration.

## Motion

- Motion intensity: low to moderate.
- Use 120ms to 220ms transitions for hover, press, popover, drawer, and state feedback.
- Animate transform and opacity only.
- Avoid orchestrated page-load animations, bounce, elastic motion, constant glow loops, and decorative motion that distracts from work.
- Respect `prefers-reduced-motion`.

## Frontend Quality Standards

- Preserve semantic HTML, keyboard access, visible focus states, and accessible names.
- Use buttons for actions and links for navigation.
- Keep URL state for filters, tabs, pagination, expanded panels, and dashboard-driven workflow entry points where practical.
- Use loading, empty, error, disabled, success, and optimistic states intentionally.
- Make mobile, tablet, and desktop layouts explicit instead of relying on desktop grids to shrink by accident.
- Prevent text clipping, overflow, awkward wrapping, and broken touch targets.
- Use `Intl.DateTimeFormat` and `Intl.NumberFormat` for dates, times, numbers, and currency.
- Keep React and Next.js performance in mind: avoid unnecessary client components, avoid request waterfalls, use direct imports, split heavy UI only when it is actually heavy, keep effect dependencies primitive, and avoid defining components inside components.
- Avoid new dependencies unless they clearly reduce implementation risk or complexity.

## Implementation Notes

- Keep using Tailwind CSS v4, Next.js, React, and the existing `lucide-react` icon dependency.
- Do not introduce new animation or icon libraries for this pass.
- Preserve existing routes and backend API contracts.
- Prefer shell and shared component changes before route-specific redesigns.
- Treat the boss reference as a style direction for MyDeskii, not as content or layout to copy directly.
