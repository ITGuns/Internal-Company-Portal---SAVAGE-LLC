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
  performance?: number;
  department?: string;
  role?: string;
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

// ── Google Drive ─────────────────────────────────────────────────────────────

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

// ── Tasks (raw from API) ─────────────────────────────────────────────────────

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
  department?: { id: string; name: string };
  assigneeId?: number;
  assignee?: { id: number | string; name: string | null; email: string; avatar: string | null };
  role?: string;
  progress?: number;
  timerStatus?: string;
  timerStart?: string;
  totalElapsed?: number;
  estimatedTime?: number;
  [key: string]: unknown;
}

// ── Time Entries (raw from API) ──────────────────────────────────────────────

export interface ApiTimeEntry {
  id: string;
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
