# Design

## Visual Theme

MyDeskii uses a restrained product interface optimized for daytime laptop work and occasional mobile access. The primary scene is an employee or manager checking work status on a bright desk during an active shift, so the default surface is light, quiet, and readable.

## Color

- Strategy: Restrained.
- Background: warm off-white with subtle neutral tint.
- Surface: white or near-white for panels, with slightly tinted secondary surfaces for sidebars, headers, and grouped content.
- Accent: SAVAGE red, used only for primary actions, current navigation, important state, and small highlights.
- Semantic states: green for success, amber for warning, red for destructive or overdue, blue or sky only for informational states.
- Avoid: saturated purple, blue-purple gradients, heavy glow, pure black, and pure white where a tinted neutral works better.

## Typography

- Font: Geist Sans via the existing Next.js font setup.
- Mono: Geist Mono for timers, durations, IDs, and tabular numeric data.
- Headings: compact, sentence case, medium to semibold weight.
- Body: 14px to 16px for app text, with stronger hierarchy through weight and spacing rather than oversized display type.
- Numbers: use tabular figures where values need scanning or comparison.

## Layout

- App shell: fixed sidebar on desktop, compact drawer on mobile, fixed top header for context and actions.
- Page content: max-width constrained where useful, with dense but breathable grids.
- Cards: use for panels, repeated records, and contained tools only. Avoid nested cards.
- Tables and calendars: keep data readable through borders, row rhythm, sticky context, and mobile overflow strategies.
- Mobile: collapse to one column, keep touch targets comfortable, and avoid hiding critical actions.

## Components

- Buttons: 8px radius, clear primary, secondary, ghost, outline, success, and danger variants.
- Cards and panels: 8px radius, light border, minimal shadow.
- Forms: label above input, helper or error text below, visible required state, accessible focus.
- Navigation: active route must be visually obvious and announced with `aria-current`.
- Empty states: explain what is missing and give the next action when possible.
- Loading states: use skeletons that match final layout before using spinners.

## Motion

- Motion intensity: low to moderate.
- Use 120ms to 220ms transitions for hover, press, popover, drawer, and state feedback.
- Animate transform and opacity only.
- Avoid orchestrated page-load animations, bounce, elastic motion, and decorative loops.
- Respect `prefers-reduced-motion`.

## Implementation Notes

- Keep using Tailwind CSS v4, Next.js, React, and the existing `lucide-react` icon dependency.
- Do not introduce new animation or icon libraries for this pass.
- Preserve existing routes and backend API contracts.
- Prefer shell and shared component changes before route-specific redesigns.
