"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  /** Width - accepts Tailwind class or inline px/% */
  width?: string;
  /** Height - accepts Tailwind class or inline px/% */
  height?: string;
  /** Shape variant */
  variant?: "text" | "circular" | "rectangular";
}

/**
 * Animated placeholder that pulses while content loads.
 * Uses the app's CSS custom properties for consistent theming.
 */
export function Skeleton({ className = "", width, height, variant = "text" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-[var(--surface-hover)]";
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      aria-hidden="true"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

const panelClass = "rounded-lg border border-[var(--border)] bg-[var(--card-bg)]";
const surfacePanelClass = "rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)]";

/** Stat card skeleton that matches the dashboard metric cards. */
export function SkeletonCard() {
  return (
    <div className={`${panelClass} min-h-[120px] overflow-hidden p-4`}>
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-32 max-w-full" />
        </div>
        <div className={`${surfacePanelClass} h-10 w-10 shrink-0`} />
      </div>
    </div>
  );
}

/** Row skeleton that matches compact list/table rows. */
export function SkeletonRow() {
  return (
    <div className="flex min-h-[72px] items-center gap-3 px-4 py-3">
      <Skeleton variant="circular" className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 max-w-full" />
        <Skeleton className="h-3 w-1/2 max-w-full" />
      </div>
      <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
    </div>
  );
}

/** Generic content skeleton for pages that keep their real route header mounted. */
export function PageSkeleton({ cards = 4, rows = 5 }: { cards?: number; rows?: number }) {
  return (
    <div className="mt-6 space-y-5 animate-in fade-in duration-300" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)] sm:ml-auto sm:w-64" />
      </div>

      {cards > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : null}

      <section className={`${panelClass} overflow-hidden`}>
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52 max-w-full" />
          </div>
          <Skeleton className="hidden h-9 w-28 rounded-[var(--radius-md)] sm:block" />
        </div>
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Dashboard skeleton: hero, metrics, attention panel, and lower dashboard cards. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1480px] animate-in fade-in duration-300" aria-busy="true" aria-live="polite">
      <div className="mt-5 grid grid-cols-1 items-start gap-4 xl:mt-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className={`${panelClass} relative overflow-hidden p-5 md:p-6`}>
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--accent),var(--accent-secondary))]" />
            <Skeleton className="h-7 w-44 rounded-[var(--radius-sm)]" />
            <Skeleton className="mt-4 h-9 w-full max-w-xl" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
            <Skeleton className="mt-2 h-4 w-2/3 max-w-lg" />
            <div className="mt-5 hidden justify-end sm:flex">
              <Skeleton className="h-12 w-64 rounded-[var(--radius-md)]" />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>

        <section className={`${panelClass} overflow-hidden`}>
          <div className="flex min-h-16 items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className={`${surfacePanelClass} flex min-h-[76px] items-start gap-3 p-3`}>
                <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="mt-1 h-4 w-4 shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <div className="space-y-4">
          <section className={`${panelClass} flex h-[400px] flex-col overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex-1 space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Skeleton variant="circular" className="h-7 w-7 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-3/4 rounded-[var(--radius-md)]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border)] p-3">
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className={`${panelClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="flex min-h-[136px] items-center justify-center bg-[var(--card-surface)] p-8">
              <Skeleton className="h-12 w-12 rounded-[var(--radius-md)]" />
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <section key={index} className={`${panelClass} overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <div className="grid gap-3 p-4">
                  {Array.from({ length: 2 }).map((_, rowIndex) => (
                    <div key={rowIndex} className={`${surfacePanelClass} min-h-[86px] p-3`}>
                      <Skeleton className="h-4 w-40 max-w-full" />
                      <Skeleton className="mt-2 h-3 w-full" />
                      <Skeleton className="mt-2 h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Task tracking skeleton: focus card, action toolbar, and default list rows. */
export function TaskBoardSkeleton({ includeHeader = true }: { includeHeader?: boolean } = {}) {
  return (
    <div className={`${includeHeader ? "p-6 pt-0 " : ""}space-y-4 animate-in fade-in duration-300`} aria-busy="true" aria-live="polite">
      {includeHeader ? (
        <div className="space-y-2" data-skeleton-region="task-board-header">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      ) : null}

      <section className={`${panelClass} p-4`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-full max-w-lg" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[28rem]">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={`${surfacePanelClass} px-3 py-2`}>
                <Skeleton className="h-3 w-14" />
                <Skeleton className="mt-2 h-7 w-8" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-full rounded-full sm:ml-auto sm:w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
        </div>
      </div>

      <section className={`${panelClass} min-h-0 overflow-hidden`}>
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid min-h-[84px] gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_160px_120px_120px] md:items-center">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-3 w-2/3 max-w-sm" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
              <div className="flex gap-2 md:justify-end">
                <Skeleton variant="circular" className="h-8 w-8" />
                <Skeleton variant="circular" className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Announcement feed skeleton matching the category cards, tabs, and post cards. */
export function AnnouncementSkeleton() {
  return (
    <div className="mt-6 space-y-6 animate-in fade-in duration-300" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${panelClass} p-4 text-center`}>
              <Skeleton className="mx-auto h-12 w-12 rounded-lg" />
              <Skeleton className="mx-auto mt-3 h-4 w-28" />
              <Skeleton className="mx-auto mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)] xl:w-44" />
      </div>

      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 rounded-b-none rounded-t-[var(--radius-md)]" />
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className={`${panelClass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
            </div>
            <Skeleton className="mt-4 h-5 w-full max-w-xl" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--border)] pt-3">
              <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
              <Skeleton className="h-8 w-24 rounded-[var(--radius-md)]" />
              <Skeleton className="h-8 w-28 rounded-[var(--radius-md)]" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/** Daily logs skeleton matching the summary box, filter sidebar, and log cards. */
export function DailyLogsSkeleton() {
  return (
    <div className="mt-6 space-y-6 animate-in fade-in duration-300" aria-busy="true" aria-live="polite">
      <section className={`${panelClass} p-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
            <Skeleton className="mt-2 h-4 w-2/3 max-w-lg" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={`${surfacePanelClass} px-3 py-2`}>
              <Skeleton className="h-3 w-20" />
              <div className="mt-2 flex items-end justify-between gap-3">
                <Skeleton className="h-8 w-10" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className={`${panelClass} order-2 space-y-4 p-4 lg:order-1`}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-14 rounded-[var(--radius-md)]" />
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-4">
            <Skeleton className="h-4 w-24" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex justify-between gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="order-1 min-w-0 space-y-4 lg:order-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <article key={index} className={`${panelClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 max-w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
                  <Skeleton className="h-8 w-20 rounded-[var(--radius-md)]" />
                  <Skeleton className="h-8 w-24 rounded-[var(--radius-md)]" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
