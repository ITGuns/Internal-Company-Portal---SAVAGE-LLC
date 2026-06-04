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

The remote host must already have Git, Node.js, npm, Docker, Docker Compose, and a checked-out copy of this repository at `DEPLOY_PATH`.

## Production Environment

Production secrets stay on the deployment host or managed platform. Do not commit them.

Backend required environment:

- `DATABASE_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `CORS_ORIGIN`
- `FRONTEND_URL`

Recommended backend environment:

- `NODE_ENV=production`
- `REDIS_URL`
- `AUTH_RATE_LIMIT_STORE=redis`
- `AUTH_RATE_LIMIT_REDIS_PREFIX=portal:auth-rate-limit`
- `TRUST_PROXY_HOPS` set to the exact trusted reverse-proxy hop count
- `OPS_MANAGER_EMAIL`

Frontend public build/runtime environment:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

For Docker deployments, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are passed as frontend image build args and runtime environment variables. Rebuild the frontend image when those public URLs change.

## Release Flow

1. Open a pull request into `main`.
2. Confirm required CI checks pass.
3. Merge only after review approval.
4. The `main` push runs the production release gate.
5. Run `Production Deploy` manually with `deploy_over_ssh=true` only after deploy secrets and production env vars are configured.
6. Keep `run_migrations=true` for normal releases unless a migration was already applied by an operator.

Production migration command:

```powershell
npm --prefix backend run prisma:deploy
```

CI uses `npx prisma db push` only for disposable test databases because the current migration history is not a clean empty-database baseline. Existing production/staging environments should use `prisma:deploy`.

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
2. Rebuild and restart with `docker compose up -d --build`.
3. Run `/health` and the post-deploy smoke list.
4. Do not roll back database migrations destructively without a reviewed migration plan.
