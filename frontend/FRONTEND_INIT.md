# Frontend Initialization & Status
**Internal Company Portal - SAVAGE LLC**

---

**Last Updated:** February 9, 2026  
**Developer:** Frontend Team  
**Version:** 0.2.0  
**Status:** Active Development (Backend-Independent)

---

## 🎯 FRONTEND MISSION

Building a modern, accessible, and responsive company portal UI with:
- Full offline-first capability (localStorage persistence)
- Production-ready UI components
- Backend-agnostic design (ready for API integration when backend is ready)

---

## 📦 TECH STACK

```json
{
  "framework": "Next.js 16 (App Router)",
  "runtime": "React 19",
  "language": "TypeScript 5",
  "styling": "Tailwind CSS 4 + DaisyUI",
  "icons": "Lucide React",
  "calendar": "FullCalendar v6",
  "dnd": "@dnd-kit",
  "state": "@tanstack/react-query (installed, not yet used)",
  "build": "Turbopack"
}
```

### Dependencies Status
- ✅ All core dependencies installed
- ✅ Dev tooling configured (ESLint, Prettier, TypeScript)
- ⚠️ React Query installed but not configured
- ⚠️ @dnd-kit installed but not implemented

---

## 🗂️ PROJECT STRUCTURE

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx            # ✅ Root layout with Sidebar
│   │   ├── globals.css           # ✅ Theme system + CSS tokens
│   │   ├── page.tsx              # ✅ Homepage (redirect to dashboard)
│   │   ├── dashboard/            # ✅ Dashboard page
│   │   ├── task-tracking/        # 🟡 Kanban board (static)
│   │   ├── payroll-calendar/     # ✅ Time Clock + Calendar
│   │   ├── announcements/        # ✅ Full CRUD with engagement
│   │   ├── company-chat/         # 📦 Placeholder
│   │   ├── daily-logs/           # 📦 Placeholder
│   │   ├── operations/           # 📦 Placeholder
│   │   ├── payroll-calendar/     # 📦 Placeholder
│   │   ├── private-messages/     # 📦 Placeholder
│   │   ├── profile/              # 📦 Placeholder
│   │   ├── task-calendar/        # 📦 Placeholder
│   │   └── whiteboard/           # 📦 Placeholder
│   ├── components/               # Reusable components
│   │   ├── Header.tsx            # ✅ Page header with theme toggle
│   │   ├── Sidebar.tsx           # ✅ Navigation sidebar
│   │   ├── Modal.tsx             # ✅ Reusable modal component
│   │   ├── Icon.tsx              # ✅ Icon wrapper
│   │   ├── IconButton.tsx        # ✅ Button with icon
│   │   ├── IconDemo.tsx          # ✅ Icon showcase
│   │   └── ThemeToggle.tsx       # ✅ Light/Dark mode switcher
│   ├── lib/                      # Utility libraries
│   │   ├── storage.ts            # ✅ localStorage wrapper
│   │   ├── time-entries.ts       # ✅ Time entry management
│   │   ├── tasks.ts              # ✅ Task management
│   │   └── announcements.ts      # ✅ Announcement management
│   └── assets/
│       └── icons/                # Custom SVG icons
│           ├── BrandLogo.tsx     # ✅ Company logo
│           └── UserAvatar.tsx    # ✅ User avatar placeholder
├── public/                       # Static assets
├── scripts/
│   └── a11y-audit.js            # ✅ Accessibility testing
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.ts
└── FRONTEND_INIT.md             # 📍 This file
```

**Legend:**
- ✅ Complete and functional
- 🟡 Partial implementation
- 📦 Placeholder / Not started
- ⚠️ Needs attention

---

## 🎨 DESIGN SYSTEM

### Theme Tokens (CSS Custom Properties)
```css
--background       # Page background
--foreground       # Primary text color
--muted            # Secondary/muted text
--card-bg          # Card background
--card-surface     # Nested card surface
--border           # Border color
--accent           # Brand color (#c03333)
--header-height    # Dynamic header height
--sidebar-width    # Dynamic sidebar width
```

### Theme Modes
- ✅ Light mode (default)
- ✅ Dark mode (prefers-color-scheme + manual toggle)
- ✅ No FOUC (flash of unstyled content) - theme applied before hydration
- ✅ Persistent via localStorage

### Typography
- Sans: Geist Sans (variable font)
- Mono: Geist Mono (variable font)

### Color System
- **Light Mode**: White backgrounds, slate grays
- **Dark Mode**: Dark blue backgrounds (#0b1220), muted foregrounds

---

## ✅ COMPLETED FEATURES

### 🧭 Navigation (Sidebar)
- ✅ Fixed left sidebar (256px width)
- ✅ Active page highlighting
- ✅ Hover/press animations
- ✅ Accessible keyboard navigation
- ✅ User profile section
- ✅ Department expansion (placeholder data)
- ✅ Responsive design
- ✅ CSS variable exposure for layout alignment

**File:** `src/components/Sidebar.tsx`

### 📊 Header
- ✅ Page-specific titles and subtitles
- ✅ Theme toggle (light/dark)
- ✅ Notification bell (placeholder)
- ✅ Settings button (placeholder)
- ✅ Search button (placeholder)
- ✅ User avatar dropdown (placeholder)
- ✅ Dynamic outline alignment under sidebar divider

**File:** `src/components/Header.tsx`

### 📅 Payroll Calendar (MOST COMPLETE PAGE)
**Status:** ✅ Fully functional (client-side only)  
**File:** `src/app/payroll-calendar/page.tsx` (717 lines)

**Features:**
- ✅ FullCalendar integration (monthly view)
- ✅ Time Clock UI
  - ✅ Clock In/Out buttons
  - ✅ Manual time entry modal
  - ✅ Today's total hours calculation
  - ✅ List of today's entries with delete
  - ✅ "Clocked In" visual indicator (pulsing dot)
- ✅ Calendar event types:
  - Pay Day (emerald)
  - Holiday (red)
  - Deadline (amber)
  - Time entries (sky blue)
- ✅ Event Details panel with date selection
- ✅ Upcoming Events list
- ✅ Stats cards (Pay Days, Holidays, Deadlines, Total)
- ✅ Monthly/Annual view toggle (partial)
- ✅ Color-coded event rendering

**Current Limitations:**
- ⚠️ Time entries stored in component state (lost on refresh)
- ⚠️ Hard-coded event data
- ⚠️ No backend API integration
- ⚠️ Using inline SVG icons instead of Lucide

**Next Steps:**
1. Add localStorage persistence for time entries
2. Extract time entry logic into custom hook
3. Replace inline SVGs with Lucide icons
4. Add time entry editing
5. Add export/report functionality

### 📋 Task Tracking
**Status:** 🟡 Static UI complete, needs state management  
**File:** `src/app/task-tracking/page.tsx` (958 lines)

**Features:**
- ✅ View mode toggle (Grid/List/Calendar)
- ✅ Kanban board UI (4 columns: To Do, In Progress, Review, Done)
- ✅ Task cards with:
  - Priority indicators (Low/Med/High color dots)
  - Assignee avatars
  - Due dates
  - Department/Role tags
- ✅ FullCalendar integration
- ✅ "This Week" summary stats (boxed 2x2 grid)
- ✅ New/Edit task modal UI
- ✅ Filter and sort controls (UI only)

**Current Limitations:**
- ⚠️ Sample data only
- ⚠️ No drag-and-drop functionality
- ⚠️ Modals not connected to state
- ⚠️ No localStorage persistence
- ⚠️ No backend integration

**Next Steps:**
1. Implement drag-and-drop with @dnd-kit
2. Add localStorage for task persistence
3. Connect New/Edit modals to state
4. Add task filtering/sorting logic
5. Add task search functionality

### 🏠 Dashboard
**Status:** ✅ Complete with live data  
**File:** `src/app/dashboard/page.tsx` (199 lines)

**Features:**
- ✅ Live stats from persisted data
  - Today's time logged
  - This week's tasks (total, completed, overdue)
- ✅ Quick Links section
- ✅ Company Chat preview (empty state)
- ✅ Recent announcements (3 most recent, prioritizes important)
- ✅ Shoutouts section (empty state)
- ✅ Quick Actions buttons

**Next Steps:**
1. Add activity feed/timeline
2. Add performance charts
3. Add customizable widgets

### 📢 Announcements & Shoutouts
**Status:** ✅ Fully functional (client-side)  
**File:** `src/app/announcements/page.tsx` (534 lines)  
**Library:** `src/lib/announcements.ts` (217 lines)

**Features:**
- ✅ Four announcement categories:
  - Company News (Megaphone icon)
  - Shoutouts (Trophy icon)
  - Events (Calendar icon)
  - Birthdays (Cake icon)
- ✅ Filter tabs (All, Company News, Shoutouts, Events)
- ✅ Full CRUD operations:
  - Add announcements with category selector
  - Edit button with pre-filled form
  - Delete with confirmation
  - 3-dot menu (MoreVertical) for actions
- ✅ Engagement features:
  - Likes (Heart icon, fill on like, show count)
  - Comments (expandable section, add with Enter or Send)
  - Event RSVP ("Going" button with attendee count)
- ✅ Important announcements:
  - Checkbox: "Mark as Important"
  - AlertCircle (!) icon badge next to title
  - "IMPORTANT" badge near 3-dot menu
  - Prioritized on dashboard (shown first)
- ✅ Event-specific fields:
  - Date & Time field (for events)
  - Location field (for events)
- ✅ Time formatting ("Just now", "5 minutes ago", etc.)
- ✅ localStorage persistence
- ✅ Dashboard integration (shows 3 most recent)
- ✅ Empty state UI

**Current Limitations:**
- ⚠️ No user authentication (using 'User' as default author)
- ⚠️ Comments cannot be edited/deleted
- ⚠️ No pagination (will be needed as data grows)
- ⚠️ Event RSVP shows count only, not names

**Next Steps:**
1. Add comment edit/delete functionality
2. Add announcement search
3. Add date range filters
4. Add rich text editor for body
5. Add notification system for important announcements

---

## 🚧 IN PROGRESS / NEEDS WORK

### High Priority
1. ✅ **localStorage Persistence System** (COMPLETE)
   - ✅ Created `src/lib/storage.ts` utility
   - ✅ Added to time entries (`src/lib/time-entries.ts`)
   - ✅ Added to tasks (`src/lib/tasks.ts`)
   - ✅ Added to announcements (`src/lib/announcements.ts`)
   - ✅ User preferences (theme, view modes)

2. ✅ **Icon System Standardization** (COMPLETE)
   - ✅ Replaced emojis with Lucide icons
   - ✅ Consistent icon sizing (w-4 h-4, w-5 h-5)
   - ✅ Using lucide-react throughout

3. ✅ **Component Library** (STARTED)
   - ✅ Modal component extracted and reusable
   - 🟡 Button component (needs variants)
   - 🟡 Form components (needs standardization)
   - Extract reusable Card component
   - Extract reusable Button variants
   - Extract reusable Form inputs

4. **State Management**
   - Set up React Query
   - Create custom hooks for data fetching
   - Add optimistic updates

### Medium Priority
1. **Error Handling**
   - Add error boundaries
   - Add toast notifications
   - Add form validation UI

2. **Loading States**
   - Add skeleton loaders
   - Add spinner components
   - Add loading overlays

3. **Accessibility**
   - Audit all forms for ARIA labels
   - Add keyboard shortcuts
   - Test with screen readers
   - Add focus trap for modals

4. **Mobile Responsiveness**
   - Add mobile navigation
   - Optimize calendar for mobile
   - Test all pages on mobile

---

## 📦 PLACEHOLDER PAGES (Not Started)

These pages have basic routing but no content:

1. **Announcements** (`/announcements`)
2. **Company Chat** (`/company-chat`)
3. **Daily Logs** (`/daily-logs`)
4. **Operations** (`/operations`)
5. **Private Messages** (`/private-messages`)
6. **Profile** (`/profile`)
7. **Task Calendar** (`/task-calendar`) - separate from task-tracking
8. **Whiteboard** (`/whiteboard`)
9. **Discord Integration** (`/discord`)

---

## 🔌 BACKEND INTEGRATION READINESS

### API Integration Plan (When Backend is Ready)

**Pattern to Use:** React Query + API client

```typescript
// Example structure (to be implemented)
// src/lib/api-client.ts
// src/hooks/useTimeEntries.ts
// src/hooks/useTasks.ts
```

**Endpoints Needed from Backend:**

#### Time Tracking
- `GET /api/time-entries` - Fetch user's time entries
- `POST /api/time-entries` - Create time entry (clock in)
- `PATCH /api/time-entries/:id` - Update time entry (clock out)
- `DELETE /api/time-entries/:id` - Delete time entry

#### Tasks
- `GET /api/tasks` - Fetch tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Update task status (for drag-drop)

#### Calendar Events
- `GET /api/payroll-events` - Fetch payroll calendar events
- `POST /api/payroll-events` - Create event (admin)
- `PATCH /api/payroll-events/:id` - Update event
- `DELETE /api/payroll-events/:id` - Delete event

#### User/Auth
- `GET /api/auth/me` - Get current user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/users/:id` - Get user profile

