# Design

## Visual Theme

MyDeskii uses a premium product interface for daytime operations and client review. The default app should stay readable and fast, while client-facing routes may use stronger presentation surfaces: dark summary panels, metric bands, framed progress modules, and high-contrast CTAs. The target feeling is a calm operations cockpit, not a marketing landing page pasted into an app.

## Screenshot Pattern Extraction

Use the provided references as a pattern library:

- First viewport: strong page title, short context copy, primary action, secondary action, trust/status proof, and a visual dashboard summary.
- Metric strip: one full-width band with a short promise on the left and scannable numeric outcomes to the right.
- Capability grid: compact cards with icon, title, description, and one action. Avoid endless identical cards.
- Process row: 3 to 5 steps that explain how work moves from request to result.
- Case-study panel: testimonial, recent update, or report summary paired with concrete metrics.
- CTA band: bright but controlled action area with one primary next step.
- Footer or route end-state: practical links, support path, and account context when relevant.

## Color

- Strategy: Restrained product base with committed accents only on client-facing summary zones.
- Background: tinted off-white for standard work areas.
- Deep surface: charcoal or deep ink for hero summaries, metric bands, sidebars, and premium client panels. Avoid pure black.
- Surface: white or near-white for forms, records, tables, and long reading.
- Accent: SAVAGE red remains the brand action color. Use cyan, emerald, amber, and rose only as semantic or data accents inside dashboards and charts.
- Borders: low-contrast neutral borders for normal panels; stronger tinted borders for important client summary panels.
- Avoid: broad purple-blue gradients, glow-heavy neon, one-note palettes, pure black, pure white, and color used without text or icon support.

## Typography

- Font: Geist Sans via the existing Next.js setup.
- Mono: Geist Mono for timers, durations, IDs, metric values, and tabular comparisons.
- Product headings: compact, sentence case, medium to semibold weight.
- Client hero headings: stronger and wider, but never oversized enough to wrap awkwardly. Keep important headings to 2 or 3 lines on desktop.
- Body: 14px to 16px for app text. Use 65 to 75ch max line length for paragraphs.
- Numbers: tabular figures, clear labels, and consistent unit formatting.
- Avoid: gradient text, negative letter spacing, display fonts in controls, and tiny labels that cannot survive mobile.

## Layout

- App shell: preserve the existing route structure and navigation model.
- Client command center: use a first-viewport layout with a left narrative/action zone and a right visual status module on desktop. Collapse to a single-column summary on mobile.
- Page content: build around reusable sections: hero summary, metrics band, action queue, work progress, updates timeline, reports, resources, and request/approval forms.
- Grids: use CSS Grid with explicit breakpoints. Avoid fragile flex percentage math.
- Panels: cards are allowed for records, tools, and repeated items. Do not nest cards. Use full-width bands or divided rows for major sections.
- Density: client pages can be more spacious than internal admin pages, but every section must carry useful workflow information.
- Mobile: prioritize next action, current status, and latest update before secondary records.

## Components

- Buttons: 8px radius, clear primary, secondary, ghost, outline, success, and danger variants. Add active press feedback with transform only.
- Icon buttons: use lucide-react, stable dimensions, accessible labels, and consistent stroke weight.
- Summary panels: support metric cards, progress bars, trend lines, and status chips without requiring new API contracts.
- Metric bands: use large numeric values, short labels, and semantic color. Do not invent numbers.
- Forms: label above input, helper or error text below, visible required state, accessible focus.
- Navigation: active route must be visually obvious and announced with `aria-current`.
- Empty states: explain what is missing and give the next useful action.
- Loading states: use skeletons that match the final layout before using spinners.
- Error states: show recoverable action where possible.

## Motion

- Motion intensity: moderate for client-facing polish, restrained for repeated internal workflows.
- Use 120ms to 220ms transitions for hover, press, popover, drawer, and state feedback.
- Animate transform and opacity only.
- Use staggered reveals sparingly for client-facing page sections, and skip them for repeated keyboard-heavy workflows.
- No bounce, elastic motion, cursor tricks, or decorative loops.
- Respect `prefers-reduced-motion`.

## Content Rules

- Lead with concrete workflow status instead of generic value copy.
- Use client-safe language: progress, requests, approvals, reports, resources, next action.
- Make internal boundaries clear: client-visible update, internal note, admin-only action.
- Replace vague labels like "Overview" with task-specific labels when a route needs clarity.
- Avoid fake testimonials, fake numbers, fake client names, and dead links.

## Implementation Notes

- Keep using Tailwind CSS v4, Next.js, React, and the existing `lucide-react` icon dependency.
- Do not introduce Framer Motion, GSAP, Three.js, or a new icon library unless a later approved implementation phase specifically needs it.
- Preserve existing routes, backend API contracts, auth boundaries, and client organization scoping.
- Prefer shared client shell, panel, metric, CTA, and skeleton components before route-specific redesigns.
- Visual verification should include desktop and mobile screenshots, console checks, keyboard focus checks, and reduced-motion behavior.
