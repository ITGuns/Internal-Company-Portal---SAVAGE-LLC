# Agent Workflows

This repository uses Vibe Auto Research as the default workflow for meaningful agent work. Product instinct can form a hypothesis, but repository evidence decides the plan and verification decides whether the work is complete.

## Always-On Activation

For this repo, `vibe-auto-research` is the first workflow for every meaningful task, even when the user does not mention it. A meaningful task is any request that may change code, docs, tests, configuration, database behavior, release state, UI flow, or repo workflow.

At task start:

1. Announce `vibe-auto-research` and the likely research depth.
2. Run a memory quick pass when repo history, workflow preferences, product context, or prior decisions may matter.
3. Locate the repo root when the session starts in a subfolder.
4. Read the applicable `AGENTS.md` and the smallest relevant docs/files.
5. Choose supporting skills from the task type before implementation planning.
6. If the supporting skill is not available, use the missing-skill protocol below instead of widening the plan.

Depth 0 direct answers and trivial commands may skip the full loop, but they must not make repository changes.

## Anti-Hallucination Evidence Gate

Vibe Auto Research must start with evidence, not confidence. Before accepting a plan or making meaningful edits:

- Use memory as a pointer to likely context, not as current truth. Verify anything that may drift.
- Inspect current repo files, docs, package scripts, tests, and `git status --short`.
- For UI or workflow work, inspect the rendered app when it can be started or reached.
- Capture enough evidence to name the owning files, affected personas/routes, contracts, test surface, browser/manual paths, and blockers.
- Escalate to deeper research when the user asks to overanalyze, when the change touches shared behavior, or when a broad plan would be hard to verify.
- Do not invent app behavior, route health, data shape, auth state, or visual quality. If evidence is blocked, say what is blocked and what fallback was used.

Rendered website tool routing:

- Browser/in-app browser is the default for local web apps, localhost routes, DOM inspection, console/network-visible issues, and responsive checks.
- Chrome plugin is for explicit Chrome/Google Chrome requests, existing Chrome tabs, logged-in Chrome profiles, cookies/sessions, extensions, or remote authenticated sites.
- Computer Use is for real Windows desktop/app surfaces: native apps, occluded windows, file pickers, Office/export checks, or browser UI that DOM/browser tools cannot inspect.
- Repo visual-smoke scripts are preferred for broad, safe route/persona coverage when they exist; use Browser, Chrome, or Computer Use to inspect visible issues and workflows directly.
- If the requested surface is unavailable, report `blocked` or `not applicable` with the fallback evidence used.

## Operating Loop

Use this loop for feature work, bug fixes, reviews, release checks, and documentation updates:

1. Hypothesis: state the likely area, risk, and validation surface.
2. Evidence: inspect the relevant repo files, docs, tests, scripts, and current git state.
3. Decision: revise the plan based on what the repo actually shows.
4. Edit: make the smallest scoped change that solves the verified need.
5. Verification: run the commands or browser checks that prove the result, or state exactly what could not be verified.

Do not present work as complete if the evidence or verification step is missing.

## Prompt-to-Quality Cycle

Use this cycle when the user gives a prompt and expects the agent to plan, implement, review, and iterate without stopping at a proposal.

1. **Prompt intake**: restate the desired outcome, target user, product goal, likely repo area, risk, and assumptions to verify.
2. **Skill plan**: choose relevant skills/tools before implementation planning.
3. **Repo applicability check**: prove the request fits the current repo, product direction, architecture, contracts, and verification surface.
4. **Plan quality gate**: accept the plan only if it has success criteria, files/modules/routes, steps, contracts, browser/manual paths for UI work, tests, docs, and risks.
5. **Implementation**: make scoped changes using existing patterns.
6. **Reviewer pass**: review technical quality, affected repo behavior, browser/manual workflow, usability, and verification evidence.
7. **Fix cycle**: if material findings remain, replan the fix, implement it, rerun focused checks, and rerun the reviewer pass.

The first plan is not automatically good. Replan before editing when repo evidence shows the plan is weak, broad, risky, not applicable, or hard to verify.

