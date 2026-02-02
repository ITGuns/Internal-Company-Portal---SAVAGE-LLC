# Database Setup Guide

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ installed

## Quick Start

### 1. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE savage_portal;

# Create user (optional)
CREATE USER savage_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE savage_portal TO savage_admin;

# Exit psql
\q
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://savage_admin:your_secure_password@localhost:5432/savage_portal
```

### 3. Run Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database with sample data
npm run prisma:seed
```

## Available Scripts

```bash
# Generate Prisma Client (run after schema changes)
npm run prisma:generate

# Create and run a new migration
npm run prisma:migrate

# Apply migrations without creating new ones
npm run prisma:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npm run prisma:reset

# Seed database with sample data
npm run prisma:seed
```

## Database Schema

### Tables

- **User** - Employee/user accounts
- **Department** - Company departments
- **Task** - Work items/tasks
- **UserRole** - Role-based permissions

### Relationships

- Users can have multiple roles across departments
- Tasks can be assigned to users
- Tasks belong to departments
- Departments can have multiple tasks and user roles

## Troubleshooting

### Connection Issues

If you get connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # Check if port 5432 is listening
   netstat -an | findstr 5432
   ```

2. Check your DATABASE_URL format:
   ```
   postgresql://[user]:[password]@[host]:[port]/[database]
   ```

3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```

### Migration Errors

If migrations fail:

1. Check Prisma schema syntax:
   ```bash
   npx prisma format
   npx prisma validate
   ```

2. Reset and try again (WARNING: deletes data):
   ```bash
   npm run prisma:reset
   ```

## Production Deployment

For production, use environment variables from your hosting provider:

- **Railway**: Auto-provisions PostgreSQL
- **Heroku**: Use Heroku Postgres addon
- **AWS**: Use RDS PostgreSQL
- **Vercel**: Use Vercel Postgres or external provider

Always use SSL in production:
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```
