/**
 * SchedulerTab — Payroll automation scheduler panel.
 *
 * Shows recent job run history and lets admins manually trigger:
 *   • Period Advance (create next payroll period)
 *   • Auto Payslip Generation (bulk-generate payslips for current draft period)
 *   • Department Report (aggregate cost summary)
 *   • Client Invoice Generation (create due draft client invoices)
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Loader2,
  CalendarDays,
  FileText,
  BarChart3,
  CreditCard,
  Zap,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/Button";
import { PayrollSchedulerRunsSkeleton } from "@/components/ui/FeatureSkeletons";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobRun {
  id: string;
  jobType: "auto-payslip" | "dept-report" | "period-advance" | "client-invoices";
  status: "running" | "success" | "failed" | "skipped";
  triggeredBy: "cron" | "manual";
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  resultJson: string | null;
  errorMsg: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_DEFINITIONS = [
  {
    type: "period-advance",
    label: "Period Advance",
    description:
      "Creates a new payroll period for the current half of the month if one does not exist. Safe to run at any time — idempotent.",
    icon: CalendarDays,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    type: "auto-payslip",
    label: "Auto Payslip Generation",
    description:
      "Bulk-generates payslips for all active employees in the most recent draft period. Only runs on or near the period pay date.",
    icon: FileText,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  {
    type: "dept-report",
    label: "Department Cost Report",
    description:
      "Aggregates gross, net, deductions, and per-department cost totals for the most recent payroll period.",
    icon: BarChart3,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    type: "client-invoices",
    label: "Client Invoice Generation",
    description:
      "Creates draft manual invoices from due active, trial, or past-due monthly client billing records.",
    icon: CreditCard,
    color: "text-cyan-500",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "border-cyan-200 dark:border-cyan-800",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusIcon(status: JobRun["status"]) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "skipped":
      return <SkipForward className="w-4 h-4 text-amber-500" />;
    case "running":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
  }
}

function statusBadge(status: JobRun["status"]) {
  const map: Record<string, string> = {
    success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    skipped: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    running: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || ""}`}
    >
      {statusIcon(status)}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function jobLabel(type: string) {
  return JOB_DEFINITIONS.find((j) => j.type === type)?.label ?? type;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulerTab() {
  const toast = useToast();
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      const res = await apiFetch("/scheduler/runs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setRuns(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently ignore — runs table will be empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleRunJob = async (jobType: string) => {
    setRunningJob(jobType);
    try {
      const res = await apiFetch(`/scheduler/run/${jobType}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Job failed");
      }
      toast.success(`Job "${jobLabel(jobType)}" completed successfully`);
      await loadRuns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Job failed");
    } finally {
      setRunningJob(null);
    }
  };

  const handleRunAll = async () => {
    setRunningJob("all");
    try {
      const res = await apiFetch("/scheduler/run/all", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Run all failed");
      }
      toast.success("All scheduled jobs triggered successfully");
      await loadRuns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run all failed");
    } finally {
      setRunningJob(null);
    }
  };

  const parseResult = (json: string | null): Record<string, unknown> | null => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Payroll Scheduler</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Automated payroll and billing jobs run on the 1st and 16th of each month via Vercel Cron. You can also trigger them manually below.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={loadRuns}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={
              runningJob === "all" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )
            }
            onClick={handleRunAll}
            disabled={runningJob !== null}
          >
            Run All Now
          </Button>
        </div>
      </div>

      {/* Job cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {JOB_DEFINITIONS.map((job) => {
          const Icon = job.icon;
          const isRunning = runningJob === job.type;
          const lastRun = runs.find((r) => r.jobType === job.type);

          return (
            <div
              key={job.type}
              className={`rounded-xl border p-4 space-y-3 ${job.bg} ${job.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${job.color}`} />
                  <h3 className="font-semibold text-sm text-[var(--foreground)]">
                    {job.label}
                  </h3>
                </div>
                {lastRun && statusBadge(lastRun.status)}
              </div>

              <p className="text-xs text-[var(--muted)]">{job.description}</p>

              {lastRun && (
                <div className="text-xs text-[var(--muted)] space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last run: {fmt(lastRun.startedAt)}
                    {lastRun.triggeredBy === "manual" && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold">
                        MANUAL
                      </span>
                    )}
                  </div>
                  {lastRun.durationMs != null && (
                    <div>{(lastRun.durationMs / 1000).toFixed(1)}s</div>
                  )}
                  {lastRun.errorMsg && (
                    <div className="text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {lastRun.errorMsg}
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                icon={
                  isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5" />
                  )
                }
                onClick={() => handleRunJob(job.type)}
                disabled={runningJob !== null}
              >
                {isRunning ? "Running…" : "Run Now"}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Job run history table */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Recent Job Runs
        </h3>

        {isLoading ? (
          <PayrollSchedulerRunsSkeleton />
        ) : runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
            No job runs yet. Payroll and billing jobs run automatically on the 1st and 16th, or you can trigger them manually above.
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--card-surface)] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Job</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Trigger</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Started</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Duration</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {runs.map((run) => {
                  const result = parseResult(run.resultJson);
                  const isExpanded = expandedRun === run.id;

                  return (
                    <React.Fragment key={run.id}>
                      <tr
                        className="hover:bg-[var(--card-surface)] transition-colors cursor-pointer"
                        onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                      >
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          {jobLabel(run.jobType)}
                        </td>
                        <td className="px-4 py-3">{statusBadge(run.status)}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          <span className="capitalize">{run.triggeredBy}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {fmt(run.startedAt)}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          {run.durationMs != null
                            ? `${(run.durationMs / 1000).toFixed(1)}s`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted)] text-xs">
                          {run.errorMsg ? (
                            <span className="text-red-500">{run.errorMsg}</span>
                          ) : result ? (
                            <button className="text-blue-500 hover:underline">
                              {isExpanded ? "Hide" : "View"} details
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                      {isExpanded && result && (
                        <tr className="bg-[var(--card-surface)]">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="text-xs text-[var(--foreground)] bg-[var(--background)] rounded-lg p-3 overflow-x-auto max-h-48 font-mono">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
