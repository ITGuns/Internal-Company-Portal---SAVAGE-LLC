"use client";

import React from "react";
import Button from "@/components/Button";
import { useTaskDetail } from "@/hooks/useTasksQuery";
import { useLiveElapsed } from "@/hooks/useLiveElapsed";
import {
  formatDurationSeconds,
  getTaskWorkSummary,
  sortTaskWorkSessions,
} from "@/lib/task-work-history";
import type { Task, TaskPriority, TaskStatus } from "@/lib/tasks";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  FolderKanban,
  RotateCcw,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { getReopenedTaskProgress, type TaskQuickAction } from "@/lib/task-status-actions";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  review: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Med: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  High: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onAction?: (e: React.MouseEvent, taskId: string, action: TaskQuickAction) => void;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name?: string | null) {
  const label = name?.trim() || "?";
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function TaskDetailModal({ task, onClose, onEdit, onAction }: TaskDetailModalProps) {
  const {
    data: taskDetail,
    isLoading,
    isError,
    refetch,
  } = useTaskDetail(task.id);
  const activeTask = taskDetail || task;
  const liveElapsed = useLiveElapsed(
    activeTask.timerStatus,
    activeTask.timerStart,
    activeTask.totalElapsed || 0,
  );
  const sessions = sortTaskWorkSessions(activeTask.workSessions || []);
  const summary = getTaskWorkSummary({
    totalElapsed: liveElapsed,
    estimatedTime: activeTask.estimatedTime,
    workSessions: sessions,
  });
  const progress = activeTask.status === "completed"
    ? 100
    : getReopenedTaskProgress({ ...activeTask, totalElapsed: liveElapsed });
  const assigneeName = activeTask.assignee?.name || activeTask.assignee?.email || "Unassigned";
  const collaborators = activeTask.collaborators || [];
  const remainingLabel = summary.isOverEstimate
    ? `${formatDurationSeconds(summary.trackedSeconds - summary.estimatedSeconds)} over`
    : formatDurationSeconds(summary.remainingSeconds);

  return (
    <div
      className="fixed z-50 flex items-start justify-center bg-[var(--scrim)] px-4 pt-16 backdrop-blur-[2px]"
      style={{
        top: 0,
        left: "var(--sidebar-width, 16rem)",
        right: 0,
        bottom: 0,
      }}
    >
      <div className="w-full max-w-4xl max-h-[84vh] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-lg chat-scroll">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[activeTask.status]}`}>
                {STATUS_LABELS[activeTask.status]}
              </span>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[activeTask.priority]}`}>
                {activeTask.priority} Priority
              </span>
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              {activeTask.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {activeTask.description || "No description provided."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {activeTask.status === "completed" && onAction && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={(event) => onAction(event, activeTask.id, "reopen")}
              >
                Reopen Task
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Edit3 className="h-4 w-4" />}
              onClick={() => onEdit(activeTask)}
            >
              Edit Task
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-2 text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)]"
              aria-label="Close task details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Timer className="h-4 w-4" />
              Tracked
            </div>
            <div className="mt-2 text-lg font-semibold">
              {formatDurationSeconds(summary.trackedSeconds)}
            </div>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Clock3 className="h-4 w-4" />
              Estimate
            </div>
            <div className="mt-2 text-lg font-semibold">
              {summary.estimatedSeconds ? formatDurationSeconds(summary.estimatedSeconds) : "-"}
            </div>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <AlertCircle className="h-4 w-4" />
              {summary.isOverEstimate ? "Over Estimate" : "Remaining"}
            </div>
            <div className={summary.isOverEstimate ? "mt-2 text-lg font-semibold text-red-600" : "mt-2 text-lg font-semibold"}>
              {summary.estimatedSeconds ? remainingLabel : "-"}
            </div>
          </div>
          <div className="rounded border border-[var(--border)] bg-[var(--card-surface)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <CheckCircle2 className="h-4 w-4" />
              Sessions
            </div>
            <div className="mt-2 text-lg font-semibold">
              {summary.sessionCount}
            </div>
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Progress</span>
            <span className="font-medium text-[var(--foreground)]">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-y border-[var(--border)] py-5 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <UserRound className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
              <div>
                <div className="text-xs text-[var(--muted)]">Assignee</div>
                <div className="font-medium">{assigneeName}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
              <div>
                <div className="text-xs text-[var(--muted)]">Department / Role</div>
                <div className="font-medium">
                  {activeTask.department?.name || "No department"}
                  {activeTask.role ? ` / ${activeTask.role}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <FolderKanban className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
              <div>
                <div className="text-xs text-[var(--muted)]">Project</div>
                <div className="font-medium">{activeTask.project?.name || "No project"}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <UserRound className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
              <div className="min-w-0">
                <div className="text-xs text-[var(--muted)]">Collaborators</div>
                <div className="font-medium">
                  {collaborators.length > 0
                    ? collaborators
                        .map((collaborator) => collaborator.user?.name || collaborator.user?.email || "Invited member")
                        .join(", ")
                    : "None"}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                <CalendarDays className="h-4 w-4" />
                Start
              </div>
              <div className="font-medium">{formatDate(activeTask.startDate)}</div>
            </div>
            <div className="text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                <CalendarDays className="h-4 w-4" />
                Due
              </div>
              <div className="font-medium">{formatDate(activeTask.dueDate)}</div>
            </div>
            <div className="text-sm">
              <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted)]">
                <CalendarDays className="h-4 w-4" />
                Completed
              </div>
              <div className="font-medium">{formatDate(activeTask.completedAt)}</div>
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Work History</h3>
              <p className="text-xs text-[var(--muted)]">
                Timer sessions recorded when work is paused or completed.
              </p>
            </div>
            {isLoading && (
              <span className="text-xs text-[var(--muted)]">Loading...</span>
            )}
          </div>

          {isError ? (
            <div className="rounded border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
              <div className="mb-3 font-medium">Could not load work history.</div>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : sessions.length === 0 && !isLoading ? (
            <div className="rounded border border-dashed border-[var(--border)] bg-[var(--card-surface)] p-6 text-center text-sm text-[var(--muted)]">
              No work sessions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const workerName = session.user?.name || session.user?.email || assigneeName;

                return (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 rounded border border-[var(--border)] bg-[var(--card-surface)] p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] text-xs font-semibold text-[var(--muted)]">
                      {getInitials(workerName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-sm">{workerName}</div>
                        <div className="text-sm font-semibold">
                          {formatDurationSeconds(session.durationSeconds)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {formatDateTime(session.startedAt)} to {formatDateTime(session.endedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
