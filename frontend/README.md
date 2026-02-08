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

1. **Payroll Calendar** - Time Clock UI (most complete feature)
2. **Task Tracking** - Kanban board (needs drag-drop)
3. **Dashboard** - Overview widgets (needs content)

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
│   ├── payroll-calendar/page.tsx    # ✅ Time tracking
│   ├── task-tracking/page.tsx       # 🟡 Kanban board
│   ├── dashboard/page.tsx           # 📦 Needs work
│   └── globals.css                  # 🎨 Theme system
├── components/
│   ├── Header.tsx                   # Page header
│   └── Sidebar.tsx                  # Navigation
└── assets/icons/                    # Custom SVG icons
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

- Time entries are **not persisted** - refresh loses data (localStorage coming soon)
- Tasks are **static sample data** - not saved anywhere
- No authentication yet - all pages publicly accessible
- No API integration - everything is client-side

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