The cycle ends when no material reviewer findings remain, the user stops the work, or a real blocker prevents progress.

## Completion Audit Cycle

Every implementation must end with self-review before the final response. The agent should catch and fix its own mistakes first, then report the final result.

Run this cycle after implementation:

1. Inspect the final diff as if another engineer wrote it.
2. Map the change to affected personas, routes, feature workflows, API/data contracts, controls, and docs.
3. Run the relevant automated checks.
4. Run manual Browser/in-app browser click-through when the app can be rendered.
5. Classify findings by severity, create a focused fix plan, implement fixes, and rerun focused verification.
6. Repeat review and fixes until no material findings remain or a real blocker prevents progress.

Manual audit scope:

- **Affected-flow audit**: required for focused UI, workflow, auth, route, form, dashboard, or client-facing changes. Click every changed route, important button/control, form path, dialog, state transition, and navigation path.
- **Full-feature audit**: required for cross-cutting shell/navigation/theme/auth/role/routing/shared-state changes, broad redesigns, release/publish readiness, or any user request to check "all features". Walk the primary admin, employee, client, and anonymous/auth workflows across desktop and mobile where practical.
- **Not applicable**: allowed only for docs-only, non-rendered backend, CLI-only, or unreachable-app work. State why and use the best fallback verification.

Completion is not allowed if material reviewer findings are known and fixable. If verification is blocked, report the blocker, what was still reviewed, and the residual risk instead of calling the work fully complete.

## Repo Memory

Durable project memory belongs in these files:

- `AGENTS.md`: mandatory agent behavior and safety rules.
- `README.md`: repository overview, setup entry point, and top-level verification notes.
- `PRODUCT.md`: product purpose, users, personality, and constraints.
- `DESIGN.md`: visual direction, layout rules, motion, and component styling.
- `docs/architecture.md`: system structure, boundaries, and validation commands.
- `docs/features.md`: user-facing feature behavior.
- `docs/api.md`: route contracts, auth rules, and response behavior.
- `docs/database.md`: schema and relationship notes.
- `docs/code-review.md`: review checklist for backend, frontend, auth, uploads, database, agent workflow, and release readiness.
- `docs/dev-notes.md`: session summaries, decisions, follow-ups, and verification evidence.
- `docs/agent-workflows.md`: this agent and skill operating guide.

Prefer updating existing docs over creating one-off reports. Keep notes concise and evidence-backed.

## Skill Sources

Global skills are available from the user's Codex skill folders. Repo-local skills are kept under `skills/.agents/skills` as a curated snapshot for portability and review. Because `.agents` is a hidden directory, use `rg --hidden --files skills` when inspecting the repo-local snapshot.

Use the repo-local snapshot only when the skill is relevant. Do not load every skill for every task.

The repo-local snapshot is not the full skill universe. Supporting skills may come from:

- The active skill list in the current Codex session.
- Global Codex skill folders such as `C:\Users\yatzv\.agents\skills` and `C:\Users\yatzv\.codex\skills`.
- Repo-local snapshots under `skills/.agents/skills`.
- Installed plugin skills when the current task clearly matches them.

Do not assume a task has no support skill just because it is absent from `skills/.agents/skills`.

## Frontend Craft Stack

For MyDeskii product UI, do not default to `frontend-visual-quality` as the taste driver. Use the approved frontend craft stack instead:

1. `impeccable`: primary product UI craft, information hierarchy, layout, responsive behavior, accessibility, hardening, and polish.
2. `emil-design-eng`: component feel, small interaction details, motion restraint, button feedback, and transition quality.
3. `design-taste-frontend`: anti-generic layout checks, dependency verification, responsive guardrails, state quality, and dashboard-appropriate density.
4. `motion-web-design`: purposeful animation planning, CSS-first motion systems, reduced-motion behavior, and dependency choice. For MyDeskii product surfaces, prefer CSS/Tailwind motion before adding runtime animation libraries.
5. `web-design-guidelines`: semantic HTML, accessibility, labels, landmarks, keyboard/focus, and UI guideline review.
6. Browser/in-app browser, Chrome when requested, and repo visual-smoke scripts: rendered verification and manual click-through.

