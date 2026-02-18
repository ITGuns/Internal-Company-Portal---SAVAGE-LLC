# Dev Login Guide

## Quick Start

Auto-login has been **disabled** to allow multiple developers to test with different user accounts.

### Option 1: Use the Dev Login Page (Recommended)

Navigate to: **http://localhost:3000/dev-login**

Select from 3 test users:
- **John Doe** (john.doe@savage.com) - Admin - Engineering
- **Jane Smith** (jane.smith@savage.com) - Manager - Marketing  
- **Mike Johnson** (mike.johnson@savage.com) - Member - Operations

### Option 2: Use Browser Console

Open browser console and run:
```javascript
// Import the function
const { devLogin } = await import('./lib/api');

// Login as any test user
await devLogin('john.doe@savage.com');
await devLogin('jane.smith@savage.com');
await devLogin('mike.johnson@savage.com');
```

### Option 3: Use OAuth (Production-ready)

- **Google**: http://localhost:4000/auth/google
- **Discord**: http://localhost:4000/auth/discord

## What Changed?

### Before (Auto-login enabled)
- Frontend automatically logged in as `john.doe@savage.com` on every request
- Caused "username swapping" when multiple users tested simultaneously
- No control over which test user to use

### After (Auto-login disabled)
- Manual login required via dev-login page or OAuth
- Each developer can choose their own test user
- No automatic re-authentication on 401 errors
- Team members can test simultaneously without conflicts

## API Changes

The `devLogin()` function in [api.ts](frontend/src/lib/api.ts) now accepts an optional email parameter:

```typescript
// Default (John Doe)
await devLogin();

// Specific user
await devLogin('jane.smith@savage.com');
```

## Troubleshooting

### "No token found" errors
- Navigate to `/dev-login` and select a user
- Or clear localStorage and login again

### Session conflicts
Each user session is stored in localStorage:
- `accessToken` - JWT authentication token
- `currentUser` - User profile data

To logout: Clear localStorage or use different browser profiles for different test users.

### Backend not responding
Ensure backend is running: `cd backend && npm run dev`
Check backend is on port 4000: http://localhost:4000/health

## For Production

The dev-login endpoint is automatically disabled in production (checked via `NODE_ENV`). Only OAuth login will work.
