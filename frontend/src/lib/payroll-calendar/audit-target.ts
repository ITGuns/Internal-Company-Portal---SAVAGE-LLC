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

function isDateInput(value?: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
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