**API Client Setup (Ready to Add):**
```typescript
// When backend is ready, we'll add:
// 1. Axios or fetch wrapper
// 2. Request/response interceptors
// 3. Error handling
// 4. Auth token management
// 5. React Query hooks
```

---

## 🏗️ ARCHITECTURE DECISIONS

### 1. **Client-Side First Approach**
- Build fully functional UI with client-side state
- Add localStorage for persistence
- Backend becomes "sync layer" when ready

### 2. **CSS Custom Properties Over Tailwind Config**
- Dynamic theming requires runtime CSS variables
- Easier to maintain theme switching
- Better for sidebar/header dynamic sizing

### 3. **App Router (Not Pages Router)**
- Using Next.js 13+ App Router
- All components are Server Components by default
- Interactive components marked with `"use client"`

### 4. **Component Composition Over Props Drilling**
- Header accepts title/subtitle from pages
- Sidebar emits CSS variables for layout
- Minimal prop passing between components

### 5. **Accessibility First**
- Keyboard navigation built-in
- ARIA labels on all interactive elements
- Focus management in modals
- Respects `prefers-reduced-motion`

---

## 🐛 KNOWN ISSUES

### Critical
- None currently

### High Priority
1. No form validation anywhere
2. No error handling UI
3. Tasks need drag-and-drop (@dnd-kit installed but not used)
4. No user authentication system

