/**
 * A pending application on Employee Overview (moved out of EmployeeOverviewTab
 * on 2026-10-20, behaviour unchanged): approve, reject or edit before approval.
 */

import React from "react";
import Image from "next/image";
import { CheckCircle, Edit2, XCircle } from "lucide-react";
import Button from "@/components/Button";
import type { Employee } from "@/lib/payroll-calendar/types";
import { formatPayAmount } from "@/lib/payroll-setup";

interface PendingApplicationCardProps {
  employee: Employee;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-[var(--muted)]">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[var(--foreground)]">{children}</span>
    </div>
  );
}

export default function PendingApplicationCard({ employee, onEdit, onApprove, onReject }: PendingApplicationCardProps) {
  const isImage = employee.avatar && (employee.avatar.startsWith("http") || employee.avatar.startsWith("/"));

  return (
    <article className="rounded-[var(--radius-md)] border-2 border-dashed border-orange-500/30 bg-[var(--card-bg)] p-4" aria-label={employee.name}>
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-gradient-to-br from-orange-400 to-amber-500 text-base font-bold text-white">
          {isImage ? <Image src={employee.avatar} alt="" width={44} height={44} className="h-full w-full object-cover" /> : <span aria-hidden="true">{employee.avatar}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-[var(--foreground)]">{employee.name}</h3>
          <p className="truncate text-sm text-[var(--muted)]">{employee.role}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={`Edit ${employee.name}`}
          >
            <Edit2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">Pending</span>
        </div>
      </header>

      <div className="mb-4 space-y-2 text-sm">
        <Row label="Department">{employee.department}</Row>
        <Row label="Email">{employee.email}</Row>
        <Row label="Salary">{formatPayAmount(employee.salary, employee.currency)}</Row>
        {employee.appliedDate && <Row label="Applied">{new Date(employee.appliedDate).toLocaleDateString()}</Row>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="primary" icon={<CheckCircle className="h-4 w-4" aria-hidden="true" />} onClick={onApprove} className="border-emerald-600 bg-emerald-600 hover:bg-emerald-700">
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
          onClick={onReject}
          className="border-red-600/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
        >
          Reject
        </Button>
      </div>
    </article>
  );
}
