---
name: vibe-auto-research
description: Use when the user wants evidence-first implementation, asks to avoid vibe coding, asks for auto research, or wants repo work driven by repository evidence, browser and Computer Use review, task-specific skills, existing architecture, and verification before code changes.
---

# Vibe Auto Research

This skill explicitly forbids vibe coding.

"Vibe coding" means making code changes from intuition, generic patterns, or surface confidence before checking the actual repository. Do not do that.

"Vibe Auto Research" means intuition may create a hypothesis, but repository evidence decides the plan and implementation.

## Core Rule

Never let the vibe phase directly produce code.

Use it only to ask: "What might be true?" Then research the repo to answer: "What is actually true here?"

## Operating Contract

For every meaningful repo task, maintain this loop:

1. **Hypothesis** - likely direction, risk, and validation surface.
2. **Evidence** - exact files/docs/scripts inspected.
3. **Decision** - what the evidence changes about the plan.
4. **Edit** - smallest scoped implementation.
5. **Verification** - checks that prove or limit the result.

If steps 2 or 5 are missing, do not present the work as complete.

For implementation prompts, use the stricter Prompt-to-Quality Cycle:

1. **Prompt intake** - restate the requested outcome, assumptions, and user-facing goal.
2. **Skill plan** - choose the relevant skills/tools before planning code.
3. **Repo applicability check** - prove the request fits the current repo, architecture, data model, and product direction.
4. **Plan quality gate** - reject and rework weak plans before editing.
5. **Implementation** - apply the approved evidence-backed plan.
6. **Reviewer pass** - review technical quality, affected repo areas, browser/user flow, usability, and verification evidence.
7. **Fix cycle** - if reviewer findings remain, replan the fix, implement, and rerun the reviewer pass.

Read [prompt-to-quality-cycle.md](references/prompt-to-quality-cycle.md) before broad feature work, workflow polish, repo review, or any prompt where the user expects the agent to plan, implement, review, and iterate autonomously.

## Research Depth

Choose the smallest depth that makes the task safe:

- **Depth 0: direct** - trivial command, formatting, or explanation. No repo scan needed.
- **Depth 1: focused** - one file or narrow fix. Inspect the target file, nearest tests, scripts, and git status.
- **Depth 2: feature** - user-facing behavior, UI/UX work, browser/desktop flow, or cross-file change. Inspect docs, related frontend/backend paths, tests, contracts, and rendered behavior when practical.
- **Depth 3: release/security/data** - auth, uploads, payments, deployment, database, CI, or publish decisions. Inspect architecture docs, API/database docs, validation gates, and risk boundaries before editing.

Escalate depth when research finds shared behavior, hidden contracts, security risk, schema impact, or unclear ownership.

## Workflow

### 1. Classify the task

- Simple factual command or one-line answer: answer directly.
- Planning request: inspect relevant context and propose a plan; do not code.
- Implementation request: run the full research-to-verification loop.
- Prompt-to-implementation request: run the Prompt-to-Quality Cycle before code and after implementation.
- Review request: use a code-review stance; findings first, then fixes only if asked.
- Bug/failure: switch to systematic debugging.
- Publish/release request: verify the current branch, dirty worktree, dependency/security checks, and project-specific gates before recommending or pushing.

### 2. Form a hypothesis

State the likely direction briefly when useful:

- likely files or feature area
- expected architecture shape
- likely validation surface
- user-facing behavior to preserve
- likely risk level and research depth

This is provisional. Do not edit files yet.

### 3. Auto research the repo

Use `rg` / `rg --files` first. Inspect the relevant subset:

- repo instructions such as `AGENTS.md`
- `README.md`, `PRODUCT.md`, `DESIGN.md`
- `docs/architecture.md`
- `docs/features.md`
- `docs/api.md`
- `docs/database.md`
- `docs/dev-notes.md`
- package scripts and test commands
- related frontend pages, components, hooks, services, and utilities
- related backend routes, controllers, services, validation, auth, and tests
- Prisma schema, migrations, or seed data when database behavior is involved
- current `git status --short`

Keep research focused. Do not read unrelated files just to appear thorough.

Capture enough evidence to answer:

- What files own this behavior?
- What contracts must not break?
- What existing pattern should be reused?
- What tests or checks already cover this?
- What docs need to change, if any?
- What live browser flow or screen state needs to be checked?
- What desktop app/window state needs Computer Use, if any?

### 4. Revise the plan from evidence

Before editing, explain the practical plan:

- files or modules to change
- boundaries to preserve
- tests or checks to run
- docs likely to update

If research contradicts the hypothesis, follow the evidence.

### 5. Invoke supporting skills

Use other skills when the task calls for them:

- `brainstorming` or planning workflows for ambiguous features
- `writing-plans`, `make-plan`, or `to-prd` when the user asks for a durable plan, PRD, issue-ready scope, or multi-step implementation artifact
- `systematic-debugging` for bugs, failing tests, or unexplained behavior
- `test-driven-development` when adding behavior with clear expected outcomes
- `frontend-visual-quality` and Browser/in-app browser workflows for UI changes, visual review, or user-flow verification
- `computer-use` for Windows desktop apps, occluded app screenshots, Office/export checks, app-window review, or visual state outside normal browser automation
- database safety guidance before schema/query changes
- security/production readiness guidance for auth, upload, secrets, webhook, or deployment-sensitive work
- verification guidance before claiming completion

Do not use a skill ceremonially. Use it because it changes the work quality.

