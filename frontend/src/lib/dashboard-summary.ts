import { getEntryDurationMinutes, getPayrollDayAudit } from './payroll-calendar/day-audit';
import { DASHBOARD_DEEP_LINKS } from './dashboard-deep-links';

export interface DashboardRoleUser {
  id?: string | number | null;
  role?: string | null;
  roles?: Array<string | { role?: string | null }> | null;
}

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
}

export interface DashboardTimeEntry {
  id: string;
  start: string;
  end?: string;
  durationMin?: number;
  notes?: string;
}

export interface DashboardDailyLog {
  id: string;
  authorId?: string | number | null;
  date: string;
  logType?: string;
}

export type DashboardAttentionSeverity = 'danger' | 'warning' | 'info';

export interface DashboardAttentionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  count?: number;
  severity: DashboardAttentionSeverity;
}

export interface DashboardSummaryMetrics {
  todayMinutes: number;
  assignedTasks: number;
  inProgressTasks: number;
  completedToday: number;
  overdueTasks: number;
  pendingDailyLog: boolean;
  payrollWarningCount: number;
  pendingApprovals: number;
  activeClockIn: boolean;
}

export interface DashboardSummary {
  metrics: DashboardSummaryMetrics;
  attentionItems: DashboardAttentionItem[];
}

interface BuildDashboardSummaryParams {
  userId?: string | number | null;
  todayDate: string;
  now?: string | Date;
  tasks: DashboardTask[];
  timeEntries: DashboardTimeEntry[];
  dailyLogs: DashboardDailyLog[];
  pendingApprovals: number;
  isManagement: boolean;
}

const MANAGEMENT_ROLES = new Set([
  'admin',
  'administrator',
  'owner',
  'founder',
  'owner_founder',
  'owners_founders',
  'overlord',
  'manager',
  'project_manager',
  'operations_manager',
  'chief_operations_officer',
]);

export function normalizeDashboardRole(role: string): string {
  return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function hasDashboardManagementAccess(user: DashboardRoleUser | null | undefined): boolean {
  if (!user) return false;

  const roles = [
    user.role,
    ...(user.roles || []).map((role) => (typeof role === 'string' ? role : role.role)),
  ].filter((role): role is string => Boolean(role));

  return roles.some((role) => MANAGEMENT_ROLES.has(normalizeDashboardRole(role)));
}

function getLocalDateOnly(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isIncompleteTask(task: DashboardTask): boolean {
  return task.status !== 'completed';
}

export function buildDashboardSummary({
  userId,
  todayDate,
  now,
  tasks,
  timeEntries,
  dailyLogs,
  pendingApprovals,
  isManagement,
}: BuildDashboardSummaryParams): DashboardSummary {
  const currentDate = now ? new Date(now) : new Date();
  const todayAudit = getPayrollDayAudit(timeEntries, {
    date: todayDate,
    now: currentDate,
  });
  const todayMinutes = todayAudit.entries.reduce(
    (sum, entry) => sum + getEntryDurationMinutes(entry, currentDate),
    0,
  );
  const completedToday = tasks.filter(
    (task) => task.status === 'completed' && getLocalDateOnly(task.completedAt) === todayDate,
  ).length;
  const overdueTasks = tasks.filter(
    (task) => isIncompleteTask(task) && Boolean(task.dueDate) && String(task.dueDate) < todayDate,
  ).length;
  const pendingDailyLog = !dailyLogs.some((log) => {
    const sameAuthor = !userId || !log.authorId || String(log.authorId) === String(userId);
    return sameAuthor && getLocalDateOnly(log.date) === todayDate && (log.logType || 'daily') === 'daily';
  });

  const metrics: DashboardSummaryMetrics = {
    todayMinutes,
    assignedTasks: tasks.length,
    inProgressTasks: tasks.filter((task) => task.status === 'in_progress').length,
    completedToday,
    overdueTasks,
    pendingDailyLog,
    payrollWarningCount: todayAudit.warnings.length,
    pendingApprovals: isManagement ? pendingApprovals : 0,
    activeClockIn: todayAudit.hasActiveEntry,
  };

  const attentionItems: DashboardAttentionItem[] = [];

  if (isManagement && pendingApprovals > 0) {
    attentionItems.push({
      id: 'pending-approvals',
      title: 'Employee approvals waiting',
      description: `${pendingApprovals} pending employee ${pendingApprovals === 1 ? 'application needs' : 'applications need'} review.`,
      href: DASHBOARD_DEEP_LINKS.approvals,
      count: pendingApprovals,
      severity: 'warning',
    });
  }

  if (metrics.payrollWarningCount > 0) {
    attentionItems.push({
      id: 'payroll-review',
      title: 'Payroll day needs review',
      description: `${metrics.payrollWarningCount} time-entry ${metrics.payrollWarningCount === 1 ? 'warning was' : 'warnings were'} found for today.`,
      href: DASHBOARD_DEEP_LINKS.reviewPayroll,
      count: metrics.payrollWarningCount,
      severity: 'warning',
    });
  }

  if (overdueTasks > 0) {
    attentionItems.push({
      id: 'overdue-tasks',
      title: 'Overdue tasks',
      description: `${overdueTasks} assigned ${overdueTasks === 1 ? 'task is' : 'tasks are'} past due.`,
      href: DASHBOARD_DEEP_LINKS.overdueTasks,
      count: overdueTasks,
      severity: 'danger',
    });
  }

  if (pendingDailyLog) {
    attentionItems.push({
      id: 'missing-daily-log',
      title: 'Daily log not submitted',
      description: 'Add today\'s work summary before end of shift.',
      href: DASHBOARD_DEEP_LINKS.addDailyLog,
      severity: 'info',
    });
  }

  if (!metrics.activeClockIn && todayMinutes === 0) {
    attentionItems.push({
      id: 'clock-in-reminder',
      title: 'No tracked time today',
      description: 'Clock in or add a manual entry before payroll review.',
      href: DASHBOARD_DEEP_LINKS.reviewPayroll,
      severity: 'info',
    });
  }

  return {
    metrics,
    attentionItems,
  };
}
