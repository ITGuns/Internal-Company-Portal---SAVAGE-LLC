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

const auditDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function isDateInput(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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

export function getPayrollTimeEntryRange(range: PayrollAuditDateRange): {
  startIso?: string;
  endIso?: string;
} {
  return {
    startIso: range.startDate ? new Date(`${range.startDate}T00:00:00.000Z`).toISOString() : undefined,
    endIso: range.endDate ? new Date(`${range.endDate}T23:59:59.999Z`).toISOString() : undefined,
  };
}

export function getPayrollAuditTodayDateInput(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function formatPayrollAuditDateLabel(dateInput: string): string {
  if (!isDateInput(dateInput)) return "";
  return auditDateFormatter.format(new Date(`${dateInput}T00:00:00.000Z`));
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
