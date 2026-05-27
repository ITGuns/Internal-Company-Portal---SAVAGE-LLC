"use client";

import React from "react";

interface ClientPortalPanelProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
}

export default function ClientPortalPanel({
  title,
  icon: Icon,
  children,
  count,
  action,
}: ClientPortalPanelProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof count !== "undefined" ? <span className="text-xs text-[var(--muted)]">{count}</span> : null}
          {action}
        </div>
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}