### Medium Priority
1. Some TypeScript `any` types need proper typing
2. Modal doesn't trap focus
3. Mobile sidebar needs hamburger menu
4. No loading states during operations

### Low Priority
1. Calendar doesn't show current date indicator
2. Task board columns don't have drag-drop
3. No keyboard shortcuts defined
4. Stats cards could animate on mount

---

## 🧪 TESTING STATUS

### Manual Testing
- ✅ Light/Dark theme switching works
- ✅ Sidebar navigation and active states
- ✅ Time Clock In/Out functionality
- ✅ Manual time entry modal
- ✅ Calendar date selection
- ✅ Event details panel updates

### Automated Testing
- ⚠️ No unit tests yet
- ⚠️ No integration tests yet
- ⚠️ No E2E tests yet
- ✅ Accessibility audit script available (`npm run a11y-audit`)

### Browser Testing
- ✅ Chrome (primary development)
- ⚠️ Firefox (needs testing)
- ⚠️ Safari (needs testing)
- ⚠️ Mobile browsers (needs testing)

---

## 📈 PERFORMANCE

### Current Metrics
- **Bundle Size:** Not measured yet
- **First Load JS:** Not measured yet
- **Lighthouse Score:** Not run yet

### Optimizations Applied
- ✅ Next.js automatic code splitting
- ✅ React 19 compiler optimizations
- ✅ CSS Custom Properties (minimal runtime)
- ✅ Lazy loading for FullCalendar

