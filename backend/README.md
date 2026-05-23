# Backend

TypeScript Express API for the Internal Company Portal / MyDeskii app.

## Quick Start

```powershell
cd backend
npm install
Copy-Item .env.example .env
# configure DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET, and provider secrets
npm run dev
```

## Commands

```powershell
npm test
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Main Areas

- `src/main.ts` starts the Express server and mounts API routes.
- `src/auth` owns login, signup, OAuth, token refresh, and auth middleware.
- `src/employees`, `src/users`, `src/tasks`, `src/daily-logs`, `src/payroll`, `src/chat`, `src/file-directory`, and `src/uploads` own feature APIs.
- `src/config/env.config.ts` centralizes environment configuration.
- `prisma/schema.prisma` defines the PostgreSQL data model.
- `tests/run-tests.ts` runs the focused backend regression suite.

## Project Docs

Use the root `docs/` folder as the source of truth:

- `docs/architecture.md` for system structure and access-control conventions.
- `docs/api.md` for route behavior and response notes.
- `docs/database.md` for schema and migration notes.
- `docs/dev-notes.md` for recent decisions and verification history.
