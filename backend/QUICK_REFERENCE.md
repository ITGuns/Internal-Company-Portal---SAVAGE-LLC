# Quick Reference - Backend

## 🚀 Quick Start (First Time Setup)

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Setup database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. Start server
npm run dev
```

## 📋 Common Commands

```bash
# Development
npm run dev                    # Start dev server (hot reload)

# Database
npm run prisma:studio          # Open database GUI
npm run prisma:migrate         # Create new migration
npm run prisma:seed            # Add sample data

# Testing
curl http://localhost:4000/health          # Health check
curl http://localhost:4000/api/tasks       # Get all tasks
```

## 🔧 Environment Variables (Required)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/savage_portal
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/main.ts` | Application entry point |
| `src/config/env.config.ts` | Environment configuration |
| `src/database/prisma.service.ts` | Database service |
| `prisma/schema.prisma` | Database schema |
| `.env` | Environment variables (git-ignored) |

## 🐛 Troubleshooting

**Database connection fails?**
```bash
# Check PostgreSQL is running
Get-Service postgresql*

# Test connection
psql -U postgres -d savage_portal
```

**Prisma errors?**
```bash
# Regenerate client
npm run prisma:generate

# Reset database (⚠️ deletes data)
npm run prisma:reset
```

**Port already in use?**
```bash
# Change port in .env
PORT=4001
```

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/:id` | Get task by ID |
| POST | `/api/tasks` | Create task |

## 🎯 Next Steps

See `SETUP.md` for detailed instructions.
See `COMPLETION_SUMMARY.md` for what's been completed.
