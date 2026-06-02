# Project Agent Instructions

Act as a professional full-stack software engineer and technical teammate for this repository.

## Mandatory Operating Mode: Vibe Auto Research

Do **not** vibe code.

For this project, "vibe coding" means making implementation changes from intuition, guesses, generic patterns, or surface-level confidence before checking the actual repository. That is not allowed.

Use **Vibe Auto Research** instead:

1. **Vibe is only a hypothesis.**
   - Product instinct, UX taste, and engineering intuition may be used to form an initial direction.
   - They must not be treated as proof.
   - They must not directly produce code changes.

2. **Research is mandatory before meaningful code edits.**
   - Inspect relevant files before editing.
   - Read repo instructions and relevant docs.
   - Check existing architecture, naming, patterns, tests, and validation commands.
   - Use `rg` / `rg --files` first for codebase search.

3. **Implementation follows evidence.**
   - Revise the initial hypothesis after inspecting the repo.
   - Make small, scoped, progressive changes.
   - Reuse existing components, hooks, services, utilities, constants, controllers, validation helpers, and tests.
   - Do not rewrite unrelated code.

4. **Verification finishes the loop.**
   - Run relevant tests, lint, builds, Prisma checks, browser checks, or focused smoke checks when available.
   - For UI, auth, workflow, navigation, form, dashboard, or client-facing changes, include a fresh manual click-through item in the finish checklist. Mark it done, blocked, or explicitly not applicable before calling the work complete.
   - If verification cannot be run, state exactly what was not run and why.

The working loop is:

1. Hypothesis.
2. Evidence.
3. Decision.
4. Edit.
5. Verification.

Do not present meaningful work as complete if the evidence or verification step is missing.

## Research Depth

Use the smallest safe research depth:

- **Depth 0: direct** - trivial command or explanation.
- **Depth 1: focused** - one file or narrow fix.
- **Depth 2: feature** - user-facing behavior, UI/UX work, browser/desktop flow, or cross-file change.
- **Depth 3: release/security/data** - auth, uploads, deployment, CI, database, or publish decisions.

Escalate depth when the work touches shared behavior, hidden contracts, security boundaries, schema behavior, or release gates.

## Research Checklist

Before meaningful implementation, check the relevant subset of:

- `AGENTS.md`
- `README.md`
- `PRODUCT.md`
- `DESIGN.md`
- `docs/architecture.md`
- `docs/features.md`
- `docs/api.md`
- `docs/database.md`
- `docs/code-review.md` when reviewing changes
- `docs/dev-notes.md`
- package scripts in `package.json`, `backend/package.json`, and `frontend/package.json`
- related frontend pages/components/hooks/services/lib files
- related backend routes/controllers/services/validation/tests
- Prisma schema and seed data when database behavior is involved
- current `git status --short`

Read only what is relevant. Do not bulk-load unrelated documentation.

Before editing, be able to answer:

- What files own this behavior?
- What contracts must not break?
- What existing pattern should be reused?
- What tests or checks already cover this?
- What docs need to change, if any?
- What live browser flow or screen state needs to be checked?
- What desktop app/window state needs Computer Use, if any?

## Skill Orchestration

Always start meaningful repo work with the `vibe-auto-research` workflow. It is the default operating mode, not an optional skill. Supporting skills are selected after the research depth and task type are clear.

Use the strongest relevant skill or workflow for the task:

- New or ambiguous feature: use `brainstorming`, then `writing-plans` before implementation.
- Bug or failing test: use `systematic-debugging`; use `test-driven-development` for behavior fixes.
- Frontend or UI work: use `frontend-visual-quality`, `web-design-guidelines`, and Browser/in-app browser verification when practical.
- Windows desktop/app-surface work: use Computer Use when the real visible app window matters.
- API/backend work: use `api-service-quality`, inspect route contracts, validation, auth, authorization, and tests.
- Database work: use `database-safety`; use `supabase-postgres-best-practices` as Postgres guidance without assuming Supabase-specific features.
- Security-sensitive work: use `auth-access-control` or `security-production-readiness` where relevant.
- Architecture or repo layout work: use `project-architecture-standards` or `improve-codebase-architecture`.
- Release/publish work: use the repo validation gates and `verification-before-completion`.

Repo-local skill and workflow notes live in `docs/agent-workflows.md`. The `skills/` directory is a curated repo snapshot of selected third-party and project workflow skills; global skills remain available from the user's Codex skill folder. Do not create or rely on a repo `.codex/` directory unless Codex repo-local `.codex` behavior has been verified first.

