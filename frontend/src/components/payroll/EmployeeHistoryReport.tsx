"use client";

/**
 * Reports > Employee History (2026-10-28, payroll manager request): who was
 * on payroll in a pay period and what they were paid. The server records it
 * on its own each time a payslip is generated, edited or signed off and when
 * the period is locked, so nobody has to produce it by hand. Pick a period,
 * read the headcount, download the CSV, click a name for that person's history.
 */

import React, { useId, useState } from "react";
import { Download, Users } from "lucide-react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPayrollPeriod } from "@/lib/payroll-dates";
import { formatPayAmount } from "@/lib/payroll-setup";
import {
  labelledHeadcount,
  memberStatusLabel,
  periodStatusLabel,
  type CategoryOption,
  type PeriodRoster,
  type RosterRow,
} from "@/lib/employee-history";
import {
  downloadRosterCsv,
  fetchPayrollPeriods,
  fetchPeriodRoster,
  PAYROLL_PERIODS_QUERY_KEY,
  periodRosterQueryKey,
  type PayrollPeriodRow,
} from "@/lib/employee-history-api";
import EmployeeHistoryDialog, { type HistoryEmployee } from "./EmployeeHistoryDialog";
import RosterTable from "./RosterTable";
import { fieldInputClass, fieldLabelClass } from "./form-styles";
import { usePayrollOptionList } from "./usePayrollOptions";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <dt className="truncate text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 truncate font-mono text-xl font-semibold tabular-nums text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function Notice({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-4 py-12 text-center">
      <Users className="h-10 w-10 text-[var(--muted)]" aria-hidden="true" />
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {children && <p className="max-w-md text-xs text-[var(--muted)]">{children}</p>}
      {action}
    </div>
  );
}

/** Headcount for the period: the total, then each category with its share of it. */
function HeadcountPanel({ roster, categories }: { roster: PeriodRoster; categories?: CategoryOption[] }) {
  const { summary } = roster;
  const statuses = summary.byStatus.map((entry) => `${memberStatusLabel(entry.value ?? "")} ${entry.count}`).join(", ");
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 lg:col-span-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">On payroll</h3>
        <span className="font-mono text-2xl font-semibold tabular-nums text-[var(--foreground)]">{summary.headcount}</span>
      </div>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{summary.withPayslip} with a payslip. By status: {statuses}.</p>
      <ul className="mt-3 space-y-2" aria-label="Headcount by category">
        {labelledHeadcount(summary.byCategory, categories).map((entry) => (
          <li key={entry.value} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 truncate text-[var(--foreground)]">{entry.label}</span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--card-surface)]" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${summary.headcount ? Math.round((entry.count / summary.headcount) * 100) : 0}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right font-mono tabular-nums text-[var(--foreground)]">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RosterSummaryPanel({ roster, categories }: { roster: PeriodRoster; categories?: CategoryOption[] }) {
  const { totals } = roster.summary;
  return (
    <section aria-label="Headcount and totals" className="grid gap-3 lg:grid-cols-5">
      <HeadcountPanel roster={roster} categories={categories} />
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-1 xl:grid-cols-3">
        <Tile label="Gross pay" value={formatPayAmount(totals.grossPay, "PHP")} />
        <Tile label="Tax withheld" value={formatPayAmount(totals.taxAmount, "PHP")} />
        <Tile label="Net pay" value={formatPayAmount(totals.netPay, "PHP")} />
      </dl>
    </section>
  );
}

/** Loading, error and empty states, else the headcount and the roster table. */
function ReportBody({ periods, roster, periodId, categories, onOpenEmployee }: {
  periods: UseQueryResult<PayrollPeriodRow[]>;
  roster: UseQueryResult<PeriodRoster>;
  periodId: string | null;
  categories?: CategoryOption[];
  onOpenEmployee: (row: RosterRow) => void;
}) {
  if (periods.isLoading || (periodId && roster.isLoading)) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const failed = periods.error ? periods : roster.error ? roster : null;
  if (failed) {
    return (
      <Notice
        title="Could not load the employee history"
        action={<Button size="sm" variant="outline" className="mt-2" onClick={() => void failed.refetch()}>Try again</Button>}
      >
        {failed.error instanceof Error ? failed.error.message : undefined}
      </Notice>
    );
  }
  if (!periodId) return <Notice title="No pay periods yet">History starts with the first pay period.</Notice>;
  if (!roster.data || roster.data.rows.length === 0) {
    return (
      <Notice title="No one is on record for this period yet">
        A row is recorded for each person once a payslip is generated or the period is locked.
      </Notice>
    );
  }
  return (
    <>
      <RosterSummaryPanel roster={roster.data} categories={categories} />
      <RosterTable
        rows={roster.data.rows}
        mode="period"
        categories={categories}
        caption="Employees on payroll in the selected period"
        onOpenEmployee={onOpenEmployee}
      />
    </>
  );
}

export default function EmployeeHistoryReport() {
  const toast = useToast();
  const selectId = useId();
  const [chosenPeriodId, setChosenPeriodId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<HistoryEmployee | null>(null);
  const [downloading, setDownloading] = useState(false);
  const periods = useQuery({ queryKey: PAYROLL_PERIODS_QUERY_KEY, queryFn: fetchPayrollPeriods });
  // Newest period until one is picked.
  const periodId = chosenPeriodId ?? periods.data?.[0]?.id ?? null;
  const roster = useQuery({
    queryKey: periodRosterQueryKey(periodId ?? ""),
    queryFn: () => fetchPeriodRoster(periodId as string),
    enabled: Boolean(periodId),
  });
  const categories = usePayrollOptionList("employment_type");
  const rows = roster.data?.rows ?? [];

  const download = async () => {
    if (!periodId) return;
    setDownloading(true);
    try {
      const filename = await downloadRosterCsv({ periodId });
      toast.success("Employee history downloaded", filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the employee history.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <label htmlFor={selectId} className={fieldLabelClass}>Pay period</label>
          <select
            id={selectId}
            value={periodId ?? ""}
            onChange={(event) => setChosenPeriodId(event.target.value)}
            disabled={!periods.data || periods.data.length === 0}
            className={`${fieldInputClass} [color-scheme:light] dark:[color-scheme:dark]`}
          >
            {(periods.data ?? []).map((period) => (
              <option key={period.id} value={period.id}>
                {formatPayrollPeriod(period.startDate, period.endDate)} ({periodStatusLabel(period.status)})
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          icon={<Download className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void download()}
          loading={downloading}
          disabled={rows.length === 0}
        >
          Download CSV
        </Button>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Recorded automatically when payslips are generated, edited or signed off, and when a period is locked. Click a name to see that person across every period.
      </p>
      <ReportBody
        periods={periods}
        roster={roster}
        periodId={periodId}
        categories={categories.data}
        onOpenEmployee={(row) => setHistoryFor({ id: row.userId, name: row.name })}
      />
      <EmployeeHistoryDialog employee={historyFor} onClose={() => setHistoryFor(null)} />
    </div>
  );
}