Use official GSAP skills as an add-on only when the task genuinely needs GSAP-level animation:

- `gsap-react`: React/Next.js GSAP setup, `useGSAP`, scoped refs, cleanup, and SSR-safe patterns.
- `gsap-performance`: animation performance, transform/opacity discipline, batching, `will-change`, and jank/FPS cleanup.
- `gsap-scrolltrigger`: scroll-linked, pinned, scrubbed, or parallax motion.
- `gsap-core`, `gsap-timeline`, `gsap-plugins`, and `gsap-utils`: core tweens, sequencing, plugins, and utilities when the specific GSAP implementation requires them.

Use `gpt-taste` only for marketing, landing-page, portfolio, campaign, or brand-heavy surfaces where AIDA structure, cinematic spacing, GSAP-style motion, and rich visual assets are appropriate. Do not apply its landing-page defaults to internal operations dashboards, admin tools, dense tables, auth workflows, or accessibility remediation unless the user explicitly asks for that direction.

Current repo-local skills:

- `vibe-auto-research`: default evidence-first workflow for this repo.
- `find-skills`: search and evaluate additional open skills when a capability gap appears.
- `web-design-guidelines`: external UI/accessibility review guidance for frontend work.
- `improve-codebase-architecture`: deeper architecture review and refactor candidate reporting.
- `supabase-postgres-best-practices`: Postgres guidance for query, schema, indexing, locking, and performance work; do not assume Supabase hosting unless verified.
- `gsap-frameworks`: repo-local GSAP framework snapshot; global Codex also has the official GreenSock pack (`gsap-core`, `gsap-react`, `gsap-performance`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-plugins`, `gsap-utils`, `gsap-frameworks`). Use those global GSAP skills only when GSAP is relevant.
- `ai-image-generation`: visual asset generation guidance; do not use for private/sensitive screenshots, employee/client data, or normal portal implementation work unless explicitly approved.

Repo-local skills should be committed only when they are useful for repeated portal work, useful for review by future agents, or needed for portability across machines. Keep experimental, rarely used, or user-personal skills global unless the repo has a clear reason to own them.

Do not create or depend on a repo `.codex/` directory unless Codex repo-local `.codex` behavior has been verified first. The current repo contract is `AGENTS.md` plus `docs/` plus the curated `skills/` snapshot.

## Skill Matrix

Use this matrix after the Vibe Auto Research classification step:

| Task type | Primary skills or tools | Required evidence | Verification |
| --- | --- | --- | --- |
| Planning a new or ambiguous feature | `brainstorming`, `writing-plans`, `product-requirements-quality` | `PRODUCT.md`, `DESIGN.md`, relevant docs, related routes/components/models | Written plan or approved scope before code |
| Prompt-to-implementation cycle | `vibe-auto-research`, relevant planning/review skills, Browser for UI, Computer Use for desktop surfaces | Prompt goal, repo applicability evidence, selected skills, affected files/contracts | Plan quality gate, implementation, reviewer pass, fix/review cycle |
| PRD or issue-ready artifact | `to-prd` only when requested or approved | Current context, repo/product evidence, issue tracker expectations | PRD/issue content reviewed before publication when publication has side effects |
| Bug or failing test | `systematic-debugging`, `test-driven-development` | Error output, reproduction path, recent diffs, related tests/code | Focused failing test first, then passing focused and broader checks |
| Backend/API change | `api-service-quality`, `auth-access-control` when permissions are involved | Controllers, services, validation helpers, serializers, tests, `docs/api.md` | Backend tests, build, and targeted API checks |
| Security-sensitive work | `security-production-readiness`, `auth-access-control`, `integrations-webhooks-safety` when relevant | Trust boundaries, untrusted inputs, auth checks, sensitive outputs, logs, docs | Focused security tests plus build and release gates |
| Database/schema/query work | `database-safety`, `supabase-postgres-best-practices` | Prisma schema, migrations, seed data, query callers, `docs/database.md` | `npx prisma validate`, `npx prisma generate`, tests that cover changed queries |
| Frontend/UI work | Approved frontend craft stack: `impeccable`, `emil-design-eng`, `design-taste-frontend`, `motion-web-design`, `web-design-guidelines`, Browser/in-app browser or Chrome when requested. Add official GSAP skills only for GSAP-specific implementation or performance work | `PRODUCT.md`, `DESIGN.md`, route/component code, state/loading/error paths, responsive constraints, existing components/tokens, motion/reduced-motion requirements | Frontend tests, lint, build, browser smoke for affected routes, reduced-motion check, manual affected-flow audit |
| Architecture review | `project-architecture-standards`, `improve-codebase-architecture` | Docs, module ownership, duplication, test seams, high-friction files | Findings with file references; implementation only after approval |
| Code review | `requesting-code-review`, `receiving-code-review`, CodeRabbit when explicitly requested | Current diff, `docs/code-review.md`, related tests/docs/contracts | Findings first, then focused fixes and re-verification when asked |
| Release/publish readiness | `verification-before-completion`, release gates in `docs/architecture.md` | Branch, dirty worktree, CI config, lockfiles, package scripts, dependency audit surface | `npm run check`, Prisma checks when relevant, `docker compose config`, `git diff --check` |
| Desktop/Office/document work | Documents/Spreadsheets/Presentations skills, Computer Use only when visible app state matters | Source docs/data, requested output path, existing layout rules | Structural validation and app/Word/Excel/PowerPoint verification when available |
| Skill discovery | `find-skills` | Capability gap, current global skills, repo-local snapshot | Install only trusted skills with clear source and task fit |

## Missing Skill Protocol

When the selected task-specific skill is not visible in the current session:

1. Check the active skill list and the global Codex skill inventory before assuming it is missing.
2. Inspect the repo-local snapshot with `rg --hidden --files skills`.
3. Use `find-skills` or `npx skills find "<domain> <task>"` to search for an installable skill.
4. Evaluate source reputation, install count, and task fit before recommending it.
5. Do not install or copy a skill into this repo unless the user asks for installation or the repo has a clear repeated need.
6. If no trusted match exists, state the fallback explicitly and continue with Vibe Auto Research at a narrow, evidence-backed scope.

Recent search note: `npx skills find "agent workflow repo research"` returned low-install uninstalled workflow skills, including `jwynia/agent-skills@research-workflow` and several `repo-research-analyst` variants. They overlap with this repo's existing workflow, so they should be reviewed carefully before any install.

## Codex Personalization Bridge

Repo instructions are the source of truth inside this checkout. Codex personalization is useful for other repos that do not have this `AGENTS.md`, or when a session starts somewhere that has not yet adopted this workflow.

Recommended personalization snippet:

```text
For meaningful repository work, always start with Vibe Auto Research even if I do not ask for it by name. Treat intuition as a hypothesis only. Use memory as a search hint, then verify against current repo files, docs, scripts, tests, git state, and rendered app state when relevant. Select task-specific skills before implementation planning. If a useful skill is not installed or visible, search with find-skills / npx skills find, evaluate trust and install count, and tell me the fallback instead of going broad. For website/UI/workflow work, use Browser/in-app browser by default, Chrome when existing Chrome profile/session/tab/extension context matters or I ask for Chrome, and Computer Use when the actual Windows app surface matters. Before calling work complete, run verification plus a self-review/fix cycle. For UI or workflow changes, manually click through affected flows; for cross-cutting or "all features" requests, run a full-feature audit across primary personas and desktop/mobile where practical.
```

Keep personalization short and general. Put repo-specific rules, validation commands, and product constraints in `AGENTS.md` and `docs/`.

## Agent Delegation

Use subagents only when the user explicitly asks for agents, delegation, or parallel agent work, or when the active platform policy allows it for the task.

Good delegation targets:

- Independent read-only reviews, such as one agent for backend security and one for CI/release configuration.
- Disjoint implementation slices with clear file ownership.
- Parallel verification that does not interfere with local work.

Do not delegate:

- The immediate blocking step on the main path.
- Tasks that require shared state or likely edit the same files.
- Broad "review everything" prompts without a concrete scope and expected output.

Every delegated task should state:

- Repo path.
- Read-only or edit permission.
- Exact files or subsystem scope.
- Required output format.
- Verification commands it may run.
- Instruction not to revert user or other-agent changes.

After subagents return, review their findings against the actual diff before acting on them.

## Verification Gates

Use the smallest useful check first, then broaden based on risk.

Backend:

```powershell
cd backend
npm test
npm run build
npx prisma validate
npx prisma generate
npm audit --audit-level=high
```

Frontend:

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

Repository:

```powershell
npm run check:skills
npm run check
$env:POSTGRES_PASSWORD = "local-compose-check-password"
$env:JWT_SECRET = "local-compose-check-jwt-secret"
$env:REFRESH_TOKEN_SECRET = "local-compose-check-refresh-secret"
docker compose config
git diff --check
npm audit --audit-level=high
```

For UI/user-flow changes, add browser verification against affected routes when the app can be rendered locally. For release/publish decisions, inspect branch state and remote sync before recommending a push.

## Reviewer Pass

Every implementation cycle should include a reviewer pass before final response.

Technical review:

- Inspect the current diff for scope, accidental edits, dead code, unused imports, and broken contracts.
- Check API, auth, authorization, validation, serialization, database, security, performance, and docs impact where relevant.
- Run focused checks first, then broaden based on risk.

User-flow review:

- For UI work, use Browser/in-app browser when practical.
- Click through affected routes, buttons, forms, modals, navigation paths, and important states.
- Escalate to full-feature audit for cross-cutting shell, auth, role, navigation, dashboard, release, or all-feature requests.
- Judge whether the workflow is understandable, efficient, client/user friendly, and easy to complete.
- Check mobile and desktop behavior for visual or workflow changes.
- Fix material issues found by the reviewer pass before final response, then rerun focused verification.

When findings remain, create a focused fix plan and repeat implementation plus review. Do not call the cycle complete until material findings are resolved or blocked.

## Skill Trust and Maintenance

Treat `skills/skills-lock.json` as the repo inventory for curated skills. Update it when a repo-local skill snapshot is added, removed, or refreshed.

`npm run check:skills` validates that every locked skill path exists and that each recorded SHA-256 hash matches the current `SKILL.md` content. Run it after editing skills, refreshing snapshots, changing lock entries, or before release checks.

Prefer trusted, battle-tested third-party skills over one-off personal skills when a common domain exists:

- Vercel or framework-author skills for web/frontend guidance.
- Database vendor skills for Postgres and schema work.
- Security and testing skills for auth, validation, and release gates.
- Project-specific skills only when the repo has repeated workflows that generic skills do not cover.

Trust policy:

- Review `SKILL.md` before using or importing a third-party skill.
- Prefer source repositories maintained by framework authors, vendors, established teams, or widely reviewed community maintainers.
- Do not auto-update or replace third-party skill snapshots without explicit intent and verification.
- Do not send private portal data, screenshots, credentials, employee records, or client records into media-generation, browser-sharing, or external workflow skills unless explicitly approved and safe for that data.
- Remove stale or unused repo-local skills instead of keeping a large snapshot that future agents will misread as active guidance.

Before adding a new third-party skill:

1. Confirm the capability gap.
2. Check the source reputation and install quality when available.
3. Install or copy only the specific skill needed.
4. Record the purpose in this file or `docs/dev-notes.md`.
5. Update `skills/skills-lock.json` with the repo-relative path and SHA-256 of the `SKILL.md`.
6. Verify with `rg --hidden --files skills`, `npm run check:skills`, and, when using global installs, `npx skills list -g --agent codex --json`.

Before removing a skill:

1. Confirm no current workflow depends on it.
2. Remove the snapshot and lock entry together.
3. Update the current repo-local skills list above.
4. Run `npm run check:skills` and `git diff --check`.
