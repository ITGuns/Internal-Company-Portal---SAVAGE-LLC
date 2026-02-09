# Internal Company Portal - SAVAGE LLC

**Modern, Full-Stack Company Portal for Employee Management**

---

## 🚀 Quick Start

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```
**URL:** http://localhost:3000

### Backend Development
```bash
cd backend
npm install
npm run dev
```
**URL:** http://localhost:4000

---

## 📁 Project Structure

```
Internal Company Portal - SAVAGE LLC/
├── frontend/              # Next.js 16 + React 19 + TypeScript
│   ├── src/
│   │   ├── app/          # Pages (App Router)
│   │   ├── components/   # Reusable UI components
│   │   └── lib/          # Utility libraries
│   ├── FRONTEND_INIT.md  # 📍 Complete frontend documentation
│   └── UPDATES.md        # Daily changelog
│
├── backend/               # NestJS + PostgreSQL + Prisma
│   ├── src/              # API controllers and services
│   ├── prisma/           # Database schema and migrations
│   ├── SETUP.md          # Backend setup instructions
│   └── README.md         # Backend documentation
│
└── reports/              # Daily development reports
    └── daily/            # Daily progress logs
```

---

## 📚 Documentation

### **START HERE** → [Frontend Documentation](./frontend/FRONTEND_INIT.md)
Complete overview of frontend status, features, and architecture.

### **Daily Updates** → [Frontend Updates Log](./frontend/UPDATES.md)
Quick changelog of daily frontend changes.

### **Backend Setup** → [Backend Documentation](./backend/README.md)
Backend API setup and configuration.

### **Development Reports** → [Daily Reports](./reports/daily/)
Detailed daily development logs with technical decisions.

---

## ✅ Completed Features (as of 2026-02-10)

### Frontend
- ✅ **Dashboard** - Live stats, recent announcements, quick actions
- ✅ **Announcements & Shoutouts** - Full CRUD with likes, comments, RSVP, important flagging
- ✅ **Task Tracking** - Kanban board UI with department/role management
- ✅ **Daily Logs** - Work tracking with centralized department structure, theme styling
- ✅ **Payroll Calendar** - Time clock, event management (CRUD), timezone-aware aggregation
- ✅ **Department System** - Centralized hierarchy with 19 departments, recursive sidebar
- ✅ **Theme System** - Light/dark mode with localStorage persistence
- ✅ **localStorage** - Complete data persistence (tasks, time entries, announcements, events)
- ✅ **Component Library** - Modal, Header, Sidebar, Icon system

### Backend
- ✅ NestJS application structure
- ✅ PostgreSQL + Prisma ORM
- ✅ Authentication system (Discord, Google OAuth)
- ✅ User management
- ✅ Department structure
- ⚠️ **Note:** Frontend currently operates independently with localStorage

---

## 🎯 Current Status

**Frontend:** ✅ Fully functional with client-side persistence  
**Backend:** 🟡 Ready but not integrated with frontend  
**Integration:** 📦 Planned for future sprint

**Development Mode:** Frontend-first approach with localStorage.  
Backend becomes "sync layer" when integration is ready.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Runtime:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **State:** localStorage (temporary), React Query (ready)

### Backend
- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Passport (Discord, Google OAuth)
- **Email:** Nodemailer + Gmail

---

## 👥 Team Structure

**Frontend Team** - UI/UX implementation, client-side logic  
**Backend Team** - API, database, authentication, business logic

**Current Workflow:** Independent development with defined integration points.

---

## 📝 Latest Updates (2026-02-10)

### Frontend
- 🎉 **Department Management Centralization**
  - Created `lib/departments.ts` - single source of truth
  - 19-department structure matching org chart
  - Authority-based hierarchy (appointment relationships)
  - Recursive sidebar navigation with expandable departments
  - Updated 4 components: Daily Logs, Task Tracking, Sidebar

- 🎉 **Payroll Calendar Event System**
  - Full event CRUD (add/edit/delete)
  - 5 event types: payday, holiday, deadline, meeting, other
  - Built-in events (Presidents' Day, Pay Day, deadlines)
  - Custom events with localStorage persistence
  - Edit/delete all events (built-in create custom copies)
  
- 🎉 **Time Clock Fixes**
  - Fixed timezone issues (entries showing on wrong dates)
  - Aggregated time entries (one bar per day vs multiple)
  - Created `getLocalDateString()` helper for proper date handling
  - Consolidated daily totals display

- ✅ Daily Logs theme styling (light/dark form inputs, scrollbars)

### Backend
- See [Backend Update Report](./backend/BACKEND_UPDATE_REPORT.md)

---

## 🔄 Next Steps

### High Priority
1. Implement drag-and-drop in Task Tracking (@dnd-kit ready)
2. Add form validation across all features
3. Build error handling UI
4. Plan frontend-backend integration

### Medium Priority
1. Add comment edit/delete in announcements
2. Add announcement search and filters
3. Implement remaining placeholder pages
4. Add user authentication UI

### Later
1. Real-time updates (WebSocket)
2. Notification system
3. Mobile responsiveness improvements
4. Performance optimization

---

## 📞 Getting Help

### Documentation Issues?
Check daily reports in `reports/daily/` for detailed technical context.

### Build Problems?
```bash
# Format code
npx prettier --write "src/**/*.{ts,tsx,css,md}"

# Type check
npx tsc --noEmit
```

### Questions?
- Frontend: See [FRONTEND_INIT.md](./frontend/FRONTEND_INIT.md)
- Backend: See [backend/README.md](./backend/README.md)

---

## 📈 Project Metrics

**Lines of Code (Frontend):**
- Pages: ~2,500 lines
- Components: ~800 lines
- Libraries: ~600 lines
- **Total: ~3,900+ lines**

**Files Created:** 40+ frontend files, 30+ backend files

**Time Investment:** 6 days active development

---

**Last Updated:** February 10, 2026  
**Version:** 0.3.0  
**Status:** 🟢 Active Development

**See Also:**
- [Project Updates Log](./PROJECT_UPDATES.md) - Comprehensive changelog
- [Daily Report](./reports/daily/2026-02-10-daily-report.md) - Today's detailed report
