# Internal Company Portal

Full-stack internal portal for Savage LLC operations. The app uses a TypeScript Express backend, Prisma/PostgreSQL, Socket.io notifications, and a Next.js frontend.

## Repository Layout

- `backend/`: API routes, authentication, authorization, Prisma access, uploads, payroll, chat, email, notifications, and backend tests.
- `frontend/`: Next.js portal UI, reusable components, hooks, frontend helpers, and focused frontend tests.
- `docs/`: durable project memory for architecture, API contracts, database notes, feature behavior, agent workflows, and session notes.
- `skills/`: curated repo-local agent skill snapshots plus `skills/skills-lock.json`.
- `scripts/`: repository maintenance checks.

## Getting Started

Install dependencies per package:

```powershell
npm --prefix backend install
npm --prefix frontend install
```

Create local environment files from the package documentation and use real secrets only in local or deployment-specific `.env` files. Do not commit secrets.

Start development servers:

```powershell
npm --prefix backend run dev
npm --prefix frontend run dev
```

See `backend/README.md`, `frontend/README.md`, and `docs/architecture.md` for package-specific setup and architecture details.

## Verification

Run focused checks for changed areas first, then broaden before release or publish decisions.

```powershell
npm run check:skills
npm run check
```

For compose validation:

```powershell
$env:POSTGRES_PASSWORD = "local-compose-check-password"
$env:JWT_SECRET = "local-compose-check-jwt-secret"
$env:REFRESH_TOKEN_SECRET = "local-compose-check-refresh-secret"
docker compose config
```

Use `git diff --check` before committing to catch whitespace issues.

## Agent Workflow

This repo uses Vibe Auto Research for meaningful work:

1. Form a hypothesis.
2. Inspect the relevant repo files and docs.
3. Decide from evidence.
4. Make scoped edits.
5. Verify with tests, builds, audits, browser checks, or focused smoke checks.
6. Run a self-review/fix cycle before the final response. UI and workflow changes require manual click-through of affected flows; cross-cutting or "all features" requests require a full-feature audit when the app can be rendered.

Use memory as a search hint, not proof. For website work, verify the rendered app with Browser/in-app browser by default, Chrome when the user's Chrome profile/session/tab matters, and Computer Use when the real Windows app surface matters.

Read `AGENTS.md` before agent-driven work. Use `docs/agent-workflows.md` for skill selection, repo-local skill maintenance, delegation rules, and verification gates.
