# Frontend - Internal Company Portal

Modern Next.js 16 + React 19 company portal interface.

---

## 📚 Documentation

- **[FRONTEND_INIT.md](./FRONTEND_INIT.md)** - Complete status, architecture, and feature inventory
- **[UPDATES.md](./UPDATES.md)** - Daily changelog (quick reference)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Commands

```bash
npm run dev          # Development server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

---

## 🎯 Current Focus Areas

1. **Component Library** - Building reusable components (Toast ✅, Card ✅, Modal ✅, Button ✅)
2. **UX Polish** - Adding feedback systems (Toast notifications ✅)
3. **Task Tracking** - Kanban board (needs drag-drop for column movement)

---

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** React 19
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Calendar:** FullCalendar v6
- **State:** @tanstack/react-query (ready to use)

---

## 📁 Key Files

```
src/
├── app/
│   ├── payroll-calendar/page.tsx    # ✅ Time tracking with toast feedback
│   ├── task-tracking/page.tsx       # ✅ Kanban board with Card components
│   ├── announcements/page.tsx       # ✅ Full CRUD with toast feedback
│   ├── daily-logs/page.tsx          # ✅ Logging with toast feedback
│   ├── dashboard/page.tsx           # ✅ Overview with Card components
│   └── globals.css                  # 🎨 Theme system
├── components/
│   ├── Header.tsx                   # Page header
│   ├── Sidebar.tsx                  # Navigation
│   ├── Modal.tsx                    # ✅ Reusable modal
│   ├── Button.tsx                   # ✅ Button variants
│   ├── Toast.tsx                    # ✅ Toast notifications
│   ├── ToastProvider.tsx            # ✅ Toast context
│   └── Card.tsx                     # ✅ Card component with variants
└── lib/
    ├── tasks.ts                     # Task management
    ├── announcements.ts             # Announcement system
    ├── time-entries.ts              # Time tracking
    └── storage.ts                   # localStorage utilities
```

---

## 🎨 Design System

Theme switching: Light/Dark mode with persistent localStorage  
CSS Variables: `--background`, `--foreground`, `--card-bg`, etc.  
Icons: Lucide React components  

---

## 🔌 Backend Integration

**Status:** Not started (backend handled by partner)  
**Plan:** Use React Query when backend APIs are ready  
**Current:** All features use client-side state + localStorage  

See [FRONTEND_INIT.md](./FRONTEND_INIT.md) for detailed backend integration plan.

---

## ⚠️ Important Notes

- All data uses **localStorage** - persists across page refreshes ✅
- **Toast notifications** provide feedback for all user actions ✅
- **Component library** established with Modal, Button, Toast, Card ✅
- No authentication yet - all pages publicly accessible
- No API integration - everything is client-side (ready for React Query)

---

## 🤝 Development Workflow

1. Check [UPDATES.md](./UPDATES.md) for recent changes
2. Pick a task from [FRONTEND_INIT.md](./FRONTEND_INIT.md) "Next Steps"
3. Develop and test locally
4. Update [UPDATES.md](./UPDATES.md) with changes
5. Commit with clear message

---

## 📞 Questions?

See [FRONTEND_INIT.md](./FRONTEND_INIT.md) for comprehensive documentation including:
- Feature status
- Architecture decisions
- Known issues
- Backend integration plan
- Testing status
- Performance notes

---

**Last Updated:** February 9, 2026
