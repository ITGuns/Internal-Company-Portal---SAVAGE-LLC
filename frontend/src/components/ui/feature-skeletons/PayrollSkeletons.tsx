"use client";

import {
  panelClass,
  Skeleton,
  SkeletonPanelRows,
  surfacePanelClass,
} from "@/components/ui/feature-skeletons/shared";

export function PayrollCalendarBodySkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading payroll calendar data" aria-busy="true" aria-live="polite">
      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="mt-3 h-6 w-full max-w-md" />
            <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-2">
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-16 rounded-[var(--radius-md)]" />
          </div>
        </div>
        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 bg-[var(--card-surface)] px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className={`${panelClass} min-h-[632px] p-3 sm:p-4 lg:col-span-2`}>
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="p-3">
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="min-h-[92px] border-r border-t border-[var(--border)] p-2 last:border-r-0">
                <Skeleton className="h-4 w-6" />
                {index % 5 === 0 ? <Skeleton className="mt-4 h-5 w-full rounded-full" /> : null}
                {index % 8 === 0 ? <Skeleton className="mt-2 h-5 w-2/3 rounded-full" /> : null}
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-4">
          <div className={`${surfacePanelClass} p-4`}>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-3 h-9 w-full rounded-[var(--radius-md)]" />
            <Skeleton className="mt-2 h-9 w-full rounded-[var(--radius-md)]" />
          </div>
          <div className={`${surfacePanelClass} p-4`}>
            <Skeleton className="h-5 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-[var(--radius-md)]" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PayrollEmployeesSectionSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading employee payroll overview" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${panelClass} min-h-[112px] p-4`}>
            <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
            <Skeleton className="mt-4 h-4 w-28" />
            <Skeleton className="mt-2 h-7 w-14" />
          </div>
        ))}
      </div>
      <section className={`${panelClass} overflow-hidden`}>
        <SkeletonPanelRows rows={6} />
      </section>
    </div>
  );
}

export function PayrollPayslipsManagementSkeleton() {
  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_320px]" aria-label="Loading payroll management data" aria-busy="true" aria-live="polite">
      <aside className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-[var(--border)] p-4">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="border-b border-[var(--border)] p-4">
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
        </div>
        <SkeletonPanelRows rows={5} />
      </aside>
      <section className={`${panelClass} p-5`}>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[var(--radius-md)]" />
          ))}
        </div>
      </section>
      <aside className={`${panelClass} p-5`}>
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-[var(--radius-md)]" />
          ))}
        </div>
      </aside>
    </div>
  );
}

export function PayrollSchedulerRunsSkeleton() {
  return (
    <div className={`${panelClass} overflow-hidden`} aria-label="Loading payroll job runs" aria-busy="true" aria-live="polite">
      <SkeletonPanelRows rows={5} />
    </div>
  );
}
