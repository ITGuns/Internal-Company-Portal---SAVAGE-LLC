/**
 * Employee card for Employee Overview (tidied 2026-10-20): name and status,
 * a one-line pay summary from the managed lists, three figures, and one
 * action row that wraps into two columns on a phone.
 */

import React from "react";
import Image from "next/image";
import { Check, Coffee, Eye, KeyRound, Pencil, Plane, Settings2, TrendingUp, UserX } from "lucide-react";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";
import { formatPayAmount } from "@/lib/payroll-setup";

interface EmployeeCardProps {
  employee: Employee;
  /** Pay basis, scheme name, daily cap and pay frequency (buildPaySummary). */
  paySummary: string[];
  onViewDetails: () => void;
  onEdit: () => void;
  /** Payroll roles only. */
  onSetUpPayroll?: () => void;
  /** Omitted when the viewer cannot change member status. */
  onDeactivate?: () => void;
  /** Same gate as onDeactivate. */
  onResetPassword?: () => void;
}

const STATUS_BADGES: Record<string, { label: string; className: string; Icon: typeof Check }> = {
  active: { label: "Verified", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Icon: Check },
  verified: { label: "Verified", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Icon: Check },
  vacation: { label: "On vacation", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", Icon: Plane },
  leave: { label: "On leave", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", Icon: Coffee },
};

function Avatar({ employee }: { employee: Employee }) {
  const isImage = employee.avatar && (employee.avatar.startsWith("http") || employee.avatar.startsWith("/"));
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">
      {isImage ? (
        <Image src={employee.avatar} alt="" width={44} height={44} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{employee.avatar}</span>
      )}
    </div>
  );
}

export default function EmployeeCard({
  employee,
  paySummary,
  onViewDetails,
  onEdit,
  onSetUpPayroll,
  onDeactivate,
  onResetPassword,
}: EmployeeCardProps) {
  const badge = STATUS_BADGES[employee.status];
  const isHourlyRate = employee.payBasis === "hourly_rate";
  // Uniform cells on a phone (two columns, one line each); a wrapping row from sm up.
  const actionClass = "w-full gap-1.5 whitespace-nowrap px-2 text-[13px] sm:w-auto sm:gap-2 sm:px-3 sm:text-sm";

  return (
    <article className="flex flex-col rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4" aria-label={employee.name}>
      <header className="flex items-start gap-3">
        <Avatar employee={employee} />
        {/* min-w-0 lets long names truncate; the badge never leaves the card. */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-[var(--foreground)]">{employee.name}</h3>
          <p className="truncate text-xs text-[var(--muted)]">
            {employee.role}{employee.department ? ` · ${employee.department}` : ""}
          </p>
        </div>
        {badge && (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
            <badge.Icon className="h-3 w-3" aria-hidden="true" />
            {badge.label}
          </span>
        )}
      </header>

      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        <span className="sr-only">Pay setup: </span>
        {paySummary.join(" · ")}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--border)] pt-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-[var(--muted)]">Hours this week</dt>
          <dd className="font-mono font-medium tabular-nums text-[var(--foreground)]">{employee.hoursThisWeek} h</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-[var(--muted)]">Performance</dt>
          <dd className="flex items-center gap-1 font-medium text-[var(--foreground)]">
            {typeof employee.performance === "number" ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                <span className="font-mono tabular-nums">{employee.performance}%</span>
              </>
            ) : (
              <span className="text-[var(--muted)]">Not tracked</span>
            )}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-xs text-[var(--muted)]">{isHourlyRate ? "Pay" : "Monthly salary"}</dt>
          <dd className="truncate font-mono text-base font-semibold tabular-nums text-[var(--foreground)]">
            {isHourlyRate ? <span className="font-sans text-sm font-medium">Paid by the hour</span> : formatPayAmount(employee.salary, employee.currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button size="sm" variant="outline" className={actionClass} icon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onViewDetails} aria-label={`View ${employee.name}`}>
          View
        </Button>
        {onSetUpPayroll && (
          <Button size="sm" variant="outline" className={actionClass} icon={<Settings2 className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onSetUpPayroll} aria-label={`Set up payroll for ${employee.name}`}>
            Set up payroll
          </Button>
        )}
        <Button size="sm" variant="outline" className={actionClass} icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onEdit} aria-label={`Edit ${employee.name}`}>
          Edit
        </Button>
        {onResetPassword && (
          <Button size="sm" variant="outline" className={actionClass} icon={<KeyRound className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onResetPassword} aria-label={`Reset password for ${employee.name}`}>
            Reset password
          </Button>
        )}
        {onDeactivate && (
          <Button
            size="sm"
            variant="ghost"
            className={`${actionClass} text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400`}
            icon={<UserX className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={onDeactivate}
            aria-label={`Deactivate ${employee.name}`}
          >
            Deactivate
          </Button>
        )}
      </div>
    </article>
  );
}
