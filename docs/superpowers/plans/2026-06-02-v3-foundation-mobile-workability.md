# V3 Foundation and Mobile Workability Plan

## Scope

Approved v3 slice for the isolated `v3-improvements` branch:

- Restore repo operating memory so future agent work starts from repository evidence.
- Keep the curated repo-local skills snapshot available without creating a repo `.codex/` dependency.
- Extend browser smoke coverage for auth form accessibility and the mobile chat layout.
- Fix the first high-friction mobile workflow found in the audit: chat leaves too little usable room on phone widths.

## Evidence

- Root is missing `AGENTS.md`, `README.md`, `scripts/`, and `skills/` on the current `v3-improvements` branch.
- `.github/copilot-instructions.md` still hard-codes the stale `v2-improvements` branch rule.
- `LoginInput` renders labeled inputs with autocomplete but no `name` attribute.
- Signup department and role selects are also missing `name`.
- The visual smoke script already covers 29 authenticated routes, but it does not check auth form field names or mobile chat usable geometry.
- `/chat` uses a horizontal sidebar plus chat pane at all widths, causing the message area and composer to feel cramped on mobile.

## Decisions

- Use `AGENTS.md`, `docs/`, `scripts/check-skills-lock.mjs`, and `skills/skills-lock.json` as repo memory, not a repo `.codex/` folder.
- Port the curated v2 skill snapshot because the user wants useful skills kept available.
- Add browser-smoke assertions before fixing UI behavior so the regression stays covered.
- Keep the chat fix layout-only: no API, schema, socket, or route contract changes.

## Implementation Steps

1. Add repo operating docs and skill lock validation.
2. Add visual-smoke checks for auth field names and mobile chat workability.
3. Run focused visual smoke to confirm the new checks catch the current issues.
4. Add form `name` support and mobile chat layout changes.
5. Run frontend tests, lint, build, visual smoke, skill lock, and `git diff --check`.

## Verification

Target commands:

```powershell
npm run check:skills
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
$env:VISUAL_SMOKE_BASE_URL = "http://localhost:3103"
npm --prefix frontend run test:visual
git diff --check
```

Backend build is useful as a sanity check if root/package docs change, but this slice is docs/frontend/browser-smoke only and does not touch backend runtime behavior.
