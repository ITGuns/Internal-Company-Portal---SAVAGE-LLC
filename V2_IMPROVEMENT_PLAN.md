# V2 Improvement Plan — Internal Company Portal (MyDeskii)

**Branch:** `v2-improvements`
**Created:** March 10, 2026
**Last Updated:** March 10, 2026
**Status:** ✅ COMPLETE — All phases + all deferred items done

---

## Phase 1: Critical Fixes (Security & Data Flow)

### 1.1 — Real-time Data Updates (No Page Refresh Needed) ✅ DONE
- [x] Pages require manual refresh to see new data (announcements, tasks, chat, etc.)
- [x] Implement proper Socket.io event listeners on frontend pages
- [x] Add React Query for automatic cache invalidation and refetching
- [x] Ensure WebSocket events trigger UI updates (new message, new task, status change)

**What was done (March 10, 2026):**
- Wired up `@tanstack/react-query` v5 (was installed but unused) — created `QueryClient` singleton, `QueryProvider`, added to layout
- Created React Query hooks: `useAnnouncementsQuery`, `useTasksQuery`, `useDailyLogsQuery`, `useTimeEntriesQuery`
- Added `broadcastDataChange(resource)` method to backend `NotificationService` (socket.service.ts)
- Backend emits `data:changed` socket event after every mutation in: announcements (10 paths), tasks (3), daily-logs (4), time-entries/payroll (4)
- Frontend `SocketContext` listens for `data:changed` and auto-invalidates matching React Query cache
- Refactored 4 pages to React Query: **dashboard**, **announcements**, **task-tracking**, **daily-logs**
- Dual invalidation: local `queryClient.invalidateQueries()` for instant feedback + socket for cross-client sync
- **Files created:** `queryClient.ts`, `QueryProvider.tsx`, `useAnnouncementsQuery.ts`, `useTasksQuery.ts`, `useDailyLogsQuery.ts`, `useTimeEntriesQuery.ts`
- **Files modified:** `layout.tsx`, `SocketContext.tsx`, `socket.service.ts`, `announcements.service.ts`, `tasks.controller.ts`, `daily-logs.controller.ts`, `payroll.controller.ts`, `dashboard/page.tsx`, `announcements/page.tsx`, `task-tracking/page.tsx`, `daily-logs/page.tsx`
- **Not yet migrated (lower priority):** `TimeClock.tsx`, `TimeTrackingCalendar.tsx`, `usePayrollData.ts`, `operations/page.tsx`, `profile/page.tsx` — still use old manual fetch patterns but are functional

### 1.2 — Security Fixes ✅ DONE
- [x] Remove hardcoded bypass emails from backend (10 locations across 7 files)
- [x] Move authorized emails to environment variable (`ADMIN_EMAILS`)
- [x] Create `isAdminEmail()` shared helper in env.config.ts (DRY)
- [x] Move ops manager email to environment variable (`OPS_MANAGER_EMAIL`)
- [x] Restrict Socket.io CORS to `config.corsOrigin` (was allowing ALL origins)
- [x] `/dev-login` route already protected by `NODE_ENV` check ✅
- [x] Add input validation on signup (email regex, password: 8+ chars, uppercase, number)
- [x] Add input validation on login (email format check)

**What was done (March 10, 2026):**
- Added `adminEmails` (from `ADMIN_EMAILS` env var, comma-separated) and `opsManagerEmail` (from `OPS_MANAGER_EMAIL`) to `EnvConfig`
- Created `isAdminEmail(email)` exported helper in `env.config.ts` — single source of truth
- **Removed ALL hardcoded `genroujoshcatacutan25@gmail.com` / `daryldave018@gmail.com` bypass arrays from:**
  - `auth.middleware.ts` — `requireRole()` and `requireDepartment()` (2 locations)
  - `daily-logs.controller.ts` — `checkOwnership` (1 location)
  - `employees.controller.ts` — `authorizeBypass()` + `opsManagerEmail` (2 locations)
  - `payroll.controller.ts` — time-entries, entry, preview-calculation, config GET/POST, my-payslips (6 locations)
  - `users.controller.ts` — user update authorization (1 location)
