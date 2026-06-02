# MyDeskii Internal Company Portal

MyDeskii is the internal operations and client command portal for SAVAGE LLC. It combines employee operations, task tracking, daily logs, payroll surfaces, chat, file access, and client-facing service workflows.

## Repository Workflow

Meaningful work in this repo must follow Vibe Auto Research:

1. Form a hypothesis.
2. Inspect the relevant repo files and docs.
3. Decide from evidence.
4. Make the smallest scoped edit.
5. Verify with tests, builds, lint, browser smoke, or the relevant gate.

Start with `AGENTS.md`, then use the relevant docs under `docs/`.

## Project Structure

- `backend/`: Express, TypeScript, Prisma, Socket.io, auth, API modules, and backend tests.
- `frontend/`: Next.js App Router, React, Tailwind, React Query, client/admin UI, and browser smoke tooling.
- `docs/`: architecture, feature, API, database, workflow, review, and session notes.
- `skills/`: curated repo-local skill snapshot for repeatable agent workflows.
- `scripts/`: repository-level validation scripts.

## Common Commands

```powershell
npm run check:skills
npm --prefix backend test
npm --prefix backend run build
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
npm run check
git diff --check
```

For UI changes, start the frontend locally and run:

```powershell
$env:VISUAL_SMOKE_BASE_URL = "http://localhost:3000"
npm --prefix frontend run test:visual
```

Backend tests that touch Prisma require a reachable test database configured through the environment.
