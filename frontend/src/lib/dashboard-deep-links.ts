import type { PayrollTab } from "@/lib/payroll-calendar/types";

export type EmployeeOverviewView = "deployed" | "pending";

export const DASHBOARD_DEEP_LINKS = {
  createTask: "/task-tracking?new=1",
  addDailyLog: "/daily-logs?new=1",
  reviewPayroll: "/payroll-calendar?tab=calendar",
  approvals: "/payroll-calendar?tab=employees&view=pending",
  overdueTasks: "/task-tracking?filter=overdue",
  inProgressTasks: "/task-tracking?filter=in_progress",
  announcements: "/announcements",
} as const;

const MANAGEMENT_PAYROLL_TABS = new Set<PayrollTab>(["employees", "payslips", "reports"]);
const PAYROLL_TABS = new Set<PayrollTab>(["calendar", "employees", "payslips", "reports"]);

export function shouldOpenCreateFromSearch(searchParams: URLSearchParams) {
  return searchParams.get("new") === "1";
}

export function getPayrollTabFromSearch(
  searchParams: URLSearchParams,
  hasManagementAccess: boolean,
): PayrollTab {
  const requestedTab = searchParams.get("tab") as PayrollTab | null;

  if (!requestedTab || !PAYROLL_TABS.has(requestedTab)) {
    return "calendar";
  }

  if (!hasManagementAccess && MANAGEMENT_PAYROLL_TABS.has(requestedTab)) {
    return "calendar";
  }

  return requestedTab;
}

export function getEmployeeOverviewViewFromSearch(
  searchParams: URLSearchParams,
): EmployeeOverviewView {
  return searchParams.get("view") === "pending" ? "pending" : "deployed";
}
