"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  BarChart3,
  FolderKanban,
  ListChecks,
  X,
} from "lucide-react";
import ProjectAnalyticsCard from "@/components/tasks/ProjectAnalyticsCard";
import ProjectOverviewMetric from "@/components/tasks/ProjectOverviewMetric";
import {
  buildTaskProjectAnalytics,
  summarizeTaskProjectAnalytics,
} from "@/lib/task-project-analytics";
import type { Task, TaskProject, TaskProjectStatus } from "@/lib/tasks";

interface ProjectOverviewModalProps {
  isOpen: boolean;
  projects: TaskProject[];
  tasks: Task[];
  todayStr: string;
  filterProjectId: string;
  canManageAssignments: boolean;
  onClose: () => void;
  onToggleProject: (projectId: string) => void;
  onProjectStatus: (project: TaskProject, status: TaskProjectStatus) => void;
}

const MAX_PROJECTS_IN_OVERVIEW = 48;

export default function ProjectOverviewModal({
  isOpen,
  projects,
  tasks,
  todayStr,
  filterProjectId,
  canManageAssignments,
  onClose,
  onToggleProject,
  onProjectStatus,
}: ProjectOverviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const analytics = useMemo(
    () => buildTaskProjectAnalytics(projects, tasks, todayStr),
    [projects, tasks, todayStr],
  );
  const summary = useMemo(() => summarizeTaskProjectAnalytics(analytics), [analytics]);
  const displayedAnalytics = analytics.slice(0, MAX_PROJECTS_IN_OVERVIEW);
  const hiddenProjectCount = Math.max(0, analytics.length - displayedAnalytics.length);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 left-0 right-0 z-[9998] flex items-start justify-center px-4 py-6 md:left-64"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-overview-title"
      data-project-overview-dialog
    >
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-[var(--scrim)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close project overview"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--accent)]">
              <FolderKanban className="h-4 w-4" aria-hidden="true" />
              Project Command View
            </div>
            <h2 id="project-overview-title" className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              Project Overview
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              Active projects, task load, delivery risk, and progress in one expanded view.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="motion-interactive inline-flex min-h-10 items-center justify-center rounded border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close project overview"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--card-surface)]/45 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <ProjectOverviewMetric label="Projects" value={summary.totalProjects} />
          <ProjectOverviewMetric label="Active" value={summary.activeProjects} />
          <ProjectOverviewMetric label="Open Tasks" value={summary.openTasks} />
          <ProjectOverviewMetric label="Avg Complete" value={`${summary.averageCompletionRate}%`} tone="success" />
          <ProjectOverviewMetric label="Paused" value={summary.pausedProjects} />
          <ProjectOverviewMetric label="Completed" value={summary.completedProjects} tone="success" />
          <ProjectOverviewMetric label="Overdue" value={summary.overdueTasks} tone={summary.overdueTasks > 0 ? "warning" : "default"} />
          <ProjectOverviewMetric label="Due Today" value={summary.dueTodayTasks} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 chat-scroll overscroll-contain">
          {projects.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--card-surface)] p-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-[var(--muted)]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">No Projects Yet</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">Create a project to see delivery analytics here.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                  <span>
                    Showing {displayedAnalytics.length} of {analytics.length} project{analytics.length === 1 ? "" : "s"}
                  </span>
                </div>
                {hiddenProjectCount > 0 ? (
                  <span>{hiddenProjectCount} more hidden for performance</span>
                ) : null}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {displayedAnalytics.map((item) => (
                  <ProjectAnalyticsCard
                    key={item.project.id}
                    item={item}
                    isSelected={filterProjectId === item.project.id}
                    canManageAssignments={canManageAssignments}
                    onToggleProject={onToggleProject}
                    onProjectStatus={onProjectStatus}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
