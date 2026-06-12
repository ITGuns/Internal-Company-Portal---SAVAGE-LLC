/**
 * Raw API response types — mirrors what the backend actually returns.
 * Used to type the "raw" data before mapping to frontend domain types.
 */

// ── Announcements ────────────────────────────────────────────────────────────

export interface ApiAnnouncementAuthor {
  id: string;
  name: string | null;
}

export interface ApiAnnouncementLike {
  userId: string;
}

export interface ApiAnnouncementComment {
  id: string;
  text: string;
  createdAt: string;
  author?: ApiAnnouncementAuthor;
}

export interface ApiAnnouncementRsvp {
  userId: string;
  status: string;
  user?: { id: string; name: string | null; avatar: string | null };
}

export interface ApiAnnouncement {
  id: string;
  category: string;
  title: string;
  content: string;
  isImportant: boolean;
  priority?: string;
  eventDate?: string;
  eventLocation?: string;
  birthdayDate?: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author?: ApiAnnouncementAuthor;
  likes?: ApiAnnouncementLike[];
  comments?: ApiAnnouncementComment[];
  rsvps?: ApiAnnouncementRsvp[];
}

// ── Daily Logs ───────────────────────────────────────────────────────────────

export interface ApiDailyLogLike {
  userId?: string;
  user?: { id: string };
}

export interface ApiDailyLogComment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  authorId: string;
  author?: { id: string; name: string | null; email?: string; avatar?: string | null };
}

export interface ApiDailyLog {
  id: string;
  content: string;
  department: string;
  date: string;
  status: string;
  hoursLogged: number;
  tasks: unknown; // JSON field — caller should cast to LogTask[]
  shiftNotes: string;
  logType?: string;
  createdAt: string;
  authorId: string;
  author?: { name: string | null };
  likes?: ApiDailyLogLike[];
  comments?: ApiDailyLogComment[];
}

// ── Payroll ──────────────────────────────────────────────────────────────────

export interface ApiPayslipItem {
  id: string;
  description: string;
  amount: number;
  type?: string;
}

export interface ApiPayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: string;
}

export interface ApiPayslip {
  id: string;
  userId: string;
  grossPay: number;
  netPay: number;
  status: string;
  notes?: string;
  generatedAt?: string;
  period: ApiPayrollPeriod;
  items: ApiPayslipItem[];
  user?: { name: string | null };
}

export interface ApiPayrollEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  description?: string;
  isBuiltIn?: boolean;
}

// ── Employees ────────────────────────────────────────────────────────────────

export interface ApiEmployeeProfile {
  baseSalary?: number;
  jobTitle?: string;
  department?: { name: string };
  payrollScheme?: string;
  maxBillableHoursPerDay?: number;
}

export interface ApiEmployee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  citizenship?: string;
  birthday?: string;
  status?: string;
  appliedDate?: string;
  salary?: number;
  hoursThisWeek?: number;
  performance?: number | null;
  department?: string;
  role?: string;
  payrollScheme?: string;
  maxBillableHoursPerDay?: number;
  employeeProfile?: ApiEmployeeProfile;
}

// ── Chat / Socket ────────────────────────────────────────────────────────────

export interface ApiChatMessage {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender?: { id: string; name: string | null; avatar: string | null };
}

export interface SocketNotificationPayload {
  id?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  link?: string;
  createdAt?: string;
}

// ── Tasks (raw from API) ─────────────────────────────────────────────────────

export interface ApiTaskWorkSession {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  createdAt?: string;
  user?: { id: string; name: string | null; email: string; avatar: string | null };
}

export interface ApiTaskProject {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  color?: string | null;
  departmentId?: string | null;
  ownerId?: string | null;
  createdById?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  department?: { id: string; name: string } | null;
  owner?: { id: string; name: string | null; email: string; avatar: string | null } | null;
  creator?: { id: string; name: string | null; email: string; avatar: string | null } | null;
  _count?: { tasks?: number };
}

export interface ApiTaskCollaborator {
  id: string;
  taskId: string;
  userId: string;
  invitedById?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  user?: { id: number | string; name: string | null; email: string; avatar: string | null };
  invitedBy?: { id: number | string; name: string | null; email: string; avatar: string | null } | null;
}

export interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  startDate?: string;
  notes?: unknown;
  departmentId?: string;
  department?: { id: string; name: string; availableRoles?: Array<{ id: string; name: string; departmentId?: string | null }> };
  projectId?: string | null;
  project?: ApiTaskProject | null;
  assigneeId?: number | string;
  assignee?: { id: number | string; name: string | null; email: string; avatar: string | null };
  createdById?: number | string;
  creator?: { id: number | string; name: string | null; email: string; avatar: string | null };
  collaborators?: ApiTaskCollaborator[];
  role?: string;
  progress?: number;
  timerStatus?: string;
  timerStart?: string;
  totalElapsed?: number;
  estimatedTime?: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  workSessions?: ApiTaskWorkSession[];
  [key: string]: unknown;
}

// ── Time Entries (raw from API) ──────────────────────────────────────────────

export interface ApiTimeEntry {
  id: string;
  userId?: string;
  start: string;
  end?: string;
  duration?: number;
  notes?: string;
}

// ── Calendar helpers ─────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps?: Record<string, unknown>;
  color?: string;
}

export interface DayTask {
  id: string;
  title: string;
  completedDate?: string;
  category: string;
}
