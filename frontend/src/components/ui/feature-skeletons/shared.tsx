"use client";

import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export { Skeleton, SkeletonCard };

export const panelClass = "rounded-lg border border-[var(--border)] bg-[var(--card-bg)]";
export const surfacePanelClass = "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)]";
export const workspacePanelClass = "rounded-[var(--radius-md)] border border-[var(--workspace-ink-border)] bg-[var(--workspace-ink)] text-[var(--workspace-ink-foreground)]";

export function SkeletonToolbar({ align = "end" }: { align?: "start" | "end" | "split" }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${align === "end" ? "justify-end" : align === "split" ? "justify-between" : ""}`}>
      <Skeleton className="h-10 w-full rounded-[var(--radius-md)] sm:w-64" />
      <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
      <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
      <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
    </div>
  );
}

export function SkeletonPanelRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid min-h-[82px] gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_100px] md:items-center">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-3 w-2/3 max-w-xs" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
        </div>
      ))}
    </div>
  );
}

export function ProductionMetricStripSkeleton() {
  return (
    <section className={`${panelClass} overflow-hidden`}>
      <div className="p-5">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="mt-3 h-7 w-full max-w-xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 border-t border-[var(--border)] bg-[var(--card-surface)] p-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-full max-w-36" />
          </div>
        ))}
      </div>
    </section>
  );
}