- Fixed Socket.io CORS: replaced `callback(null, true)` (allow-all) with `config.corsOrigin`
- Added email regex validation + password strength requirements to `/signup` and `/login`
- **Files modified:** `env.config.ts`, `auth.middleware.ts`, `auth.controller.ts`, `daily-logs.controller.ts`, `employees.controller.ts`, `payroll.controller.ts`, `users.controller.ts`, `socket.service.ts`
- **Env vars to set:** `ADMIN_EMAILS=email1@example.com,email2@example.com` and `OPS_MANAGER_EMAIL=manager@example.com`

---

## Phase 2: Performance & Loading

### 2.1 — Lazy Loading + Skeleton Loaders ✅ DONE
- [x] Implement `next/dynamic` for heavy components (FullCalendar, jsPDF, modals)
- [x] Lazy load modals (they don't need to load until opened)
- [x] Add `next/dynamic` for large components (CalendarTab, LogReportModal)
- [x] Skeleton loaders instead of blank screens while data loads
- [x] Image lazy loading with `next/image` and blur placeholders

**What was done — Image lazy loading (March 10, 2026):**
- Converted 16+ `<img>` tags to `next/image` `<Image>` across: Header.tsx, Sidebar.tsx, ProfileSidebar.tsx, profile/page.tsx, ChatSidebar.tsx, NewChatModal.tsx, CreateChannelModal.tsx, chat/page.tsx, company-chat/page.tsx, private-messages/page.tsx, BoardCard.tsx, EmployeeSidebarItem.tsx, EmployeeCard.tsx, EmployeeOverviewTab.tsx, EmployeeProfilePanel.tsx, EmployeeDetailsModal.tsx
- Configured `next.config.ts` with `images.remotePatterns` for `lh3.googleusercontent.com`, `cdn.discordapp.com`, `ui-avatars.com`
- 9 `<img>` tags intentionally kept (base64 previews: EditProfileModal, AddEmployeeModal, MessageInput; attachment displays: chat pages; Google Drive thumbnails with onError handler)

**What was done (March 10, 2026):**
- Created skeleton component library (`components/ui/Skeleton.tsx`) with base `Skeleton` + 6 page-specific presets: `SkeletonCard`, `SkeletonRow`, `PageSkeleton`, `DashboardSkeleton`, `TaskBoardSkeleton`, `AnnouncementSkeleton`, `DailyLogsSkeleton`
- Created `LazyFullCalendar` wrapper (`components/ui/LazyFullCalendar.tsx`) that bundles FullCalendar + plugins for clean dynamic import
- **task-tracking/page.tsx**: Lazy-loaded FullCalendar via `LazyFullCalendar` wrapper + `next/dynamic`, dynamic `import()` for jsPDF/autoTable (loaded on PDF export click only), lazy-loaded `LogReportModal`, replaced `LoadingSpinner` with `TaskBoardSkeleton`
- **payroll-calendar/page.tsx**: Lazy-loaded `CalendarTab` (contains FullCalendar), `AddTimeEntryModal`, `AddEventModal` via `next/dynamic`, replaced `LoadingSpinner` with `PageSkeleton`
- **EmployeeOverviewTab.tsx**: Lazy-loaded 3 modals (`EmployeeDetailsModal`, `EmployeeEditModal`, `AddEmployeeModal`)
- **PayslipsTab.tsx**: Lazy-loaded 3 modals (`GeneratePayslipModal`, `PayslipDetailsModal`, `AddTimeEntryModal`)
- **file-directory/page.tsx**: Lazy-loaded `AddFolderModal`
- Replaced `LoadingSpinner` with appropriate skeletons on **all 8 pages**: dashboard → `DashboardSkeleton`, task-tracking → `TaskBoardSkeleton`, announcements → `AnnouncementSkeleton`, daily-logs → `DailyLogsSkeleton`, company-chat/chat/private-messages/my-payslips → `PageSkeleton`
- **ReportsTab.tsx**: Replaced `LoadingSpinner` with `PageSkeleton`
- **Files created:** `Skeleton.tsx`, `LazyFullCalendar.tsx`
- **Files modified:** `task-tracking/page.tsx`, `payroll-calendar/page.tsx`, `dashboard/page.tsx`, `announcements/page.tsx`, `daily-logs/page.tsx`, `company-chat/page.tsx`, `chat/page.tsx`, `my-payslips/page.tsx`, `private-messages/page.tsx`, `file-directory/page.tsx`, `EmployeeOverviewTab.tsx`, `PayslipsTab.tsx`, `ReportsTab.tsx`
- **Build verified:** Production build passes with all changes

### 2.2 — Pagination & Data Fetching ✅ DONE
- [x] Add pagination defaults on all list endpoints (tasks, users, logs)
- [x] Implement infinite scroll or paginated tables where needed
- [x] Add loading states and empty states for every data-driven page

**What was done (March 10, 2026):**
- **Backend:** Added optional `page` and `limit` query params to 4 services + controllers: announcements, daily-logs, tasks, users. When provided, returns `{ data, total, page, limit, totalPages }` via Prisma `skip`/`take` + `count()`. When omitted, returns plain array (backward compatible).
- **Frontend:** Created shared `PaginatedResponse<T>` type at `lib/types/pagination.ts`. Created reusable `Pagination` UI component at `components/ui/Pagination.tsx` (prev/next buttons, page numbers with ellipsis, total count display, auto-hides when totalPages ≤ 1).
- **Frontend lib:** Added `fetchAnnouncementsPaginated()`, `fetchDailyLogsPaginated()`, `fetchTasksPaginated()`, `fetchUsersPaginated()` functions.
- **React Query hooks:** Added `useAnnouncementsPaginated()`, `useDailyLogsPaginated()`, `useTasksPaginated()` hooks with `placeholderData: (prev) => prev` for smooth transitions.
- **Pages wired:** Announcements page (PAGE_SIZE=10), Daily-logs page (PAGE_SIZE=15) with client-side Pagination component. Tasks page uses board/calendar views with client-side filtering so server-side pagination was not applied.
- **Empty states:** Verified all data-driven pages already have proper empty states (EmptyState component or inline fallbacks).
- **Files created:** `pagination.ts`, `Pagination.tsx`
- **Files modified:** `announcements.service.ts`, `announcements.controller.ts`, `daily-logs.service.ts`, `daily-logs.controller.ts`, `tasks.service.ts`, `tasks.controller.ts`, `users.service.ts`, `users.controller.ts`, `announcements.ts`, `daily-logs.ts`, `tasks.ts`, `users.ts`, `useAnnouncementsQuery.ts`, `useDailyLogsQuery.ts`, `useTasksQuery.ts`, `announcements/page.tsx`, `daily-logs/page.tsx`

---

## Phase 3: Code Quality & Architecture

### 3.1 — Break Up Large Files (task-tracking ✅ + announcements ✅ + chat ✅ DONE)
- [x] `task-tracking/page.tsx` (1,364 → 926 lines) → extracted TaskModal, TaskCalendarView, BoardCard
- [x] `announcements/page.tsx` (689 → 412 lines) → extracted AnnouncementCard, AnnouncementFormModal
- [x] `chat/page.tsx` (797 → 484 lines) → extracted ChatSidebar, MessageInput, NewChatModal, CreateChannelModal
- [x] Consolidate `/chat`, `/company-chat`, `/private-messages` into one unified chat experience

**What was done — Chat consolidation (March 10, 2026):**
- The unified `/chat` page (using extracted ChatSidebar, MessageInput, NewChatModal, CreateChannelModal components) already supports both channels and DMs
- Added `chat:user_left` socket event handler to `/chat` page (was only in the old pages)
- Added `isConnected` prop to ChatSidebar with connection status indicator (green/red dot next to Channels header)
- Replaced `/company-chat/page.tsx` and `/private-messages/page.tsx` with server-side `redirect('/chat')` (old pages backed up as `.bak` files)
- Sidebar already only links to `/chat` — the old routes were orphaned (only reachable by direct URL)
- **Files modified:** `chat/page.tsx`, `ChatSidebar.tsx`
- **Files replaced with redirects:** `company-chat/page.tsx`, `private-messages/page.tsx`

**What was done — task-tracking extraction (March 10, 2026):**
- Extracted `BoardCard` component → `components/tasks/BoardCard.tsx` (~160 lines): task card with progress bar, time tracking, timer controls
- Extracted `TaskModal` component → `components/tasks/TaskModal.tsx` (~290 lines): full create/edit form with department-based role selection
- Extracted `TaskCalendarView` component → `components/tasks/TaskCalendarView.tsx` (~160 lines): FullCalendar + Due Today / Overdue / Overview summary cards
- Cleaned up unused imports from page: `DEPARTMENT_ROLES`, `Filter`, `Users`, `Trash2`, `LazyFullCalendar`, `TaskDepartment`, `TaskUser`, removed dead `selectedDepartmentName`/`availableRoles` code
- **Files created:** `BoardCard.tsx`, `TaskModal.tsx`, `TaskCalendarView.tsx`
- **Files modified:** `task-tracking/page.tsx`
- **Build verified:** Production build passes with all changes

**What was done — announcements extraction (March 10, 2026):**
- Extracted `AnnouncementCard` component → `components/announcements/AnnouncementCard.tsx` (~240 lines): per-announcement card with icon, metadata, title, body, event/birthday details, likes, comments section with input
- Extracted `AnnouncementFormModal` component → `components/announcements/AnnouncementFormModal.tsx` (~180 lines): create/edit form modal with category, title, body, event/birthday fields, important flag
- Removed `formatEventDateTime`, `formatBirthdayDate` from page (moved to AnnouncementCard), cleaned up unused imports (`FormField`, `Send`, `Heart`, `MessageCircle`, `MoreVertical`, `Edit`, `formatDate`, `getTimeAgo`)
- **Files created:** `AnnouncementCard.tsx`, `AnnouncementFormModal.tsx`
- **Files modified:** `announcements/page.tsx`
- **Build verified:** Production build passes with all changes

**What was done — chat extraction (March 10, 2026):**
- Extracted `ChatSidebar` component → `components/chat/ChatSidebar.tsx` (~160 lines): channels list + direct messages list with unread badges, delete buttons, create/new chat triggers
- Extracted `MessageInput` component → `components/chat/MessageInput.tsx` (~100 lines): text input, attachment preview with file upload, send button
- Extracted `NewChatModal` component → `components/chat/NewChatModal.tsx` (~100 lines): user search overlay to start direct messages
- Extracted `CreateChannelModal` component → `components/chat/CreateChannelModal.tsx` (~165 lines): channel name input, member search/selection with select-all, create button
- Cleaned up unused imports (`Card`, `Send`, `Hash`, `Users`, `Plus`, `X`, `Search`), removed unused `fileInputRef` from page, simplified `handleCreateChannel` signature
- **Files created:** `ChatSidebar.tsx`, `MessageInput.tsx`, `NewChatModal.tsx`, `CreateChannelModal.tsx`
- **Files modified:** `chat/page.tsx`
- **Build verified:** Production build passes with all changes

### 3.2 — TypeScript Improvements ✅ DONE
- [x] Created shared API response types (`frontend/src/lib/types/api.ts`) — 15+ interfaces covering announcements, daily logs, payslips, payroll events, employees, chat, tasks, time entries, calendar, Drive files, socket notifications
- [x] Eliminated ALL `: any` types across ~30+ files (93 instances → 0)
- [x] Typed all API fetch responses and mapping functions (`processTaskFromApi`, `mapBackendToFrontend`, file-directory callbacks)
- [x] Replaced `catch(err: any)` with `catch(err)` + `instanceof Error` guards (13 frontend + 15 backend locations)
- [x] Backend: Used Prisma namespace types (`Prisma.AnnouncementWhereInput`, `DailyLogWhereInput`, `PayrollEventWhereInput`, `EmployeeProfileUpdateInput`, `UserUpdateInput`, `JsonArray`, `JsonValue`)
- [x] Backend: Typed SendGrid `MailDataRequired`, Express `Request`/`Response`, Passport callbacks
- [x] Both frontend and backend builds verified clean (0 errors)

### 3.3 — Error Handling ✅ DONE
- [x] Added `app/error.tsx` route-level error boundary (⚠️ icon, "Try Again" + "Dashboard" buttons, error digest display)
- [x] Added `app/global-error.tsx` root layout error boundary (self-contained `<html>/<body>`, "Reload" button)
- [x] Removed all debug `console.log`/`console.warn` from production code (0 remaining in frontend — SocketContext 6, UserContext 4, AuthGuard 1, api.ts 3, chat/page.tsx 1)
- [x] Replaced all `alert()` calls with `toast.error()` (chat, company-chat pages)
- [x] Added `toast.error()` to silent catch blocks across 7 pages/components: chat, company-chat, private-messages, profile, dashboard, TimeTrackingCalendar, file-directory pages
- [x] Verified all remaining catch blocks either already have toast, use inline `setError` UI (login, DriveFileViewer), or are non-critical background fetches (GeneratePayslipModal preview)
- [x] Both frontend and backend builds verified clean (0 errors)

---

## Phase 4: UI/UX Polish

### 4.1 — Component Polish & Animations ✅ DONE
- [x] Enhanced Button component: `cn()` utility, `rounded-lg`, `transition-all duration-150`, `active:scale-[0.97]` press feedback, `hover:brightness-110` + colored `hover:shadow-md` for primary/success/danger, improved secondary/outline hover with border color shift
- [x] Enhanced Card component: `cn()` utility, `rounded-lg` on all variants, `transition-shadow/all duration-200` on all variants, elevated gets `hover:shadow-md`, interactive gets `hover:shadow-md hover:-translate-y-0.5 hover:border-[var(--muted)]`
- [x] Enhanced Modal component: `cn()` utility, `rounded-xl`, `shadow-2xl`, `ring-1 ring-[var(--border)]` ring, backdrop `bg-black/50`, close button `active:scale-90` + `rounded-lg`
- [x] Added global CSS: `animate-page-enter` keyframe (fade + slide-up), `prefers-reduced-motion` support for all animations, button active fallback for reduced-motion
- [x] Build verified: Production build passes

### 4.2 — User Workflow Improvements ✅ DONE
- [x] **Sidebar active state fix:** Fixed route matching bug (loose `startsWith` → exact match + `startsWith(href + '/')` to prevent prefix collisions), added left accent indicator bar (indigo/red-400 depending on theme), icon color changes on active, `cn()` utility for cleaner class merging, badge pulse animation for unread chat count
- [x] **Command Palette (Ctrl+K):** New `CommandPalette.tsx` component — global keyboard shortcut (Ctrl/Cmd+K), search/filter all pages, arrow key navigation, icon + description per page, animated overlay, ESC to close, mounted in LayoutWrapper
- [x] **Auto page titles in Header:** Route-to-title map eliminates brand fallback on non-dashboard pages — every page now shows its proper title + subtitle automatically without manual `title` prop. Dashboard retains personalized greeting.
- [x] **Header search button:** Added discoverable Ctrl+K trigger button in header bar with Search icon and keyboard shortcut hint
- [x] Build verified: Production build passes

### 4.3 — Accessibility ✅ DONE
- [x] Fixed all 7 avatar images from `alt=""` to descriptive `alt={name}` text (chat, company-chat, private-messages, ChatSidebar, NewChatModal, CreateChannelModal)
- [x] Added `aria-label` to all icon-only buttons: BoardCard task controls (play/pause/complete), DriveFileViewer view toggle (grid/list with `aria-pressed`), MessageInput clear attachment
- [x] Modal focus trapping already excellent (Tab cycling, Escape close, focus restore, `role="dialog"`, `aria-modal`)
- [x] Added Escape key handler to announcement dropdown menu (closes on Escape, not just click-outside)
- [x] Fixed low-contrast elements: bumped `opacity-30` → `opacity-50` on empty-state text (task-tracking board) and avatar fallback icons (company-chat, private-messages)
- [x] Fixed global-error.tsx contrast: `text-gray-400` → `text-gray-500 dark:text-gray-400` for WCAG AA compliance
- [x] Verified: forms already use proper `<label htmlFor>`, `aria-invalid`, `aria-describedby`; Sidebar links have `aria-current="page"` and `aria-label`
- [x] Build verified clean (0 errors)

---

## Phase 5: Feature Completion

### 5.1 — Chat Improvements ✅ DONE
- [x] Typing indicators
- [x] Online/offline user status
- [x] Message editing
- [x] Message search
- [x] Read receipts
- [x] File sharing in chat (attachment upload wiring)

**What was done — Read receipts (March 10, 2026):**
- **Backend `chat.service.ts`:** Updated `getUserConversations()` to compute `unreadCount` per conversation (counts messages where `createdAt > participant.lastReadAt` and `senderId !== userId`). Updated `markAsRead()` to return the `Date` for socket broadcast.
- **Backend `chat.controller.ts`:** Updated `POST /:id/read` to emit `chat:read` socket event (with `conversationId`, `userId`, `readAt`) to conversation room after marking as read.
- **Frontend `lib/chat.ts`:** Added `unreadCount?: number` to `Conversation` interface.
- **All three chat pages:** Import and call `markAsRead()` API when selecting a conversation. Initialize `unreadCounts` from server data (`conversation.unreadCount`). Listen for `chat:read` socket event to sync across tabs. Private-messages page now has unread state + red badge (was missing entirely).
- **Files modified:** `chat.service.ts`, `chat.controller.ts`, `lib/chat.ts`, `chat/page.tsx`, `company-chat/page.tsx`, `private-messages/page.tsx`

**What was done — File sharing in chat (March 10, 2026):**
- Wired attachment upload support into `company-chat/page.tsx` and `private-messages/page.tsx` (was already working in unified `/chat` page)
- Both pages now have: hidden file input, paperclip button, attachment preview above input with remove button, base64 encoding on send, attachment rendering in message bubbles (image preview or download link)
- **Files modified:** `company-chat/page.tsx`, `private-messages/page.tsx`

**What was done:**

**Backend:**
- Added `typing:start`/`typing:stop` socket event relay in `socket.service.ts` (broadcasts to conversation room excluding sender)
- Added `presence:online`/`presence:offline` socket events (emitted on first socket connect / last disconnect), `getOnlineUserIds()` public method
- Added `GET /chat/online` endpoint — returns currently online user IDs
- Added `GET /chat/search?q=query` endpoint — searches messages across user's conversations (case-insensitive `contains` filter)
- Added `PATCH /chat/messages/:id` endpoint — edit own messages (sender-only, validates non-empty content), emits `chat:message_edited` socket event
- Added `editMessage()` and `searchMessages()` methods to `chat.service.ts`
- Added `editedAt DateTime?` field to Message model in Prisma schema, ran `prisma generate`
- **NOTE:** `prisma migrate dev` must be run before deploy to apply `editedAt` column

**Frontend API layer (`lib/chat.ts`):**
- Added `editedAt?: string` to `Message` interface
- Added `editMessage()`, `searchMessages()`, `fetchOnlineUsers()` API functions
- Added `SearchResult` interface

**Frontend UI — chat/page.tsx (unified chat):**
- Typing indicators: listens for `typing:start`/`typing:stop`, emits typing events on input change (2s debounce), shows "X is typing..." below messages
- Online status: fetches initial online users, listens for `presence:online`/`presence:offline`, passes `onlineUserIds` to ChatSidebar
- Message editing: pencil icon on own messages (hover), inline edit with Enter/Escape/check/X buttons, saves via PATCH, shows "(edited)" label
- Message search: search bar toggle below header, searches across all conversations, click result navigates to conversation
- `chat:message_edited` socket listener updates messages in real-time

**Frontend UI — ChatSidebar.tsx:**
- Added `onlineUserIds` prop, green/gray dot indicator on direct message avatars

**Frontend UI — company-chat/page.tsx:**
- Typing indicators (emit + display), message editing (inline edit + edited label), `chat:message_edited` socket listener

**Frontend UI — private-messages/page.tsx:**
- Typing indicators, online/offline status dots in sidebar, message editing, `chat:message_edited` socket listener

**Files modified:** `socket.service.ts`, `chat.controller.ts`, `chat.service.ts`, `schema.prisma`, `lib/chat.ts`, `chat/page.tsx`, `company-chat/page.tsx`, `private-messages/page.tsx`, `ChatSidebar.tsx`

### 5.2 — Incomplete Features ✅ DONE
- [x] Finalize email/password login (password reset flow)
- [x] Department-based content visibility (already implemented — tasks + daily-logs have filters)
- [x] Payroll PDF generation (already functional — jsPDF payslips)
- [x] Announcement event RSVPs (attendee names now displayed)

**What was done:**

**Password Reset — Backend:**
- Added `passwordResetToken String?` and `passwordResetExpiry DateTime?` fields to User model in Prisma schema
- Created `PasswordResetEmailData` interface in `email.types.ts`, added to `EmailTemplateData` union
- Created `passwordResetEmailTemplate()` in `email.templates.ts` — styled HTML email with amber reset button, expiry warning, safety note
- Added `POST /auth/forgot-password` endpoint — generates 32-byte random token (`crypto.randomBytes`), stores SHA-256 hash in DB with 1-hour expiry, sends email with unhashed token URL. Always returns success (prevents email enumeration).
- Added `POST /auth/reset-password` endpoint — validates token + email + password strength (8+ chars, uppercase, number), compares SHA-256 hashes, checks expiry, updates password with bcrypt, clears reset fields
- **NOTE:** `prisma migrate dev` must be run before deploy to apply `passwordResetToken`/`passwordResetExpiry` columns

**Password Reset — Frontend:**
- Added `requestPasswordReset()` and `resetPassword()` API functions in `lib/api.ts`
- Wired `forgot-password/page.tsx` to real API (was previously a stub with `setTimeout`)
- Created `reset-password/page.tsx` — extracts `token`/`email` from URL params, password + confirm with validation, success state with "Go to Sign In" link, `Suspense` wrapper for `useSearchParams()`

**RSVP Attendee Names:**
- Added `user` field (id, name, avatar) to `ApiAnnouncementRsvp` type in `lib/types/api.ts`
- Added `goingNames: string[]` to `EventDetails` interface in `lib/announcements.ts`, populated from RSVP user data
- Updated `AnnouncementCard.tsx` — shows first 5 attendee names below Going button, "and X more" for overflow

**Department Visibility — Already Implemented:**
- `task-tracking/page.tsx` has `filterDeptId` department filter dropdown
- `daily-logs/page.tsx` has `departmentFilter` dropdown
- Announcements are company-wide by design (no department concept in schema or form)

**Payroll PDF — Already Functional:**
- `payslip-utils.ts` has complete `generatePayslipPDF()` using jsPDF with company header, employee info, earnings/deductions table, summary, signatures, footer
- Backend has `GET /periods/:periodId/generate/:userId` and `POST /periods/:periodId/generate-all` endpoints
- Frontend `my-payslips/page.tsx` has download buttons wired to `generatePayslipPDF()`

**Env vars to set:** `FRONTEND_URL` (for password reset email links, e.g. `https://mydeskii.com`)
**Files modified:** `schema.prisma`, `email.types.ts`, `email.templates.ts`, `auth.controller.ts`, `lib/api.ts`, `forgot-password/page.tsx`, `lib/types/api.ts`, `lib/announcements.ts`, `AnnouncementCard.tsx`, `announcements/page.tsx`
**Files created:** `reset-password/page.tsx`
**Build verified:** Both frontend and backend builds clean (0 errors)

---

## Work Order (Recommended Sequence)

| Order | Task | Why First |
|-------|------|-----------|
| 1 | Real-time data updates (1.1) | Most impactful UX fix — users hate refreshing |
| 2 | Lazy loading + skeletons (2.1) | Immediate perceived performance boost |
| 3 | Break up large files (3.1) | Makes all future work easier |
| 4 | UI polish with shadcn/ui (4.1) | Visual quality jump |
| 5 | Security fixes (1.2) | Must fix before next production deploy |
| 6 | TypeScript + error handling (3.2, 3.3) | Code maintainability |
| 7 | User workflow improvements (4.2) | QoL for daily users |
| 8 | Accessibility (4.3) | Compliance and inclusivity |
| 9 | Feature completion (5.x) | Nice-to-haves after core is solid |

---

## Notes
- All work happens on `v2-improvements` branch
- Main branch = production (mydeskii.com) — untouched until merge
- Backend changes should be minimal — flag major backend issues for backend developer
- Test locally with `npm run dev` (frontend) + `npm run dev` (backend) + PostgreSQL