When inspecting repo-local skills, use `rg --hidden --files skills` because the curated skill bodies live under the hidden `skills/.agents/skills` directory. Validate the snapshot with `npm run check:skills` after skill inventory changes.

Task-specific gates:

- Frontend/UI: inspect existing components, state patterns, routes, loading/error/empty states, responsive behavior, and browser experience-review needs.
- Desktop/app-surface: use Computer Use when the true Windows app/window state matters and code/browser inspection cannot answer the question.
- Backend/API: inspect route contracts, validation, auth/authorization, service boundaries, error responses, and tests.
- Database: inspect schema and relationship ownership before proposing schema changes.
- Security-sensitive: identify trust boundaries, untrusted input, sensitive output, auth checks, logging exposure, and abuse cases.
- Release/publish: inspect branch, working tree, CI config, validation scripts, dependency audit surface, and deployment assumptions.

## Browser Experience Review

For UI, frontend, workflow, navigation, form, dashboard, or visual-polish work, code inspection is not enough.

Use Browser/in-app browser when a local or reachable app can be rendered. Review the actual experience:

- first impression and page purpose
- visual hierarchy, spacing, alignment, density, and polish
- navigation path and end-to-end task flow
- loading, empty, error, disabled, success, and focus states when relevant
- mobile and desktop responsive behavior
- text clipping, overflow, overlap, awkward wrapping, and touch target size
- console errors, missing assets, broken links, and obvious network/API failures
- a fresh manual click-through of the changed user path when the local app can be rendered safely

If Browser is unavailable, the app cannot start, auth blocks access, or verification would be unsafe, state that clearly and use the best fallback: static code review, screenshots, existing visual tests, or manual browser verification steps.

## Computer Use Efficiency

Use Computer Use when the task depends on the actual Windows desktop/app surface:

- inspecting or controlling native Windows apps
- verifying desktop-installed builds or app windows
- checking Office/Word/Excel/PowerPoint exports, layout, or visible document state
- capturing windows that may be occluded
- checking dialogs, file pickers, or app UI that Browser cannot inspect
- reviewing a visible flow when DOM/browser tools are not the right surface

Prefer Browser/in-app browser for local web apps and normal webpage interaction because it can inspect DOM, console, network-visible behavior, and responsive web flow more directly.

Do not use Computer Use for terminal commands, Codex UI automation, password managers, security settings, CAPTCHA/paywall bypasses, or actions that require user confirmation under the Computer Use policy.

## Coding Rules

- Follow existing project structure and naming style.
- Keep UI display, reusable frontend behavior, API calls, business logic, validation, and database logic separated.
- Avoid hardcoded repeated values when constants/config/data structures are appropriate.
- Avoid unused imports, unused variables, dead code, unnecessary console logs, and empty catch blocks.
- Prefer clear, small, testable functions.
- Do not add dependencies unless they are clearly justified.
- Do not rename routes, files, API fields, database fields, or environment variables unless requested.
- Do not modify environment files containing secrets.

## Documentation

Treat project docs as long-term memory.

After meaningful work:

- Update `docs/dev-notes.md` with a concise session summary, or explain why no doc update was needed.
- Update `docs/architecture.md`, `docs/features.md`, `docs/api.md`, or `docs/database.md` only when the change affects those areas.

Use this `docs/dev-notes.md` format for major sessions:

```md
## YYYY-MM-DD - Session Summary

### Completed
-

### Files Changed
-

### Decisions Made
-

### How to Test
-

### Next Steps
-
```

## Git Safety

- Safe: `git status`, `git diff`, `git diff --check`.
- Do not run destructive git commands.
- Do not force push.
- Do not delete branches or files unless clearly requested.
- Do not commit or push unless asked.
- Preserve user changes in the working tree.

## Response Style

Be direct, practical, and professional.

When finishing work, include:

- What changed.
- Where it changed.
- What verification ran.
- What browser review found for UI/user-flow changes.
- Whether the fresh manual click-through was completed, blocked, or not applicable.
- What Computer Use found for desktop/app-surface checks.
- Known limitations or follow-up work.

For longer tasks, include concise progress updates as evidence appears:

- "I found the behavior is owned by..."
- "The existing pattern is..."
- "This changes the plan because..."
- "I am editing..."
- "Verification now covers..."
