"use client";

/**
 * One person's payroll history across pay periods (2026-10-28), opened from a
 * row of Reports > Employee History or from the employee profile panel. The
 * rows are the history the server records on its own; Download CSV saves the
 * same rows. Contract: docs/payroll-time-v2-spec.md, "Employee history".
 */

import React, { useState } from "react";
import { Download, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPayAmount } from "@/lib/payroll-setup";
import type { CategoryOption, EmployeeHistory } from "@/lib/employee-history";
import { downloadRosterCsv, employeeHistoryQueryKey, fetchEmployeeHistory } from "@/lib/employee-history-api";
import RosterTable from "./RosterTable";
import { usePayrollOptionList } from "./usePayrollOptions";

export interface HistoryEmployee {
  id: string;
  name: string;
}

interface EmployeeHistoryDialogProps {
  /** The person to show; null keeps the dialog closed. */
  employee: HistoryEmployee | null;
  onClose: () => void;
}

function HistoryTotals({ history }: { history: EmployeeHistory }) {
  const { totals } = history.summary;
  const figures = [
    { label: "Pay periods", value: String(history.rows.length) },
    { label: "Gross pay", value: formatPayAmount(totals.grossPay, "PHP") },
    { label: "Tax withheld", value: formatPayAmount(totals.taxAmount, "PHP") },
    { label: "Net pay", value: formatPayAmount(totals.netPay, "PHP") },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {figures.map((figure) => (
        <div key={figure.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2">
          <dt className="text-xs text-[var(--muted)]">{figure.label}</dt>
          <dd className="truncate font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HistoryBody({ query, categories }: {
  query: { data?: EmployeeHistory; isLoading: boolean; error: unknown; refetch: () => unknown };
  categories?: CategoryOption[];
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (query.error || !query.data) {
    return (
      <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4 text-sm" role="alert">
        <p className="text-red-700 dark:text-red-300">
          {query.error instanceof Error ? query.error.message : "Could not load the payroll history."}
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void query.refetch()}>Try again</Button>
      </div>
    );
  }
  if (query.data.rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <History className="h-10 w-10 text-[var(--muted)]" aria-hidden="true" />
        <p className="text-sm font-medium text-[var(--foreground)]">No payroll history yet</p>
        <p className="max-w-sm text-xs text-[var(--muted)]">
          A row is recorded for each pay period once a payslip is generated for this person or the period is locked.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <HistoryTotals history={query.data} />
      <RosterTable rows={query.data.rows} mode="employee" categories={categories} caption={`Payroll history of ${query.data.employee.name}`} />
    </div>
  );
}

export default function EmployeeHistoryDialog({ employee, onClose }: EmployeeHistoryDialogProps) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const userId = employee?.id ?? "";
  const history = useQuery({
    queryKey: employeeHistoryQueryKey(userId),
    queryFn: () => fetchEmployeeHistory(userId),
    enabled: Boolean(employee),
  });
  const categories = usePayrollOptionList("employment_type", Boolean(employee));

  const download = async () => {
    if (!employee) return;
    setDownloading(true);
    try {
      const filename = await downloadRosterCsv({ userId: employee.id });
      toast.success("Payroll history downloaded", filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the payroll history.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(employee)}
      onClose={onClose}
      title="Payroll history"
      subtitle={employee ? `${employee.name}, one row per pay period, newest first` : undefined}
      size="xl"
      // Wide enough for every column on a laptop; the table still scrolls in its own box below that.
      className="max-w-6xl"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            icon={<Download className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void download()}
            loading={downloading}
            disabled={!history.data || history.data.rows.length === 0}
          >
            Download CSV
          </Button>
        </>
      )}
    >
      <HistoryBody query={history} categories={categories.data} />
    </Modal>
  );
}
