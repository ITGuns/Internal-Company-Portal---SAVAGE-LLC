"use client";

import {
  panelClass,
  Skeleton,
  SkeletonCard,
  SkeletonPanelRows,
  SkeletonToolbar,
  surfacePanelClass,
} from "@/components/ui/feature-skeletons/shared";

export function ChatWorkspaceSkeleton() {
  return (
    <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 overflow-hidden border-y border-[var(--border)] bg-[var(--background)] md:grid-cols-[290px_minmax(0,1fr)]" aria-busy="true" aria-live="polite" aria-label="Loading chat workspace">
      <aside className="hidden border-r border-[var(--border)] bg-[var(--card-bg)] p-4 md:block">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
        </div>
        <div className="mt-5 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={`${surfacePanelClass} flex min-h-12 items-center gap-3 p-3`}>
              <Skeleton variant="circular" className="h-8 w-8 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-h-[520px] flex-col bg-[var(--background)]">
        <div className="flex min-h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card-surface)] px-4">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        </div>
        <div className="flex-1 space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={`flex ${index % 2 ? "justify-end" : "justify-start"}`}>
              <div className={`min-w-0 max-w-[72%] space-y-2 rounded-[var(--radius-lg)] border border-[var(--border)] p-3 ${index % 2 ? "bg-[var(--accent)]/15" : "bg-[var(--card-bg)]"}`}>
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--card-surface)] p-4">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </section>
    </div>
  );
}

export function FileDirectorySkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  return (
    <section className="mt-6 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Loading file directory">
      {viewMode === "list" ? (
        <div className={`${panelClass} overflow-hidden`}>
          <SkeletonPanelRows rows={7} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className={`${panelClass} min-h-[150px] p-4`}>
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-[var(--radius-md)]" />
                <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
              </div>
              <Skeleton className="mt-5 h-5 w-40 max-w-full" />
              <Skeleton className="mt-2 h-3 w-28" />
              <div className="mt-6 flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-4 w-14" />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function PayslipSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Loading payslips">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex min-h-16 items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="hidden h-10 w-32 rounded-[var(--radius-md)] sm:block" />
        </div>
        <SkeletonPanelRows rows={5} />
      </section>
    </div>
  );
}

export function PayrollCalendarSkeleton() {
  return (
    <div className="mt-6 space-y-5 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Loading payroll calendar">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-32 rounded-[var(--radius-md)]" />
        ))}
      </div>
      <section className={`${panelClass} p-4`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)_minmax(220px,0.45fr)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className={`h-4 ${index === 0 ? "w-28" : "w-20"}`} />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <Skeleton className="h-6 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
              <Skeleton className="h-10 w-20 rounded-[var(--radius-md)]" />
              <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--card-surface)]">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="border-r border-[var(--border)] p-3 last:border-r-0">
                <Skeleton className="h-3 w-12 max-w-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="min-h-[90px] border-r border-t border-[var(--border)] p-2 last:border-r-0">
                <Skeleton className="h-4 w-6" />
                {index % 3 === 0 ? <Skeleton className="mt-4 h-5 w-full rounded-full" /> : null}
                {index % 5 === 0 ? <Skeleton className="mt-2 h-5 w-3/4 rounded-full" /> : null}
              </div>
            ))}
          </div>
        </section>
        <aside className={`${panelClass} h-fit p-4`}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48 max-w-full" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${surfacePanelClass} p-3`}>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-6 w-10" />
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={`${surfacePanelClass} p-3`}>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function PayrollReportsSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300" aria-busy="true" aria-live="polite" aria-label="Loading payroll reports">
      <SkeletonToolbar align="split" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
          </div>
          <div className="p-4">
            <Skeleton className="h-[260px] w-full rounded-[var(--radius-md)]" />
          </div>
        </section>
        <aside className={`${panelClass} h-fit p-4`}>
          <Skeleton className="h-5 w-36" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${surfacePanelClass} p-3`}>
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        </aside>
      </div>
      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-[var(--border)] px-4 py-3">
          <Skeleton className="h-5 w-40" />
        </div>
        <SkeletonPanelRows rows={5} />
      </section>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mt-6 grid max-w-6xl gap-6 animate-in fade-in duration-300 xl:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]" aria-busy="true" aria-live="polite" aria-label="Loading profile">
      <section className={`${panelClass} p-6`}>
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          <Skeleton variant="circular" className="h-32 w-32 shrink-0" />
          <div className="w-full min-w-0 flex-1 space-y-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-full max-w-md" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <aside className={`${panelClass} h-fit p-6`}>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-3 w-52 max-w-full" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${surfacePanelClass} p-4`}>
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
