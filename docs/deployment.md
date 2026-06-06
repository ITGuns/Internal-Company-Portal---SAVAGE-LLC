# Deployment Runbook

## CI/CD Overview

GitHub Actions is the source of truth for repository gates:

- `.github/workflows/ci.yml` runs on pushes and pull requests for `main`, `v2-improvements`, and `v3-improvements`, plus manual dispatch.
- `.github/workflows/backend-ci.yml` runs the focused backend gate when backend files change.
- `.github/workflows/deploy.yml` runs the production release gate on `main` pushes and can run a guarded manual SSH Docker deploy.
- `.github/dependabot.yml` opens weekly dependency and GitHub Actions update PRs.

The release gate verifies repository checks, backend tests/build/audit, Prisma validation and generated client, frontend tests/lint/build/audit, Docker Compose config, and Docker image builds.

## Required GitHub Configuration

Optional repository variables for public smoke checks:

- `PRODUCTION_BACKEND_URL`, such as `https://api.mydeskii.com`
- `PRODUCTION_FRONTEND_URL`, such as `https://mydeskii.com`

Required repository secrets for the manual SSH Docker deploy:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`
- `DEPLOY_PORT` if SSH does not use port `22`
- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`

Required repository secrets or variables for the manual SSH Docker deploy:

- `FRONTEND_URL`, such as `https://mydeskii.com`
- `CORS_ORIGIN`, such as `https://mydeskii.com`
- `NEXT_PUBLIC_API_URL`, such as `https://api.mydeskii.com/api`
- `NEXT_PUBLIC_WS_URL`, such as `wss://api.mydeskii.com`

Recommended repository secrets or variables:

- `DIRECT_DATABASE_URL` for Prisma migrations/bootstrap, especially with Supabase.
- `TRUST_PROXY_HOPS`, set to the exact reverse-proxy hop count.
- `OPS_MANAGER_EMAIL`
- `ADMIN_EMAILS`
- Email provider variables if production email is enabled.

The remote host must already have Git, Node.js, npm, Docker, Docker Compose, and a checked-out copy of this repository at `DEPLOY_PATH`.

## Production Environment

Production secrets stay on the deployment host or managed platform. Do not commit them.

Use `.env.production.example` and `backend/.env.production.example` as templates. The manual SSH deploy workflow writes `.env.production` at the repo root and `backend/.env.production` on the remote host from GitHub secrets/variables, then deploys with:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Backend required environment:

- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_URL`

Recommended backend environment:

- `NODE_ENV=production`
- `DIRECT_DATABASE_URL`
- `REDIS_URL`
- `AUTH_RATE_LIMIT_STORE=redis`
- `AUTH_RATE_LIMIT_REDIS_PREFIX=portal:auth-rate-limit`
- `TRUST_PROXY_HOPS` set to the exact trusted reverse-proxy hop count
- `OPS_MANAGER_EMAIL`

Frontend public build/runtime environment:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_ENABLE_REALTIME=true` when the websocket URL points at a persistent Node backend

For Docker deployments, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are passed as frontend image build args and runtime environment variables. Rebuild the frontend image when those public URLs change.

## Temporary Vercel + Supabase Deployment

The repository includes a root `vercel.json` for a temporary Vercel deployment from the monorepo root. It installs both packages, builds the `frontend/` Next.js app, builds the `backend/` Express entrypoint as a Vercel function, and routes:

- `/api/*` to the backend function.
- `/auth/*` and `/backend-auth/*` to the backend function.
- `/health` to the backend function.
- All remaining routes to the frontend app.

Required Vercel environment variables:

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `AUTH_RATE_LIMIT_STORE=memory`

Recommended Vercel environment variables:

- `NEXT_PUBLIC_ENABLE_REALTIME=false`
- `DIRECT_DATABASE_URL`
- `JWT_EXPIRES_IN=7d`
- `REFRESH_TOKEN_EXPIRES_IN=30d`
- `LOG_LEVEL=info`
- `OPS_MANAGER_EMAIL`
- `ADMIN_EMAILS`

For Supabase, use the transaction pooler for `DATABASE_URL` and the session pooler or direct connection for `DIRECT_DATABASE_URL`.

Vercel is suitable for a temporary preview of the portal UI and normal REST/auth routes. It is not a complete production runtime for this app because Vercel Functions do not provide a durable Socket.io WebSocket server, and file uploads written to local function storage are not persistent. Production builds only attempt Socket.io when realtime is explicitly enabled or `NEXT_PUBLIC_WS_URL` is configured; leave `NEXT_PUBLIC_ENABLE_REALTIME=false` on Vercel unless that websocket URL points to a persistent backend. For full chat realtime behavior, durable uploads, Redis-backed distributed rate limits, and long-running operational reliability, use the Docker/SSH deployment path or a server host that supports persistent Node processes.

### Supabase/Postgres Connection Mode

For Supabase-backed production, keep runtime and migration connections separate:

- `DATABASE_URL`: backend runtime connection. For pooled Supabase runtime, use the transaction pooler URL, commonly port `6543`, with `pgbouncer=true`.
- `DIRECT_DATABASE_URL`: Prisma migration/bootstrap connection. Use the Supabase session pooler or direct connection, commonly port `5432`.

The Prisma CLI config prefers `DIRECT_DATABASE_URL`, then `DIRECT_URL`, then `DATABASE_URL`. The running backend still uses `DATABASE_URL`.

### First Empty Database Bootstrap

The current tracked migration history starts after the original base tables already existed, so `prisma migrate deploy` alone is not a safe first command for a brand-new empty database.

For a new empty production or staging database:

1. Confirm the target database is empty.
2. Configure `DATABASE_URL` and, for Supabase, `DIRECT_DATABASE_URL`.
3. Run the `Production Deploy` workflow manually with:
   - `deploy_over_ssh=true`
   - `run_migrations=true`
   - `bootstrap_empty_database=true`
4. The bootstrap command creates the current Prisma schema, marks the tracked historical migrations as applied, then runs `prisma migrate deploy`.

Use `bootstrap_empty_database=true` only for the first deployment to a new empty database. Existing databases should leave it `false`.

## Release Flow

1. Open a pull request into `main`.
2. Confirm required CI checks pass.
3. Merge only after review approval.
4. The `main` push runs the production release gate.
5. Run `Production Deploy` manually with `deploy_over_ssh=true` only after deploy secrets and production env vars are configured.
6. Keep `run_migrations=true` for normal releases unless a migration was already applied by an operator.
7. Keep `bootstrap_empty_database=false` except for the first deployment to a verified empty database.

Production migration command using `.env.production`:

```powershell
npm --prefix backend run prisma:deploy:production
```

First empty-database bootstrap command:

```powershell
npm --prefix backend run prisma:bootstrap-production
```

CI uses `npx prisma db push` only for disposable test databases because the current migration history is not a clean empty-database baseline. Existing production/staging environments should use `prisma:deploy:production`.

## Post-Deploy Smoke

After deployment, verify:

- Backend `/health` returns `status: healthy`.
- Login and refresh-token flows work.
- `/dashboard`, `/task-tracking`, and `/chat` render.
- Chat WebSocket delivery works between two authorized users.
- Uploads/file-directory still read and write files.
- Client operations routes still hide internal-only data from client users.

## Rollback

Preferred rollback is a forward fix when migrations changed data or schema. If app code must roll back:

1. Revert or reset the remote checkout to the last known good commit.
2. Rebuild and restart with `docker compose --env-file .env.production -f docker-compose.production.yml up -d --build`.
3. Run `/health` and the post-deploy smoke list.
4. Do not roll back database migrations destructively without a reviewed migration plan.