### Optimizations Needed
- ⚠️ Image optimization (when images are added)
- ⚠️ Dynamic imports for modals
- ⚠️ Memoization of expensive calculations
- ⚠️ Virtual scrolling for large lists

---

## 🚀 DEPLOYMENT READINESS

### Production Checklist
- ⚠️ Environment variables not configured
- ⚠️ API base URL needs configuration
- ⚠️ Error tracking not set up (Sentry)
- ⚠️ Analytics not configured
- ⚠️ Build optimization not tuned
- ⚠️ Security headers not configured

### Build Commands
```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint check
```

---

## 📋 IMMEDIATE NEXT STEPS (Priority Order)

### This Week (Feb 9-16, 2026)
1. ✅ Create this FRONTEND_INIT.md document
2. ⬜ Add localStorage persistence for time entries
3. ⬜ Replace emojis with Lucide icons in payroll calendar
4. ⬜ Extract reusable Modal component
5. ⬜ Add form validation to time entry modal

### Next Week (Feb 17-23, 2026)
1. ⬜ Implement task drag-and-drop
2. ⬜ Add localStorage for tasks
3. ⬜ Create reusable Button and Input components
4. ⬜ Add toast notification system
5. ⬜ Set up React Query infrastructure

### Future (When Backend is Ready)
1. ⬜ Replace localStorage with API calls
2. ⬜ Add authentication flow
3. ⬜ Add real-time updates (WebSockets?)
4. ⬜ Add conflict resolution for offline edits
5. ⬜ Add data sync status indicators

