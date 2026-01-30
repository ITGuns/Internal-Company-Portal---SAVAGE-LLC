# Backend scaffold (minimal)

This folder contains a minimal backend scaffold for the Internal Company Portal.

Quick start (after installing deps):

```powershell
cd backend
npm install
cp .env.example .env
# configure DATABASE_URL and other secrets
npm run dev
```

Notes:
- This scaffold uses a minimal Express bootstrap for fast iteration and simple endpoints.
- Prisma schema is at `prisma/schema.prisma` — run `npx prisma migrate dev` after configuring `DATABASE_URL` to create the database.
- Later we will replace the minimal wiring with NestJS modules and add BullMQ workers.
