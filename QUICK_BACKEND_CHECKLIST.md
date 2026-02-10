# Quick Backend Development Checklist
**Internal Company Portal - SAVAGE LLC**

---

## 🔴 CRITICAL - DO FIRST (Phase 1: 3 days) ✅ COMPLETE

### 1. Announcements Module Enhancement ✅
- [x] Add `AnnouncementLike` model to schema
- [x] Add `AnnouncementComment` model to schema
- [x] Add `AnnouncementRSVP` model to schema
- [x] Add fields to `Announcement`: `isImportant`, `eventDate`, `eventLocation`, `birthdayDate`, `category`
- [x] Run migration: `npm run prisma:migrate -- --name add_announcement_features`
- [x] Create endpoint: `POST /api/announcements/:id/like`
- [x] Create endpoint: `POST /api/announcements/:id/comments`
- [x] Create endpoint: `DELETE /api/announcements/:id/comments/:commentId`
- [x] Create endpoint: `POST /api/announcements/:id/rsvp`
- [x] Update endpoint: `GET /api/announcements` (add category filter)

### 2. Daily Logs Module Enhancement ✅
- [x] Add `DailyLogLike` model to schema
- [x] Add fields to `DailyLog`: `department`, `status`, `hoursLogged`, `tasks` (JSON)
- [x] Run migration: `npm run prisma:migrate -- --name add_daily_log_features`
- [x] Create endpoint: `POST /api/daily-logs/:id/like`
- [x] Update endpoint: `GET /api/daily-logs` (add department & status filters)

### 3. Payroll/Time Tracking Enhancement ✅
- [x] Update `PayrollEvent` model: add `createdBy`, `isBuiltIn` fields
- [x] Run migration: `npm run prisma:migrate -- --name add_payroll_features`
- [x] Create endpoint: `POST /api/payroll/clock-in`
- [x] Create endpoint: `POST /api/payroll/clock-out`
- [x] Create endpoint: `GET /api/payroll/time-entries`
- [x] Create endpoint: `GET /api/payroll/time-entries/:date`
- [x] Create endpoint: `POST /api/payroll/events`
- [x] Create endpoint: `GET /api/payroll/events`
- [x] Create endpoint: `PATCH /api/payroll/events/:id`
- [x] Create endpoint: `DELETE /api/payroll/events/:id`

### 4. Task Tracking Alignment ✅
- [x] Update Task status values to match frontend: `todo`, `inprogress`, `review`, `done`
- [x] Add `role` field to Task model
- [x] Run migration: `npm run prisma:migrate -- --name align_task_status`
- [x] Update TasksController to handle new status values

**Phase 1 Status:** ✅ **100% COMPLETE** (Completed: Feb 10, 2026)

---

## 🟡 HIGH PRIORITY (Phase 2: 3.5 days)

### 5. Company Chat Module (NEW)
- [ ] Create `Message` model in schema
- [ ] Create `Channel` model in schema
- [ ] Run migration: `npm run prisma:migrate -- --name add_messaging`
- [ ] Create `src/messages/` module
- [ ] Create endpoint: `POST /api/messages`
- [ ] Create endpoint: `GET /api/messages`
- [ ] Create endpoint: `GET /api/messages/unread`
- [ ] Set up Socket.io event: `message:send`
- [ ] Set up Socket.io event: `message:receive`
- [ ] Set up Socket.io event: `user:online`

### 6. Private Messages Module (NEW)
- [ ] Create `DirectMessage` model in schema
- [ ] Create `Conversation` model in schema
- [ ] Run migration: `npm run prisma:migrate -- --name add_direct_messages`
- [ ] Create `src/direct-messages/` module
- [ ] Create endpoint: `POST /api/direct-messages`
- [ ] Create endpoint: `GET /api/direct-messages/:userId`
- [ ] Create endpoint: `GET /api/direct-messages`
- [ ] Create endpoint: `PATCH /api/direct-messages/:id/read`
- [ ] Set up Socket.io for DM delivery

---

## 🟢 MEDIUM PRIORITY (Phase 3: 4 days)

### 7. Whiteboard Module (NEW)
- [ ] Create `Whiteboard` model in schema
- [ ] Create `WhiteboardElement` model in schema
- [ ] Run migration: `npm run prisma:migrate -- --name add_whiteboard`
- [ ] Create `src/whiteboard/` module
- [ ] Create endpoint: `POST /api/whiteboards`
- [ ] Create endpoint: `GET /api/whiteboards`
- [ ] Create endpoint: `GET /api/whiteboards/:id`
- [ ] Create endpoint: `PATCH /api/whiteboards/:id`
- [ ] Set up Socket.io for real-time collaboration

### 8. Discord Integration (OPTIONAL)
- [ ] Install `discord.js` package
- [ ] Create Discord bot application
- [ ] Create `src/discord/` module
- [ ] Create endpoint: `GET /api/discord/channels`
- [ ] Create endpoint: `POST /api/discord/webhook`
- [ ] Create endpoint: `GET /api/discord/members`

---

## 🔵 INTEGRATION (Phase 4: 3.5 days)

### 9. Frontend Integration
- [ ] Update `frontend/src/lib/announcements.ts` to use API
- [ ] Update `frontend/src/lib/daily-logs.ts` to use API
- [ ] Update `frontend/src/lib/time-entries.ts` to use API
- [ ] Update `frontend/src/lib/tasks.ts` to use API
- [ ] Update `frontend/src/lib/payroll-events.ts` to use API
- [ ] Add Socket.io client to frontend
- [ ] Integrate real-time updates for messages
- [ ] Integrate real-time updates for whiteboard
- [ ] Test all features end-to-end
- [ ] Data migration from localStorage to database

---

## QUICK COMMANDS

### Database
```bash
# Generate Prisma client after schema changes
npm run prisma:generate

# Create and apply migration
npm run prisma:migrate -- --name your_migration_name

# View database in GUI
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npm run prisma:reset
```

### Development
```bash
# Start backend dev server
cd backend
npm run dev

# Start frontend dev server
cd frontend
npm run dev

# Run both (from root)
npm run dev
```

### Testing
```bash
# Test endpoint with curl
curl http://localhost:4000/api/announcements

# Test with auth
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/announcements
```

---

## PROGRESS TRACKING

### Week 1
- [ ] Day 1-2: Announcements Enhancement
- [ ] Day 3: Daily Logs Enhancement
- [ ] Day 4: Payroll Enhancement
- [ ] Day 5: Testing & Documentation

### Week 2
- [ ] Day 1-2: Company Chat Module
- [ ] Day 3-4: Private Messages Module
- [ ] Day 5: Testing

### Week 3
- [ ] Day 1-3: Whiteboard Module
- [ ] Day 4-5: Frontend Integration Start

### Week 4
- [ ] Day 1-3: Complete Frontend Integration
- [ ] Day 4-5: End-to-End Testing & Bug Fixes

---

## CURRENT STATUS

**Backend Modules:**
- ✅ Authentication (Complete)
- ✅ Users (Complete)
- ✅ Departments (Complete)
- ⚠️ Tasks (Needs alignment)
- ⚠️ Announcements (Needs enhancement)
- ⚠️ Daily Logs (Needs enhancement)
- ⚠️ Payroll (Needs enhancement)
- ❌ Company Chat (Not started)
- ❌ Private Messages (Not started)
- ❌ Whiteboard (Not started)
- ❌ Discord Integration (Not started)

**Overall Progress:** 40% Complete

---

**Last Updated:** February 10, 2026
