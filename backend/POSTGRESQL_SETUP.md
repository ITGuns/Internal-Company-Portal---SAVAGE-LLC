# PostgreSQL Installation Guide

## Installation Steps (While downloading)

### During Installation:
1. **Installation Directory**: Accept default (`C:\Program Files\PostgreSQL\16`)
2. **Components**: Select all (PostgreSQL Server, pgAdmin, Command Line Tools)
3. **Data Directory**: Accept default
4. **Password**: Set a password for the `postgres` superuser
   - **IMPORTANT**: Remember this password!
   - Example: `postgres123` (use something secure)
5. **Port**: Keep default `5432`
6. **Locale**: Accept default

### After Installation:

1. **Update your .env file** with the database URL:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/savage_portal
   ```
   Replace `YOUR_PASSWORD` with the password you set during installation.

2. **Create the database**:
   ```bash
   # Open PowerShell and run:
   psql -U postgres -c "CREATE DATABASE savage_portal;"
   ```
   (It will ask for the password you set)

3. **Run Prisma migrations**:
   ```bash
   npm run prisma:migrate
   ```

4. **Test the email service** (no database needed):
   ```bash
   npx ts-node test-email.ts
   ```

---

## Quick Commands Reference

After PostgreSQL is installed:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE savage_portal;"

# Run migrations
npm run prisma:migrate

# Test emails (standalone, no DB needed)
npx ts-node test-email.ts

# Start server
npm run dev
```

---

## Expected Database URL Format

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/savage_portal
```

**Example:**
```
DATABASE_URL=postgresql://postgres:mypassword123@localhost:5432/savage_portal
```

---

## What Password Should I Use?

- Use something you'll remember
- For development: `postgres` or `admin123` is fine
- For production: Use a strong, unique password

---

## After Installation

Let me know when PostgreSQL is installed and I'll help you:
1. Update the .env file with your password
2. Create the database
3. Run migrations
4. Test the email service!
