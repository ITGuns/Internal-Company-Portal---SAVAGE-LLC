/** Employee Overview header: list switcher, payroll actions, and search (2026-10-20). */

import React from "react";
import { Plus, Search, SlidersHorizontal, UserCheck, UserPlus, UserX, X } from "lucide-react";
import Button from "@/components/Button";

export type EmployeeView = "deployed" | "pending" | "inactive";

interface EmployeeOverviewToolbarProps {
  view: EmployeeView;
  onViewChange: (view: EmployeeView) => void;
  pendingCount: number;
  showInactive: boolean;
  /** Payroll roles: opens Payroll options. */
  onOpenPayrollOptions?: () => void;
  /** Admins: opens the invite flow. */
  onAddEmployee?: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** Shown under the search, e.g. the category chips of the deployed list (2026-10-28). */
  filters?: React.ReactNode;
}

export default function EmployeeOverviewToolbar({
  view,
  onViewChange,
  pendingCount,
  showInactive,
  onOpenPayrollOptions,
  onAddEmployee,
  query,
  onQueryChange,
  filters,
}: EmployeeOverviewToolbarProps) {
  const viewButton = (target: EmployeeView, label: string, icon: React.ReactNode, badge?: number) => (
    <Button variant={view === target ? "primary" : "ghost"} size="sm" icon={icon} onClick={() => onViewChange(target)} aria-pressed={view === target}>
      {label}
      {badge ? <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{badge}</span> : null}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-1">
          {viewButton("deployed", "Deployed Employees", <UserCheck className="h-4 w-4" aria-hidden="true" />)}
          {viewButton("pending", "Pending Applications", <UserPlus className="h-4 w-4" aria-hidden="true" />, pendingCount)}
          {showInactive && viewButton("inactive", "Inactive", <UserX className="h-4 w-4" aria-hidden="true" />)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenPayrollOptions && (
            <Button variant="outline" icon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />} onClick={onOpenPayrollOptions}>
              Payroll options
            </Button>
          )}
          {onAddEmployee && (
            <Button variant="primary" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={onAddEmployee}>
              Add employee
            </Button>
          )}
        </div>
      </div>
      <div className="relative w-full sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name, email, role or department"
          aria-label="Search employees"
          className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] pl-9 pr-9 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {query.trim() !== "" && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {filters}
    </div>
  );
}
