/**
 * Employee categories (Employee Overview filter and card badge) and the
 * automatic employee history (Reports > Employee History, the Payroll
 * history dialog), 2026-10-28. The server keeps the history: one row per
 * person per pay period (backend/src/payroll/roster-snapshot.ts, which these
 * labels mirror). Contract: docs/payroll-time-v2-spec.md, "Employee
 * categories" and "Employee history".
 * No runtime imports so node --test can load this file directly.
 */

export const ALL_CATEGORIES = "all";
/** Filter value for people without an employment type. */
export const NOT_SET_CATEGORY = "__not_set__";
export const NOT_SET_LABEL = "Not set";

/** The part of a PayrollOptionRow (employment_type list) these helpers read. */
export interface CategoryOption {
  value: string;
  label: string;
  sortOrder: number;
  archived: boolean;
}

export interface CategoryCount {
  /** An employmentType value, or NOT_SET_CATEGORY. */
  value: string;
  label: string;
  count: number;
}

export type RosterPayslipStatus = "draft" | "approved" | "locked";

/** One person in one pay period, as GET /payroll/reports/roster returns it. */
export interface RosterRow {
  periodId: string;
  /** Payroll-timezone calendar days (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  periodStatus: string;
  userId: string;
  name: string;
  email: string;
  department: string;
  roleTitle: string;
  employmentType: string | null;
  memberStatus: string;
  /** Scheme name and tax rule label as they were when the row was captured. */
  payrollScheme: string | null;
  payBasis: string | null;
  baseSalary: number | null;
  taxRule: string | null;
  /** Null when the person had no payslip in the period. */
  hoursWorked: number | null;
  grossPay: number | null;
  taxAmount: number | null;
  netPay: number | null;
  payslipId: string | null;
  payslipStatus: RosterPayslipStatus | null;
  capturedAt: string;
}

export interface RosterCount {
  value: string | null;
  count: number;
}

export interface RosterSummary {
  headcount: number;
  withPayslip: number;
  byCategory: RosterCount[];
  byStatus: RosterCount[];
  totals: { grossPay: number; taxAmount: number; netPay: number };
}

export interface PeriodRoster {
  period: { id: string; startDay: string; endDay: string; payDay: string | null; status: string };
  rows: RosterRow[];
  summary: RosterSummary;
}

export interface EmployeeHistory {
  employee: { id: string; name: string; email: string };
  rows: RosterRow[];
  summary: RosterSummary;
}

export type RosterTarget = { periodId: string } | { userId: string };

function stored(value: string | null | undefined): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

function byListOrder(options: readonly CategoryOption[] | undefined): CategoryOption[] {
  return [...(options ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
}

/** "Probationary" for a listed value, the value itself when unlisted, "Not set" for none. */
export function categoryLabel(options: readonly CategoryOption[] | undefined, value: string | null | undefined): string {
  const key = stored(value);
  if (!key) return NOT_SET_LABEL;
  return options?.find((option) => option.value === key)?.label ?? key;
}

/** Does a person with this employment type pass the category filter? */
export function matchesCategory(employmentType: string | null | undefined, category: string): boolean {
  if (category === ALL_CATEGORIES) return true;
  const key = stored(employmentType);
  return category === NOT_SET_CATEGORY ? key === null : key === category;
}

function tallyValues(values: ReadonlyArray<string | null | undefined>): Map<string, number> {
  return values.reduce((tally, value) => {
    const key = stored(value) ?? NOT_SET_CATEGORY;
    return tally.set(key, (tally.get(key) ?? 0) + 1);
  }, new Map<string, number>());
}

/**
 * Filter chips in list order: every active option (0 included, so the whole
 * scheme shows), archived options and unlisted values someone still has,
 * then "Not set" when anyone has no type.
 */
export function categoryCounts(
  values: ReadonlyArray<string | null | undefined>,
  options: readonly CategoryOption[] | undefined,
): CategoryCount[] {
  const tally = tallyValues(values);
  const listed = byListOrder(options);
  const listedValues = new Set(listed.map((option) => option.value));
  const fromList = listed
    .filter((option) => !option.archived || tally.has(option.value))
    .map((option) => ({ value: option.value, label: option.label, count: tally.get(option.value) ?? 0 }));
  const unlisted = [...tally.keys()]
    .filter((key) => key !== NOT_SET_CATEGORY && !listedValues.has(key))
    .sort((left, right) => left.localeCompare(right))
    .map((key) => ({ value: key, label: key, count: tally.get(key) ?? 0 }));
  const notSet = tally.has(NOT_SET_CATEGORY)
    ? [{ value: NOT_SET_CATEGORY, label: NOT_SET_LABEL, count: tally.get(NOT_SET_CATEGORY) ?? 0 }]
    : [];
  return [...fromList, ...unlisted, ...notSet];
}

/** The server's headcount by category, labelled and in list order ("Not set" last). */
export function labelledHeadcount(
  counts: readonly RosterCount[],
  options: readonly CategoryOption[] | undefined,
): CategoryCount[] {
  const listed = byListOrder(options);
  const rank = (value: string | null) => {
    if (value === null) return listed.length + 1;
    const index = listed.findIndex((option) => option.value === value);
    return index === -1 ? listed.length : index;
  };
  return [...counts]
    .sort((left, right) => rank(left.value) - rank(right.value) || String(left.value).localeCompare(String(right.value)))
    .map((entry) => ({ value: entry.value ?? NOT_SET_CATEGORY, label: categoryLabel(options, entry.value), count: entry.count }));
}

const MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  verified: "Verified",
  vacation: "On vacation",
  leave: "On leave",
  inactive: "Inactive",
  pending: "Pending",
};

const PAYSLIP_STATUS_LABELS: Record<RosterPayslipStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  locked: "Locked",
};

/** Same words as the CSV the server builds. */
export function memberStatusLabel(status: string): string {
  return MEMBER_STATUS_LABELS[status] ?? status;
}

export function payslipStatusLabel(status: RosterPayslipStatus | null): string {
  return status ? PAYSLIP_STATUS_LABELS[status] : "No payslip";
}

/** A pay period's status: draft periods are open, processed ones are locked. */
export function periodStatusLabel(status: string): string {
  if (status === "draft") return "Draft";
  if (status === "processed") return "Locked";
  return status;
}

/** "184 h", "7.5 h". */
export function formatRosterHours(hours: number): string {
  return `${Math.round(hours * 100) / 100} h`;
}

/** "?periodId=..." or "?userId=..." for the roster routes. */
export function rosterQuery(target: RosterTarget): string {
  return "periodId" in target
    ? `?periodId=${encodeURIComponent(target.periodId)}`
    : `?userId=${encodeURIComponent(target.userId)}`;
}

/** Download name when the response does not say one. */
export function fallbackCsvName(target: RosterTarget): string {
  return "periodId" in target ? "deskii-employee-history.csv" : "deskii-payroll-history.csv";
}

/**
 * The filename of `attachment; filename="..."`, kept to letters, digits,
 * dots, dashes and underscores; the fallback when missing or unsafe.
 */
export function filenameFromDisposition(header: string | null | undefined, fallback: string): string {
  const match = /filename="?([^";]+)"?/i.exec(header ?? "");
  const name = match?.[1]?.trim() ?? "";
  return /^[A-Za-z0-9._-]{1,120}\.csv$/.test(name) ? name : fallback;
}
