# Backend Setup Guide

## ✅ Completed: Environment Configuration & Database Setup

This guide covers the setup for **Priority #1** and **Priority #2** from the project roadmap.

---

## 📋 What's Been Implemented

### 1. Environment Configuration ✅
- Centralized configuration module (`src/config/env.config.ts`)
- Comprehensive `.env.example` with all required variables
- Environment validation on startup
- Type-safe configuration access

### 2. Database Setup ✅
- Enhanced Prisma schema with proper relations and indexes
- Database connection service with singleton pattern
- Health check endpoint
- Migration scripts
- Database seed script with sample data

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and configure your database:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/savage_portal
JWT_SECRET=your-super-secret-jwt-key-change-this
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key

# Optional (for development)
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

### Step 3: Set Up PostgreSQL Database

**Option A: Local PostgreSQL**

```bash
# Create database
psql -U postgres
CREATE DATABASE savage_portal;
\q
```

**Option B: Docker (Recommended for Development)**

```bash
docker run --name savage-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=savage_portal \
  -p 5432:5432 \
  -d postgres:14
```

Then update your `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/savage_portal
```

### Step 4: Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Seed database with sample data
npm run prisma:seed
```

### Step 5: Start the Server

```bash
npm run dev
```

You should see:
```
✅ Environment configuration validated successfully
✅ Database connected successfully
🚀 Backend listening on http://localhost:4000
📝 Environment: development
```

---

## 🧪 Testing the Setup

### 1. Health Check

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-02-02T10:00:00.000Z"
}
```

### 2. Test Tasks API

```bash
# Get all tasks
curl http://localhost:4000/api/tasks

# Get specific task
curl http://localhost:4000/api/tasks/1

# Create new task
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","status":"todo"}'
```

### 3. Open Prisma Studio (Database GUI)

```bash
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can view and edit database records.

---

## 📁 New File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.config.ts          # ✨ Environment configuration
│   ├── database/
│   │   └── prisma.service.ts      # ✨ Database service
│   ├── tasks/
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   └── tasks.module.ts
│   ├── app.module.ts
│   └── main.ts                    # ✨ Updated with DB connection
├── prisma/
│   ├── schema.prisma              # ✨ Enhanced schema
│   └── seed.ts                    # ✨ Sample data seeder
├── .env.example                   # ✨ Updated with all variables
├── .gitignore                     # ✨ Ensures .env is never committed
├── DATABASE_SETUP.md              # ✨ Detailed database guide
├── SETUP.md                       # ✨ This file
└── package.json                   # ✨ Added Prisma scripts
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create and apply migrations |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:studio` | Open database GUI |
| `npm run prisma:reset` | Reset database (⚠️ deletes all data) |
| `npm run prisma:seed` | Seed database with sample data |

---

## 📊 Sample Data

After running `npm run prisma:seed`, you'll have:

**Departments:**
- Engineering
- Marketing
- Operations

**Users:**
- John Doe (john.doe@savage.com) - Engineering Admin
- Jane Smith (jane.smith@savage.com) - Marketing Manager
- Mike Johnson (mike.johnson@savage.com) - Operations Member

**Tasks:**
- 5 sample tasks across different departments and statuses

---

## 🔐 Security Notes

### ⚠️ IMPORTANT: Never commit `.env` file!

The `.gitignore` file is configured to exclude:
- `.env` and all `.env.*` files
- `secrets/` directory
- Service account JSON files

### Generate Secure Secrets

For production, generate strong secrets:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate refresh token secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🐛 Troubleshooting

### Database Connection Fails

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   Get-Service postgresql*
   ```

2. Test connection manually:
   ```bash
   psql -U postgres -d savage_portal
   ```

3. Check DATABASE_URL format in `.env`

### Migration Errors

1. Validate Prisma schema:
   ```bash
   npx prisma format
   npx prisma validate
   ```

2. If stuck, reset and retry:
   ```bash
   npm run prisma:reset
   npm run prisma:migrate
   npm run prisma:seed
   ```

### Port Already in Use

Change the port in `.env`:
```
PORT=4001
```

---

## ✅ Next Steps

With environment configuration and database setup complete, you can now proceed with:

1. **OAuth 2.0 Authentication** (Priority #3)
2. **User CRUD Endpoints** (Priority #4)
3. **Complete Task CRUD** (add UPDATE/DELETE operations)

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

**Ready for GitHub!** All sensitive data is properly excluded via `.gitignore`. You can safely commit and push these changes.
