# Agent Workflows

This repository uses Vibe Auto Research as the default workflow for meaningful agent work. Product instinct can form a hypothesis, but repository evidence decides the plan and verification decides whether the work is complete.

## Operating Loop

Use this loop for feature work, bug fixes, reviews, release checks, and documentation updates:

1. Hypothesis: state the likely area, risk, and validation surface.
2. Evidence: inspect the relevant repo files, docs, tests, scripts, and current git state.
3. Decision: revise the plan based on what the repo actually shows.
4. Edit: make the smallest scoped change that solves the verified need.
5. Verification: run the commands, browser checks, and fresh manual click-through item that prove the result, or state exactly what could not be verified.

Do not present work as complete if the evidence or verification step is missing.

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

Current repo-local skills:

- `vibe-auto-research`: default evidence-first workflow for this repo.
- `find-skills`: search and evaluate additional open skills when a capability gap appears.
- `web-design-guidelines`: external UI/accessibility review guidance for frontend work.
- `improve-codebase-architecture`: deeper architecture review and refactor candidate reporting.
- `supabase-postgres-best-practices`: Postgres guidance for query, schema, indexing, locking, and performance work; do not assume Supabase hosting unless verified.
- `gsap-frameworks`: animation guidance for GSAP framework work; use only if GSAP becomes relevant.
- `ai-image-generation`: visual asset generation guidance; do not use for private/sensitive screenshots, employee/client data, or normal portal implementation work unless explicitly approved.

Repo-local skills should be committed when they are useful for repeated portal work, useful for review by future agents, or needed for portability across machines. Experimental or user-personal skills should stay global unless the repo has a clear reason to own them.

Do not create or depend on a repo `.codex/` directory unless Codex repo-local `.codex` behavior has been verified first. The current repo contract is `AGENTS.md` plus `docs/` plus the curated `skills/` snapshot.

## Skill Matrix

Use this matrix after the Vibe Auto Research classification step:

| Task type | Primary skills or tools | Required evidence | Verification |
| --- | --- | --- | --- |
| Planning a new or ambiguous feature | `brainstorming`, `writing-plans`, `product-requirements-quality` | `PRODUCT.md`, `DESIGN.md`, relevant docs, related routes/components/models | Written plan or approved scope before code |
| Bug or failing test | `systematic-debugging`, `test-driven-development` | Error output, reproduction path, recent diffs, related tests/code | Focused failing test first, then passing focused and broader checks |
| Backend/API change | `api-service-quality`, `auth-access-control` when permissions are involved | Controllers, services, validation helpers, serializers, tests, `docs/api.md` | Backend tests, build, and targeted API checks |
| Security-sensitive work | `security-production-readiness`, `auth-access-control`, `integrations-webhooks-safety` when relevant | Trust boundaries, untrusted inputs, auth checks, sensitive outputs, logs, docs | Focused security tests plus build and release gates |
| Database/schema/query work | `database-safety`, `supabase-postgres-best-practices` | Prisma schema, migrations, seed data, query callers, `docs/database.md` | `npx prisma validate`, `npx prisma generate`, tests that cover changed queries |
| Frontend/UI work | `frontend-visual-quality`, `web-design-guidelines`, Browser/in-app browser | `DESIGN.md`, route/component code, state/loading/error paths, responsive constraints | Frontend tests, lint, build, browser smoke for affected routes, and fresh manual click-through of the changed path |
| Architecture review | `project-architecture-standards`, `improve-codebase-architecture` | Docs, module ownership, duplication, test seams, high-friction files | Findings with file references; implementation only after approval |
| Code review | `requesting-code-review`, `receiving-code-review`, CodeRabbit when explicitly requested | Current diff, `docs/code-review.md`, related tests/docs/contracts | Findings first, then focused fixes and re-verification when asked |
| Release/publish readiness | `verification-before-completion`, release gates in `docs/architecture.md` | Branch, dirty worktree, CI config, lockfiles, package scripts, dependency audit surface | `npm run check`, Prisma checks when relevant, `docker compose config`, `git diff --check` |
| Desktop/Office/document work | Documents/Spreadsheets/Presentations skills, Computer Use only when visible app state matters | Source docs/data, requested output path, existing layout rules | Structural validation and app/Word/Excel/PowerPoint verification when available |
| Skill discovery | `find-skills` | Capability gap, current global skills, repo-local snapshot | Install only trusted skills with clear source and task fit |

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

For UI/user-flow changes, add browser verification against affected routes when the app can be rendered locally. Always add a fresh manual click-through item for changed user paths; report it as done, blocked, or not applicable before finishing. For release/publish decisions, inspect branch state and remote sync before recommending a push.

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
- Keep the curated repo-local skills available unless the user asks to prune them or a specific entry becomes unsafe.

Before adding a new third-party skill:

1. Confirm the capability gap.
2. Check the source reputation and install quality when available.
3. Install or copy only the specific skill needed.
4. Record the purpose in this file or `docs/dev-notes.md`.
5. Update `skills/skills-lock.json` with the repo-relative path and SHA-256 of the `SKILL.md`.
6. Verify with `rg --hidden --files skills`, `npm run check:skills`, and, when using global installs, `npx skills list -g --agent codex --json`.
