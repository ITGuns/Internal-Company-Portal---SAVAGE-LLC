import {
  AlertTriangle,
  CalendarDays,
  Clock3,
} from "lucide-react";
import type { TaskProjectAnalytics } from "@/lib/task-project-analytics";
import type { TaskProject, TaskProjectStatus } from "@/lib/tasks";
import ProjectOverviewMetric from "@/components/tasks/ProjectOverviewMetric";

interface ProjectAnalyticsCardProps {
  item: TaskProjectAnalytics;
  isSelected: boolean;
  canManageAssignments: boolean;
  onToggleProject: (projectId: string) => void;
  onProjectStatus: (project: TaskProject, status: TaskProjectStatus) => void;
}

const PROJECT_STATUS_LABELS: Record<TaskProjectStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

function formatMinutes(minutes: number): string {
  if (!minutes) return "0h";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
  return `${remainingMinutes}m`;
}

function formatDateLabel(value?: string | null): string {
  if (!value) return "-";
  const dateValue = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ProjectAnalyticsCard({
  item,
  isSelected,
  canManageAssignments,
  onToggleProject,
  onProjectStatus,
}: ProjectAnalyticsCardProps) {
  const { project } = item;
  const progressTone = item.completionRate >= 80
    ? "bg-emerald-400"
    : item.completionRate >= 40
      ? "bg-[var(--accent)]"
      : "bg-amber-400";
  const targetLabel = project.targetDate ? formatDateLabel(project.targetDate) : "No target";

  return (
    <article
      data-project-overview-card={project.id}
      className={`rounded-md border p-4 transition-[background-color,border-color,box-shadow] duration-150 ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[inset_0_0_0_1px_rgba(23,217,245,0.16)]"
          : "border-[var(--border)] bg-[var(--card-surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--foreground)]">{project.name}</h3>
            {isSelected ? (
              <span className="rounded border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--accent)]">
                Viewing tasks
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span>{project.department?.name || "Any department"}</span>
            <span>{PROJECT_STATUS_LABELS[project.status]}</span>
            <span>{targetLabel}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleProject(project.id)}
          className="motion-interactive inline-flex min-h-10 shrink-0 items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {isSelected ? "Clear view" : "View tasks"}
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Completion</span>
          <span className="font-semibold tabular-nums text-[var(--foreground)]">{item.completionRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
          <div className={`h-full rounded-full ${progressTone}`} style={{ width: `${item.completionRate}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <ProjectOverviewMetric label="Tasks" value={item.taskCount} />
        <ProjectOverviewMetric label="Open" value={item.openCount} />
        <ProjectOverviewMetric label="Done" value={item.completedCount} tone="success" />
        <ProjectOverviewMetric label="Review" value={item.reviewCount} />
        <ProjectOverviewMetric label="Overdue" value={item.overdueCount} tone={item.overdueCount > 0 ? "warning" : "default"} />
        <ProjectOverviewMetric label="Due Today" value={item.dueTodayCount} />
        <ProjectOverviewMetric label="Estimate" value={formatMinutes(item.estimatedMinutes)} />
        <ProjectOverviewMetric label="Remaining" value={formatMinutes(item.remainingMinutes)} />
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>Tracked {formatMinutes(Math.floor(item.trackedSeconds / 60))}</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          <span>Next due {formatDateLabel(item.nextDueDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className={item.targetOverdue ? "h-3.5 w-3.5 text-amber-300" : "h-3.5 w-3.5 text-[var(--muted)]"} aria-hidden="true" />
          <span>{item.targetOverdue ? "Target overdue" : `${item.highPriorityCount} high priority`}</span>
        </div>
      </div>

      {canManageAssignments ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
          {project.status !== "completed" ? (
            <button
              type="button"
              onClick={() => onProjectStatus(project, "completed")}
              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onProjectStatus(project, "active")}
              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Reopen
            </button>
          )}
          {project.status === "active" ? (
            <button
              type="button"
              onClick={() => onProjectStatus(project, "paused")}
              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
            >
              Pause
            </button>
          ) : project.status === "paused" ? (
            <button
              type="button"
              onClick={() => onProjectStatus(project, "active")}
              className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--card-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Resume
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
