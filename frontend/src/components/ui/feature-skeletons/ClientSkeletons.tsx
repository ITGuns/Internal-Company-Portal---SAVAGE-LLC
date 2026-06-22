"use client";

import {
  panelClass,
  ProductionMetricStripSkeleton,
  Skeleton,
  SkeletonCard,
  SkeletonPanelRows,
  SkeletonToolbar,
  surfacePanelClass,
  workspacePanelClass,
} from "@/components/ui/feature-skeletons/shared";

export function ClientPortalSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`space-y-5 animate-in fade-in duration-300 ${compact ? "" : "p-4 sm:p-6"}`} aria-busy="true" aria-live="polite" aria-label="Loading client workspace">
      {!compact ? <ProductionMetricStripSkeleton /> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${workspacePanelClass} min-h-[360px] overflow-hidden`}>
          <div className="flex min-h-16 items-center justify-between border-b border-[var(--workspace-ink-border)] px-4 py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
          </div>
          <div className="p-4">
            <Skeleton className="h-[220px] w-full rounded-[var(--radius-md)]" />
          </div>
        </section>
        <aside className="space-y-5">
          <section className={`${workspacePanelClass} p-4`}>
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={`${surfacePanelClass} p-3`}>
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-6 w-10" />
                </div>
              ))}
            </div>
          </section>
          <section className={`${workspacePanelClass} overflow-hidden`}>
            <div className="border-b border-[var(--workspace-ink-border)] px-4 py-3">
              <Skeleton className="h-5 w-36" />
            </div>
            <SkeletonPanelRows rows={3} />
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ClientTicketsSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Loading client tickets">
      <SkeletonToolbar align="split" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <section className={`${workspacePanelClass} overflow-hidden`}>
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--workspace-ink-border)] px-4 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)] sm:w-72" />
        </div>
        <SkeletonPanelRows rows={6} />
      </section>
    </div>
  );
}

export function ClientOperationsSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Loading client operations">
      <SkeletonToolbar align="split" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <Skeleton className="h-5 w-48" />
        </div>
        <SkeletonPanelRows rows={5} />
      </section>
      <ClientPortalSkeleton compact />
    </div>
  );
}

export function OperationsAccessSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Checking client operations access">
      <section className={`${panelClass} p-5`}>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-3 w-full max-w-xl" />
        <div className="mt-5">
          <SkeletonToolbar align="start" />
        </div>
      </section>
      <ClientOperationsSkeleton />
    </div>
  );
}