---

## 💡 QUICK REFERENCE

### Starting Development
```bash
cd frontend
npm install
npm run dev
```
**URL:** http://localhost:3000

### File Formatting
```bash
npx prettier --write "src/**/*.{ts,tsx,css,md}"
```

### Type Checking
```bash
npx tsc --noEmit
```

### Adding Icons
```typescript
import { IconName } from 'lucide-react';
// Use: <IconName className="w-5 h-5" />
```

### Adding a New Page
1. Create `src/app/page-name/page.tsx`
2. Add `"use client"` if interactive
3. Import and use `<Header title="..." subtitle="..." />`
4. Add route to Sidebar navigation

### Theme Token Usage
```tsx
<div className="bg-[var(--card-bg)] text-[var(--foreground)]">
  <p className="text-[var(--muted)]">Muted text</p>
</div>
```

---

## 🤝 COLLABORATION WITH BACKEND

### What Frontend Needs from Backend
1. **API Specification**
   - OpenAPI/Swagger docs
   - Request/response examples
   - Authentication flow details

2. **Development Environment**
   - Backend URL for local development
   - Test user credentials
   - API keys (if needed)

3. **Data Contracts**
   - TypeScript interfaces for API responses
   - Error response format
   - Pagination format

### What Backend Can Expect from Frontend
1. **We Handle:**
   - All UI state management
   - Client-side validation
   - Optimistic updates
   - Error display to users

2. **We Need:**
   - Consistent error responses
   - Proper HTTP status codes
   - CORS configured for dev environment
   - Rate limiting info

---

## 📞 CONTACT & RESOURCES

### Frontend Developer
- **Role:** Frontend Team
- **Focus:** UI/UX implementation, client-side logic

### Backend Developer (Partner)
- **Role:** Backend Team
- **Focus:** API, database, authentication, business logic

### Documentation
- Next.js: https://nextjs.org/docs
- React 19: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- FullCalendar: https://fullcalendar.io/docs/react

---

## 🔄 CHANGELOG

### 2026-02-09
- 📄 Created FRONTEND_INIT.md
- 📊 Documented all current features and status
- 🎯 Defined next steps and priorities
- ✅ Built complete Announcements system (534 lines)
  - Full CRUD: add, edit, delete announcements
  - Four categories: Company News, Shoutouts, Events, Birthdays
  - Engagement: likes, comments, event RSVP
  - Important flag with priority display
  - 3-dot menu for edit/delete
  - localStorage persistence
  - Dashboard integration (shows 3 recent)
- ✅ Created announcements library (`src/lib/announcements.ts`, 217 lines)
  - TypeScript interfaces and types
  - CRUD operations with localStorage
  - Engagement features (toggleLike, addComment, toggleGoing)
  - Utility functions (getTimeAgo, getRecentAnnouncements)
- ✅ Modal component fixes
  - Fixed z-index (z-50 → z-[9999])
  - Fixed size prop mapping
- 🐛 Fixed multiple JSX parsing errors during development

### 2026-02-06
- ✅ Completed Time Clock UI in Payroll Calendar
- ✅ Added manual time entry modal
- ✅ Implemented derived calendar events from time entries
- ✅ Improved Event Details UI

### 2026-02-05
- ✅ Completed Task Tracking page with Grid/List/Calendar views
- ✅ Added priority dots and color coding
- ✅ Implemented "This Week" summary cards
- ✅ Fixed theme tokens and avoided FOUC

### 2026-02-04
- ✅ Polished Task Tracking calendar view
- ✅ Added FullCalendar month view with custom event rendering
- ✅ Fixed theme consistency issues

### 2026-02-03
- ✅ Added Sidebar animations and active state
- ✅ Implemented Header with page-specific titles
- ✅ Created static Kanban board UI

---

**Last Updated:** February 9, 2026  
**Next Review:** Every commit or major feature completion
