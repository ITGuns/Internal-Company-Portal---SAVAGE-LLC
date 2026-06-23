# Deskii Commercial Readiness

This document tracks the minimum production shape for selling Deskii to external companies. It is stricter than a demo, internal beta, or temporary Vercel preview.

## Current Verdict

Deskii can support controlled pilots after the normal release gate passes, but commercial launch must use the hardened runtime:

- persistent Node backend, not Vercel Functions as the only backend
- managed PostgreSQL with migrations applied and restore-tested backups
- Redis for distributed auth rate limits and Socket.io scaling
- S3-compatible object storage for uploads
- production email enabled for reset, invite, and onboarding flows
- same-origin or same-site frontend/backend routing for httpOnly refresh cookies
- load testing on staging before sales commitments

## Commercial Mode Guard

Paid deployment templates set `COMMERCIAL_READINESS_MODE=true`. Startup will fail unless the backend also has:

- `NODE_ENV=production`
- non-Vercel persistent runtime
- `AUTH_RATE_LIMIT_STORE=redis`
- `ENABLE_SOCKET_REDIS_ADAPTER=true`
- `EMAIL_ENABLED=true`
- SendGrid or SMTP credentials
- `UPLOAD_STORAGE_DRIVER=s3`
- `UPLOAD_S3_BUCKET`
- reachable S3 bucket credentials
- migrated `RefreshSession` persistence

Leave `COMMERCIAL_READINESS_MODE=false` for local development, demos, and temporary previews.

## Required Hosting Services

Minimum commercial stack:

- Frontend: Vercel, Docker, or another Next.js-capable host.
- Backend: persistent Node service such as Render, Fly, Railway, ECS, or a managed VPS/Docker host.
- Database: managed PostgreSQL with automated backups and point-in-time recovery.
- Redis: managed Redis/Key Value for auth rate limits and Socket.io adapter.
- Object storage: S3, Cloudflare R2, Supabase Storage with S3 compatibility, or equivalent.
- Email: SendGrid or SMTP provider.
- Observability: log drain, uptime monitor, and error reporting. The app emits structured JSON logs; wire the host to a provider before launch.

## Same-Origin Routing Rule

Browser requests should use app-origin `/api` and `/backend-auth` paths. The Next.js server then rewrites to `BACKEND_URL`.

This keeps refresh-token cookies httpOnly and SameSite-safe while avoiding browser CORS failures. In Docker, set `BACKEND_URL=http://backend:4000`. In Vercel plus Render, set `BACKEND_URL=https://<render-backend-host>` and keep browser public API config relative.

## Upload Storage

Commercial uploads must use S3-compatible storage:

```env
UPLOAD_STORAGE_DRIVER=s3
UPLOAD_S3_BUCKET=mydeskii-uploads
UPLOAD_S3_REGION=auto
UPLOAD_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
UPLOAD_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=<storage-access-key>
AWS_SECRET_ACCESS_KEY=<storage-secret-key>
```

The public API remains authenticated:

- `POST /api/uploads`
- `GET /api/uploads/files/:id`

The backend stores randomized object keys and ownership metadata. Clients receive `/api/uploads/files/:id`; the route authorizes the uploader, linked file-directory department, or linked client-asset visibility before reading the bucket.

## Realtime Scaling

`ENABLE_SOCKET_REDIS_ADAPTER` defaults to `true` in production. The backend uses the Socket.io Redis adapter when enabled so room broadcasts can cross multiple backend instances.

If the backend is scaled horizontally, the load balancer should still support WebSocket upgrades and stable connections. Redis does not replace proper WebSocket support on the host.

## Load Test

Install k6 locally or in CI, then run against staging:

```powershell
$env:BASE_URL = "https://staging.mydeskii.com"
$env:DESKII_LOAD_EMAIL = "load-test-admin@example.com"
$env:DESKII_LOAD_PASSWORD = "<password>"
npm run load:smoke
```

Commercial 1000-active-user profile:

```powershell
$env:DESKII_LOAD_USERS_FILE = "tests/load/users.staging.csv"
$env:LOAD_PROFILE = "commercial1000"
npm run load:smoke
```

The CSV must contain at least 1,000 unique approved staging accounts. Do not use production customer accounts or commit the credential file.

Do not run `commercial1000` against production during business hours unless the operator has approved the blast radius.

## Launch Gate

Before a paid commercial launch:

1. `npm run check`
2. `docker compose -f docker-compose.production.yml config`
3. `npm --prefix backend run prisma:deploy:production`
4. Verify `RefreshSession` exists in production.
5. Verify `/health` and `/ready`.
6. Smoke login, refresh, logout, dashboard, task tracking, chat, uploads, client portal, and payroll routes.
7. Run `LOAD_PROFILE=smoke` against staging.
8. Run `LOAD_PROFILE=commercial1000` against staging or an isolated production-like environment.
9. Confirm logs, uptime monitor, alerts, backups, restore procedure, and rollback plan.
