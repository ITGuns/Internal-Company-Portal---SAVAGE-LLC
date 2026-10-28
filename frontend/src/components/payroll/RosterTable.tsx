/**
 * Employee history table (2026-10-28): a pay period's roster, one row per
 * person, or one person's history, one row per period. It scrolls inside its
 * own container, so a phone never scrolls the page sideways. In the period
 * view a row (or the name button, for keyboards) opens that person's history.
 */

import React from "react";
import { formatPayrollPeriod } from "@/lib/payroll-dates";
import { formatPayAmount } from "@/lib/payroll-setup";
import {
  categoryLabel,
  formatRosterHours,
  memberStatusLabel,
  payslipStatusLabel,
  type CategoryOption,
  type RosterPayslipStatus,
  type RosterRow,
} from "@/lib/employee-history";

type RosterTableMode = "period" | "employee";

interface RosterTableProps {
  rows: RosterRow[];
  /** "period": one row per person. "employee": one row per pay period. */
  mode: RosterTableMode;
  /** The employment type list, for category labels. */
  categories?: CategoryOption[];
  /** Period view: opens the person's history. */
  onOpenEmployee?: (row: RosterRow) => void;
  /** Read by screen readers. */
  caption: string;
}

const PAYSLIP_STYLES: Record<RosterPayslipStatus, string> = {
  draft: "border-[var(--border)] bg-[var(--card-surface)] text-[var(--muted)]",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  locked: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const headCell = "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold";
const headNumber = "whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold";
const cell = "whitespace-nowrap px-3 py-3";
const numberCell = "whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums";
// The first column stays in view while the table scrolls sideways.
const stickyCell = "sticky left-0 z-[1] shadow-[1px_0_0_var(--border)]";

/** Empty for screen readers too: "None" instead of a blank cell. */
function Missing() {
  return <span className="sr-only">None</span>;
}

function Money({ value }: { value: number | null }) {
  return value === null ? <Missing /> : <>{formatPayAmount(value, "PHP")}</>;
}

function PayslipBadge({ status }: { status: RosterPayslipStatus | null }) {
  if (!status) return <span className="text-xs text-[var(--muted)]">No payslip</span>;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PAYSLIP_STYLES[status]}`}>
      {payslipStatusLabel(status)}
    </span>
  );
}

function FirstCell({ row, mode, onOpenEmployee }: { row: RosterRow; mode: RosterTableMode; onOpenEmployee?: (row: RosterRow) => void }) {
  const sticky = `${cell} ${stickyCell} bg-[var(--card-bg)] transition-colors duration-150 group-hover:bg-[var(--card-surface)]`;
  if (mode === "employee") {
    return <td className={`${sticky} font-medium text-[var(--foreground)]`}>{formatPayrollPeriod(row.periodStart, row.periodEnd)}</td>;
  }
  return (
    <td className={sticky}>
      {onOpenEmployee ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenEmployee(row);
          }}
          className="rounded-sm text-left font-medium text-[var(--foreground)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {row.name}
          <span className="sr-only">, open payroll history</span>
        </button>
      ) : (
        <span className="font-medium text-[var(--foreground)]">{row.name}</span>
      )}
      <div className="text-xs text-[var(--muted)]">{row.roleTitle}</div>
    </td>
  );
}

function RosterTableRow({ row, mode, categories, onOpenEmployee }: Omit<RosterTableProps, "rows" | "caption"> & { row: RosterRow }) {
  const open = mode === "period" && onOpenEmployee ? () => onOpenEmployee(row) : undefined;
  return (
    <tr onClick={open} className={`group transition-colors duration-150 hover:bg-[var(--card-surface)] ${open ? "cursor-pointer" : ""}`}>
      <FirstCell row={row} mode={mode} onOpenEmployee={onOpenEmployee} />
      <td className={`${cell} text-[var(--muted)]`}>{row.department}</td>
      <td className={cell}>{categoryLabel(categories, row.employmentType)}</td>
      <td className={cell}>{memberStatusLabel(row.memberStatus)}</td>
      <td className={`${cell} text-[var(--muted)]`}>{row.payrollScheme ?? <Missing />}</td>
      <td className={numberCell}><Money value={row.baseSalary} /></td>
      <td className={numberCell}>{row.hoursWorked === null ? <Missing /> : formatRosterHours(row.hoursWorked)}</td>
      <td className={numberCell}><Money value={row.grossPay} /></td>
      <td className={`${numberCell} ${row.taxAmount ? "text-red-500" : "text-[var(--muted)]"}`}><Money value={row.taxAmount} /></td>
      <td className={`${numberCell} font-semibold text-emerald-600 dark:text-emerald-400`}><Money value={row.netPay} /></td>
      <td className={cell}><PayslipBadge status={row.payslipStatus} /></td>
    </tr>
  );
}

export default function RosterTable({ rows, mode, categories, onOpenEmployee, caption }: RosterTableProps) {
  return (
    <div className="max-w-full overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
      <table className="w-full min-w-[960px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-[var(--border)] bg-[var(--card-surface)] text-[var(--muted)]">
          <tr>
            <th scope="col" className={`${headCell} ${stickyCell} bg-[var(--card-surface)]`}>{mode === "period" ? "Employee" : "Pay period"}</th>
            <th scope="col" className={headCell}>Department</th>
            <th scope="col" className={headCell}>Category</th>
            <th scope="col" className={headCell}>Status</th>
            <th scope="col" className={headCell}>Scheme</th>
            <th scope="col" className={headNumber}>Base salary</th>
            <th scope="col" className={headNumber}>Hours</th>
            <th scope="col" className={headNumber}>Gross</th>
            <th scope="col" className={headNumber}>Tax</th>
            <th scope="col" className={headNumber}>Net</th>
            <th scope="col" className={headCell}>Payslip</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <RosterTableRow
              key={mode === "period" ? row.userId : row.periodId}
              row={row}
              mode={mode}
              categories={categories}
              onOpenEmployee={onOpenEmployee}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
