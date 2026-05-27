"use client";

import React from "react";

export const clientOperationsSelectClass = "w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
export const clientOperationsTextareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export default function ClientOperationsPanel({
  children,
  icon: Icon,
  title,
  count,
  action,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number | string;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof count !== "undefined" ? <span className="text-xs text-[var(--muted)]">{count}</span> : null}
          {action}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ProjectPillSelector({
  projects,
  value,
  onChange,
}: {
  projects: Array<{ id: string; name: string }>;
  value: string;
  onChange: (projectId: string) => void;
}) {
  if (projects.length === 0) return null;

  const options = [{ id: "", name: "General" }, ...projects.map((project) => ({ id: project.id, name: project.name }))];

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Project</div>
      <div className="flex flex-wrap gap-2">
        {options.map((project) => {
          const isSelected = value === project.id;

          return (
            <button
              key={project.id || "general"}
              type="button"
              onClick={() => onChange(project.id)}
              aria-pressed={isSelected}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isSelected ? "border-[var(--accent)] bg-[var(--card-surface)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"}`}
            >
              {project.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
