# Copilot Instructions - Internal Company Portal

Act as a professional full-stack engineer for the MyDeskii Internal Company Portal.

## Mandatory Workflow

Use Vibe Auto Research for meaningful work:

1. Start with a hypothesis.
2. Inspect the actual repo files, docs, tests, and current git state.
3. Decide from evidence.
4. Make small, scoped edits.
5. Verify with the relevant checks.

Do not make code changes from intuition alone. Read `AGENTS.md` before feature, review, release, frontend, backend, database, or security work.

## Branch Safety

- `main` is production and must stay protected unless a formal merge/push is explicitly approved.
- Use the active feature branch for current work. For this v3 cycle, that branch is `v3-improvements`.
- Check `git status --short --branch` before implementation, commit, or publish decisions.
- Do not force push, run destructive git commands, or revert unrelated user changes.
- Do not commit or push unless the user asks for it.

## Architecture

Backend:

- `backend/src/main.ts`: Express middleware, routes, Socket.io bootstrap.
- `backend/src/config/`: environment and CORS configuration.
- `backend/src/database/`: Prisma singleton.
- `backend/src/auth/`: JWT, refresh, signup, OAuth, auth middleware.
- `backend/src/tasks/`, `daily-logs/`, `chat/`, `clients/`, `payroll/`, `employees/`, `uploads/`, `file-directory/`: feature modules.

Frontend:

- `frontend/src/app/`: Next.js App Router pages.
- `frontend/src/components/`: shared and feature components.
- `frontend/src/hooks/`: reusable React Query and feature hooks.
- `frontend/src/lib/`: API helpers, feature services, constants, types, and pure utilities.
- `frontend/src/context/` and `frontend/src/contexts/`: app providers.

Data flow:

```text
React page/component -> hook/lib service -> apiFetch -> Next proxy/API route -> Express route/controller -> service -> Prisma -> PostgreSQL
Real-time: SocketContext -> Socket.io rooms/events -> React Query invalidation
```

## Code Rules

- Reuse existing components, hooks, services, validators, serializers, constants, and utilities.
- Keep routes/controllers thin and business rules in services or helpers.
- Keep UI display separate from API calls and reusable behavior.
- Validate backend input and preserve existing auth/authorization boundaries.
- Do not expose passwords, reset tokens, secrets, sensitive payroll fields, or private client data.
- Do not change database schema, route names, API fields, env var names, or file names unless requested.
- Prefer clear typed functions over clever abstractions.
- Avoid unused imports, dead code, unnecessary console logs, empty catch blocks, and broad rewrites.

## Frontend Quality

- Follow `PRODUCT.md` and `DESIGN.md`.
- Use a professional operations UI: clear hierarchy, dense but readable data, responsive layout, accessible controls.
- Avoid marketing-page patterns, broad purple/blue gradients, glow spam, nested cards, fake metrics, and decorative noise.
- Forms need labels, useful validation feedback, `name` attributes where appropriate, loading/disabled states, and mobile-safe controls.
- Browser-check affected routes when the app can be rendered locally.

## Verification

Use the smallest useful check first, then broaden based on risk.

```powershell
npm run check:skills
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run test:visual
npm --prefix backend test
npm --prefix backend run build
npx prisma validate
npx prisma generate
git diff --check
```

Database-backed backend tests require a reachable PostgreSQL test database. If that environment is missing, state that clearly instead of treating it as a code pass.

## Documentation

Treat docs as project memory:

- Update `docs/dev-notes.md` after meaningful work.
- Update `docs/architecture.md`, `docs/features.md`, `docs/api.md`, or `docs/database.md` only when their source-of-truth behavior changes.
- Use `docs/code-review.md` for review and release-readiness checks.
- Use `docs/agent-workflows.md` for repo-local skill and agent workflow guidance.