Do not use `to-prd` to publish an issue unless the user explicitly asks for a PRD/issue-tracker artifact or approves publication.

### 6. Apply task-specific gates

- **Frontend/UI**: inspect existing components, state patterns, routes, loading/error/empty states, responsive behavior, and browser experience-review needs.
- **Desktop/app-surface**: use Computer Use when the true Windows app/window state matters and code/browser inspection cannot answer the question.
- **Backend/API**: inspect route contracts, DTO/input validation, auth/authorization, service boundaries, error responses, and tests.
- **Database**: inspect schema and relationship ownership first; do not propose schema changes until the existing model is understood.
- **Security-sensitive**: identify trust boundaries, untrusted input, sensitive output, auth checks, logging exposure, and abuse cases before editing.
- **Docs/reporting**: identify the source of truth before writing; avoid inventing facts not supported by repo evidence.
- **Release/publish**: inspect branch, working tree, CI config, validation scripts, dependency audit surface, and deployment assumptions.

### 7. Browser experience review

For UI, frontend, workflow, navigation, form, dashboard, or visual-polish work, code inspection is not enough.

Use Browser/in-app browser when a local or reachable app can be rendered. Review the actual experience:

- first impression and page purpose
- visual hierarchy, spacing, alignment, density, and polish
- navigation path and end-to-end task flow
- loading, empty, error, disabled, success, and focus states when relevant
- mobile and desktop responsive behavior
- text clipping, overflow, overlap, awkward wrapping, and touch target size
- console errors, missing assets, broken links, and obvious network/API failures

Read [browser-experience-review.md](references/browser-experience-review.md) before major UI reviews or when the user asks about look, feel, or flow.

If Browser is unavailable, the app cannot start, auth blocks access, or verification would be unsafe, say that clearly and use the best fallback: static code review, screenshots, existing visual tests, or instructions for manual browser verification.

### 8. Computer Use efficiency

Use Computer Use when the task depends on the actual Windows desktop/app surface:

- inspecting or controlling native Windows apps
- verifying desktop-installed builds or app windows
- checking Office/Word/Excel/PowerPoint exports, layout, or visible document state
- capturing windows that may be occluded
- checking dialogs, file pickers, or app UI that Browser cannot inspect
- reviewing a visible flow when DOM/browser tools are not the right surface

Prefer Browser/in-app browser for local web apps and normal webpage interaction because it can inspect DOM, console, network-visible behavior, and responsive web flow more directly.

Read [computer-use-efficiency.md](references/computer-use-efficiency.md) before using Computer Use for substantial app review or control.

Do not use Computer Use for terminal commands, Codex UI automation, password managers, security settings, CAPTCHA/paywall bypasses, or actions that require user confirmation under the Computer Use policy.

### 9. Implement progressively

- Make small, scoped edits.
- Follow local naming, file placement, and architecture.
- Reuse existing components, services, hooks, utilities, constants, types, and tests.
- Keep UI, business logic, API calls, validation, and database access separated.
- Avoid new dependencies unless clearly justified.
- Preserve user changes and unrelated dirty worktree state.

### 10. Verify with a ladder

Run the smallest meaningful verification first, then broaden based on risk:

- focused unit tests
- package test commands
- lint/type/build checks
- Prisma validation/generation where relevant
- browser experience review, smoke checks, or screenshots for UI work
- Computer Use app/window review when the task depends on Windows desktop state
- `git diff --check`

If a command cannot be run, state that clearly and explain the residual risk.

For high-risk work, passing only a narrow check is not enough. Add broader checks when touching shared code, auth, data, CI, build config, or public UX.

After implementation, perform a reviewer pass before final response. The reviewer pass must inspect the diff and affected behavior, not just test output. For UI/user-flow work, include browser click-through of the affected routes and controls when the app can be rendered.

### 11. Close out

Final response should include:

- what changed
- edited files
- evidence used, when useful
- verification run
- reviewer pass result and whether a fix cycle was needed
- browser review result for UI/user-flow changes
- Computer Use result for desktop/app-surface checks
- known limitations
- docs updated or intentionally not updated

Keep it concise and concrete.

## Anti-Patterns

Avoid these failure modes:

- editing before inspecting the relevant code
- assuming conventional architecture instead of finding the local one
- reading every doc/file when a focused subset is enough
- treating a passing build as proof of product behavior
- making UI changes without checking rendered browser behavior when practical
- reviewing only screenshots when the task depends on click path, form flow, or navigation behavior
- using Computer Use when Browser, tests, or file inspection would answer the question more safely
- using Computer Use for Windows terminal automation or Codex UI automation
- changing API/database contracts without checking docs and callers
- hiding unrun verification behind vague wording
- using a supporting skill just to name it, without following its workflow
- accepting the first plan when repo evidence shows it is too broad, too vague, risky, or not applicable
- stopping after implementation without a reviewer pass
- calling a workflow user-friendly without walking the actual user path when practical

## Progress Updates

When the task takes more than a few minutes, report useful evidence as it appears:

- "I found the behavior is owned by..."
- "The existing pattern is..."
- "This changes the plan because..."
- "I am editing..."
- "Verification now covers..."

Do not spam the user with raw command output unless they asked for it.

## Stop Conditions

Pause and ask only when:

- requirements are genuinely ambiguous and a wrong assumption would be costly
- the requested change conflicts with current architecture or security boundaries
- implementation would require destructive git, schema, or filesystem actions not approved by the user
- existing user changes make the task unsafe to continue without direction
