/**
 * API calls for the employee history (docs/api.md, "Employee history").
 * apiFetch sends the access token and throws the server's message on any
 * non-2xx answer, so callers can show it.
 */

import { apiFetch } from "@/lib/api";
import {
  fallbackCsvName,
  filenameFromDisposition,
  rosterQuery,
  type EmployeeHistory,
  type PeriodRoster,
  type RosterTarget,
} from "@/lib/employee-history";

/** Keys start with "payslips": a payslip write broadcast refetches an open history. */
export const ROSTER_QUERY_KEY = ["payslips", "roster"] as const;
export const periodRosterQueryKey = (periodId: string) => [...ROSTER_QUERY_KEY, "period", periodId] as const;
export const employeeHistoryQueryKey = (userId: string) => [...ROSTER_QUERY_KEY, "user", userId] as const;
export const PAYROLL_PERIODS_QUERY_KEY = ["payslips", "periods"] as const;

/** GET /payroll/periods rows, newest first. */
export interface PayrollPeriodRow {
  id: string;
  startDate: string;
  endDate: string;
  payDate: string | null;
  status: string;
  _count?: { payslips: number };
}

export async function fetchPayrollPeriods(): Promise<PayrollPeriodRow[]> {
  const response = await apiFetch("/payroll/periods");
  return (await response.json()) as PayrollPeriodRow[];
}

export async function fetchPeriodRoster(periodId: string): Promise<PeriodRoster> {
  const response = await apiFetch(`/payroll/reports/roster${rosterQuery({ periodId })}`);
  return (await response.json()) as PeriodRoster;
}

export async function fetchEmployeeHistory(userId: string): Promise<EmployeeHistory> {
  const response = await apiFetch(`/payroll/reports/roster${rosterQuery({ userId })}`);
  return (await response.json()) as EmployeeHistory;
}

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Fetches the CSV with the access token (a plain link would have none) and
 * saves it under the server's filename. Resolves with that filename.
 */
export async function downloadRosterCsv(target: RosterTarget): Promise<string> {
  const response = await apiFetch(`/payroll/reports/roster.csv${rosterQuery(target)}`);
  const filename = filenameFromDisposition(response.headers.get("Content-Disposition"), fallbackCsvName(target));
  saveBlob(filename, await response.blob());
  return filename;
}
