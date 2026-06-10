import { CalendarDays, RotateCcw, Search, UserRound } from "lucide-react";
import type { TaskUser } from "@/lib/tasks";
import {
  getPayrollAuditSummary,
  getPayrollAuditTodayDateInput,
  getVisiblePayrollAuditUsers,
} from "@/lib/payroll-calendar/audit-target";

interface PayrollAuditFilterBarProps {
  payrollUsers: TaskUser[];
  selectedAuditUserId: string;
  auditUserSearch: string;
  auditStartDate: string;
  auditEndDate: string;
  isLoadingPayrollUsers: boolean;
  onSearchChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onDateChange: (field: "start" | "end", value: string) => void;
  onReset: () => void;
}

export default function PayrollAuditFilterBar({
  payrollUsers,
  selectedAuditUserId,
  auditUserSearch,
  auditStartDate,
  auditEndDate,
  isLoadingPayrollUsers,
  onSearchChange,
  onUserChange,
  onDateChange,
  onReset,
}: PayrollAuditFilterBarProps) {
  const todayDate = getPayrollAuditTodayDateInput();
  const selectedPayrollUser = payrollUsers.find(
    (payrollUser) => String(payrollUser.id) === selectedAuditUserId,
  );
  const visiblePayrollUsers = getVisiblePayrollAuditUsers(
    payrollUsers,
    auditUserSearch,
    selectedAuditUserId,
  );
  const summary = getPayrollAuditSummary({
    selectedUser: selectedPayrollUser,
    startDate: auditStartDate,
    endDate: auditEndDate,
  });
  const hasFilters = Boolean(
    selectedAuditUserId || auditUserSearch || auditStartDate || auditEndDate,
  );
  const isRangeInvalid = Boolean(
    auditStartDate && auditEndDate && auditStartDate > auditEndDate,
  );

  return (
    <section
      aria-labelledby="payroll-audit-filter-title"
      className="mb-4 rounded border border-[var(--border)] bg-[var(--card-surface)] p-3"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="payroll-audit-filter-title"
                className="text-sm font-semibold text-[var(--foreground)]"
              >
                Time Entry Audit
              </h2>
              <p
                id="payroll-audit-summary"
                aria-live="polite"
                className="mt-0.5 text-xs text-[var(--muted)]"
              >
                {summary}
              </p>
            </div>
          </div>
          {isRangeInvalid && (
            <p className="mt-2 text-xs font-medium text-amber-300" role="alert">
              Start date must be on or before end date.
            </p>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-10 items-center gap-2 rounded border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.1fr)_minmax(220px,1fr)_150px_150px]">
        <div className="min-w-0">
          <label
            htmlFor="payroll-audit-user-search"
            className="mb-1 block text-xs font-medium text-[var(--muted)]"
          >
            Find Employee
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              id="payroll-audit-user-search"
              name="payrollAuditEmployeeSearch"
              type="search"
              value={auditUserSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name or email…"
              autoComplete="off"
              className="w-full rounded border border-[var(--border)] bg-[var(--card-bg)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>

        <div className="min-w-0">
          <label
            htmlFor="payroll-audit-user"
            className="mb-1 block text-xs font-medium text-[var(--muted)]"
          >
            Auditing
          </label>
          <select
            id="payroll-audit-user"
            name="payrollAuditUser"
            value={selectedAuditUserId}
            onChange={(event) => onUserChange(event.target.value)}
            disabled={isLoadingPayrollUsers}
            aria-describedby="payroll-audit-summary"
            className="w-full rounded border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">My time entries</option>
            {visiblePayrollUsers.map((payrollUser) => (
              <option key={payrollUser.id} value={payrollUser.id}>
                {payrollUser.name || payrollUser.email}
              </option>
            ))}
            {auditUserSearch && visiblePayrollUsers.length === 0 && (
              <option value="__no_matches" disabled>
                No matching employees
              </option>
            )}
          </select>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="payroll-audit-start"
              className="text-xs font-medium text-[var(--muted)]"
            >
              From
            </label>
            <button
              type="button"
              onClick={() => onDateChange("start", todayDate)}
              className="inline-flex min-h-10 items-center rounded px-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Today
            </button>
          </div>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              id="payroll-audit-start"
              name="payrollAuditStartDate"
              type="date"
              value={auditStartDate}
              onChange={(event) => onDateChange("start", event.target.value)}
              aria-invalid={isRangeInvalid || undefined}
              autoComplete="off"
              className="w-full rounded border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 pr-9 text-sm text-[var(--foreground)] [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] dark:[color-scheme:dark]"
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="payroll-audit-end"
              className="text-xs font-medium text-[var(--muted)]"
            >
              To
            </label>
            <button
              type="button"
              onClick={() => onDateChange("end", todayDate)}
              className="inline-flex min-h-10 items-center rounded px-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Today
            </button>
          </div>
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              id="payroll-audit-end"
              name="payrollAuditEndDate"
              type="date"
              value={auditEndDate}
              onChange={(event) => onDateChange("end", event.target.value)}
              aria-invalid={isRangeInvalid || undefined}
              autoComplete="off"
              className="w-full rounded border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 pr-9 text-sm text-[var(--foreground)] [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] dark:[color-scheme:dark]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
