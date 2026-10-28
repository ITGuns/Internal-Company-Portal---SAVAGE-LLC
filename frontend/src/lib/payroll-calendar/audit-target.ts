import { formatPayrollDate, manilaDayBounds, manilaDayKey, manilaTodayKey } from "../payroll-dates";

interface GetPayrollAuditTargetParams {
  searchParams: URLSearchParams;
  currentUserId?: string;
  hasManagementAccess: boolean;
}

interface PayrollAuditUser {
  id: string | number;
  name?: string | null;
  email?: string | null;
}

export interface PayrollAuditDateRange {
  startDate: string;
  endDate: string;
}

interface PayrollAuditSummaryParams extends PayrollAuditDateRange {
  selectedUser?: PayrollAuditUser | null;
}

/** A real YYYY-MM-DD day (a ?start=2026-02-30 link is ignored instead of breaking the labels). */
function isDateInput(value?: string | null): value is string {
  return Boolean(value) && manilaDayKey(value) === value;
}

function getPayrollAuditUserLabel(user?: PayrollAuditUser | null): string {
  return user?.name || user?.email || "my time entries";
}

export function getPayrollAuditTarget({
  searchParams,
  currentUserId,
  hasManagementAccess,
}: GetPayrollAuditTargetParams) {
  const requestedUserId = searchParams.get("userId")?.trim() || undefined;
  const targetUserId = hasManagementAccess ? requestedUserId : undefined;

  return {
    targetUserId,
    isOwnView: !targetUserId || Boolean(currentUserId && targetUserId === currentUserId),
  };
}

export function filterPayrollAuditUsers(
  users: PayrollAuditUser[],
  query: string,
): PayrollAuditUser[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return users;

  return users.filter((user) => {
    const searchable = `${user.name || ""} ${user.email || ""}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

export function getVisiblePayrollAuditUsers(
  users: PayrollAuditUser[],
  query: string,
  selectedUserId?: string,
): PayrollAuditUser[] {
  const filteredUsers = filterPayrollAuditUsers(users, query);
  if (!selectedUserId || filteredUsers.some((user) => String(user.id) === selectedUserId)) {
    return filteredUsers;
  }

  const selectedUser = users.find((user) => String(user.id) === selectedUserId);
  return selectedUser ? filteredUsers.slice(0, 0).concat(selectedUser, filteredUsers) : filteredUsers;
}

export function getPayrollAuditDateRange(searchParams: URLSearchParams): PayrollAuditDateRange {
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  return {
    startDate: isDateInput(startDate) ? startDate : "",
    endDate: isDateInput(endDate) ? endDate : "",
  };
}

/** Whole Manila days: from the first millisecond of the start day to the last of the end day. */
export function getPayrollTimeEntryRange(range: PayrollAuditDateRange): {
  startIso?: string;
  endIso?: string;
} {
  return {
    startIso: range.startDate ? manilaDayBounds(range.startDate)?.startIso : undefined,
    endIso: range.endDate ? manilaDayBounds(range.endDate)?.endIso : undefined,
  };
}

export function getPayrollAuditTodayDateInput(now = new Date()): string {
  return manilaTodayKey(now);
}

export function formatPayrollAuditDateLabel(dateInput: string): string {
  if (!isDateInput(dateInput)) return "";
  return formatPayrollDate(dateInput, {}, "");
}

export function getPayrollAuditSummary({
  selectedUser,
  startDate,
  endDate,
}: PayrollAuditSummaryParams): string {
  const targetLabel = getPayrollAuditUserLabel(selectedUser);
  const startLabel = formatPayrollAuditDateLabel(startDate);
  const endLabel = formatPayrollAuditDateLabel(endDate);

  if (startLabel && endLabel) {
    return `Auditing ${targetLabel} from ${startLabel} to ${endLabel}`;
  }
  if (startLabel) {
    return `Auditing ${targetLabel} from ${startLabel}`;
  }
  if (endLabel) {
    return `Auditing ${targetLabel} through ${endLabel}`;
  }
  return `Auditing ${targetLabel} across all dates`;
}
