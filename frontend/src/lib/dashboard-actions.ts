import { DASHBOARD_DEEP_LINKS } from './dashboard-deep-links';
import {
  hasClientOperationsAccess,
  hasManagementAccess,
  hasPayrollManagementAccess,
  type RoleAccessUser,
} from './role-access';

export type DashboardActionId =
  | 'createTask'
  | 'addDailyLog'
  | 'myTime'
  | 'reviewPayroll'
  | 'approvals'
  | 'announcements'
  | 'taskCalendar'
  | 'clientOperations'
  | 'clientRequests';

export interface DashboardActionDefinition {
  id: DashboardActionId;
  label: string;
  helper: string;
  href: string;
  icon: 'clipboard' | 'file' | 'calendar' | 'userCheck' | 'megaphone' | 'grid' | 'briefcase' | 'ticket';
  access: 'internal' | 'management' | 'payroll' | 'client-operations';
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DASHBOARD_ACTION_LIMIT = 4;

export const DASHBOARD_ACTIONS: DashboardActionDefinition[] = [
  {
    id: 'createTask',
    label: 'Create Task',
    helper: 'Open task tracking',
    href: DASHBOARD_DEEP_LINKS.createTask,
    icon: 'clipboard',
    access: 'internal',
  },
  {
    id: 'addDailyLog',
    label: 'Add Daily Log',
    helper: "Record today's work",
    href: DASHBOARD_DEEP_LINKS.addDailyLog,
    icon: 'file',
    access: 'internal',
  },
  {
    id: 'myTime',
    label: 'My Time',
    helper: 'Review your entries',
    href: DASHBOARD_DEEP_LINKS.reviewPayroll,
    icon: 'calendar',
    access: 'internal',
  },
  {
    id: 'reviewPayroll',
    label: 'Review Payroll',
    helper: 'Audit team time',
    href: DASHBOARD_DEEP_LINKS.reviewPayroll,
    icon: 'calendar',
    access: 'payroll',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    helper: 'Review pending employees',
    href: DASHBOARD_DEEP_LINKS.approvals,
    icon: 'userCheck',
    access: 'management',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    helper: 'Read company updates',
    href: DASHBOARD_DEEP_LINKS.announcements,
    icon: 'megaphone',
    access: 'internal',
  },
  {
    id: 'taskCalendar',
    label: 'Task Calendar',
    helper: 'Check due dates',
    href: '/task-calendar',
    icon: 'grid',
    access: 'internal',
  },
  {
    id: 'clientOperations',
    label: 'Client Operations',
    helper: 'Manage client work',
    href: '/operations/clients',
    icon: 'briefcase',
    access: 'client-operations',
  },
  {
    id: 'clientRequests',
    label: 'Client Requests',
    helper: 'Review client tickets',
    href: '/operations/clients/requests',
    icon: 'ticket',
    access: 'client-operations',
  },
];

const ACTION_BY_ID = new Map(DASHBOARD_ACTIONS.map((action) => [action.id, action]));

export function canUseDashboardAction(action: DashboardActionDefinition, user?: RoleAccessUser | null): boolean {
  if (action.access === 'internal') return true;
  if (action.access === 'management') return hasManagementAccess(user);
  if (action.access === 'payroll') return hasPayrollManagementAccess(user);
  if (action.access === 'client-operations') return hasClientOperationsAccess(user);
  return false;
}

export function getAvailableDashboardActions(user?: RoleAccessUser | null): DashboardActionDefinition[] {
  return DASHBOARD_ACTIONS.filter((action) => canUseDashboardAction(action, user));
}

export function getDefaultDashboardActionIds(user?: RoleAccessUser | null): DashboardActionId[] {
  if (hasClientOperationsAccess(user)) {
    const clientOpsDefaults: DashboardActionId[] = ['clientOperations'];

    if (hasManagementAccess(user)) {
      clientOpsDefaults.push('approvals');
    }

    if (hasPayrollManagementAccess(user)) {
      clientOpsDefaults.push('reviewPayroll');
    }

    clientOpsDefaults.push('createTask', 'addDailyLog', 'myTime', 'announcements');

    return clientOpsDefaults.slice(0, DASHBOARD_ACTION_LIMIT);
  }

  if (hasPayrollManagementAccess(user)) {
    return ['reviewPayroll', 'myTime', 'createTask', 'addDailyLog'];
  }

  if (hasManagementAccess(user)) {
    return ['createTask', 'addDailyLog', 'approvals', 'myTime'];
  }

  return ['createTask', 'addDailyLog', 'myTime', 'announcements'];
}

export function resolveDashboardActions(
  preferredIds: unknown,
  user?: RoleAccessUser | null,
  limit = DASHBOARD_ACTION_LIMIT,
): DashboardActionDefinition[] {
  const availableIds = new Set(getAvailableDashboardActions(user).map((action) => action.id));
  const normalizedPreferredIds = Array.isArray(preferredIds) ? preferredIds : [];
  const resolvedIds: DashboardActionId[] = [];

  for (const id of normalizedPreferredIds) {
    if (typeof id !== 'string') continue;
    const typedId = id as DashboardActionId;
    if (!availableIds.has(typedId) || resolvedIds.includes(typedId)) continue;
    resolvedIds.push(typedId);
    if (resolvedIds.length >= limit) break;
  }

  for (const id of getDefaultDashboardActionIds(user)) {
    if (!availableIds.has(id) || resolvedIds.includes(id)) continue;
    resolvedIds.push(id);
    if (resolvedIds.length >= limit) break;
  }

  for (const action of getAvailableDashboardActions(user)) {
    if (resolvedIds.includes(action.id)) continue;
    resolvedIds.push(action.id);
    if (resolvedIds.length >= limit) break;
  }

  return resolvedIds
    .slice(0, limit)
    .map((id) => ACTION_BY_ID.get(id))
    .filter((action): action is DashboardActionDefinition => Boolean(action));
}

export function getDashboardActionsStorageKey(userId?: string | number | null): string {
  return `dashboard_quick_actions:${String(userId || 'anonymous')}`;
}

export function readStoredDashboardActionIds(
  userId?: string | number | null,
  storage: StorageLike | null | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): DashboardActionId[] | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(getDashboardActionsStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')
      ? parsed as DashboardActionId[]
      : null;
  } catch {
    return null;
  }
}

export function writeStoredDashboardActionIds(
  userId: string | number | null | undefined,
  ids: DashboardActionId[],
  storage: StorageLike | null | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): void {
  if (!storage) return;

  storage.setItem(getDashboardActionsStorageKey(userId), JSON.stringify(ids));
}

export function clearStoredDashboardActionIds(
  userId?: string | number | null,
  storage: StorageLike | null | undefined = typeof window !== 'undefined' ? window.localStorage : undefined,
): void {
  storage?.removeItem(getDashboardActionsStorageKey(userId));
}
