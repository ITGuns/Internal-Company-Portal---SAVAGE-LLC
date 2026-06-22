"use client";

import {
  panelClass,
  Skeleton,
  surfacePanelClass,
} from "@/components/ui/feature-skeletons/shared";

export function TaskFocusSectionSkeleton() {
  return (
    <div aria-label="Loading task focus" aria-busy="true" aria-live="polite">
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
          <Skeleton className="mt-3 h-10 w-full max-w-md rounded-[var(--radius-md)]" />
        </div>
        <div className="grid gap-2 sm:grid-cols-5 xl:min-w-[34rem]">
          {Array.from({ length: 5 }).map((_, index) => (
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
    </div>
  );
}

export function TaskProjectCardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Loading task projects" aria-busy="true" aria-live="polite">
      {Array.from({ length: cards }).map((_, index) => (
        <article key={index} className={`${surfacePanelClass} min-h-[142px] p-3`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-16 rounded-[var(--radius-sm)]" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 w-20 rounded" />
            <Skeleton className="h-10 w-16 rounded" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TaskKanbanColumnsSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="overflow-x-auto chat-scroll pb-3" aria-label="Loading task board" aria-busy="true" aria-live="polite">
      <div className="flex min-w-max items-stretch gap-4">
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <div key={columnIndex} className="flex min-h-[28rem] w-[300px] flex-col">
            <div className={`${panelClass} flex min-h-[28rem] flex-col overflow-hidden`}>
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div className="max-h-[34rem] min-h-[20rem] flex-1 space-y-3 overflow-hidden bg-[var(--card-surface)] p-3">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <div key={cardIndex} className={`${panelClass} p-3`}>
                    <Skeleton className="h-4 w-40 max-w-full" />
                    <Skeleton className="mt-2 h-3 w-full" />
                    <Skeleton className="mt-3 h-2 w-full rounded-full" />
                    <div className="mt-3 flex justify-between gap-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskListRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading task list" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <article key={index} className={`${panelClass} grid min-h-[84px] gap-3 p-4 md:grid-cols-[minmax(0,1fr)_120px_100px] md:items-center`}>
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-3 w-2/3 max-w-sm" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
          <div className="flex gap-2 md:justify-end">
            <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
            <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TaskCalendarPanelSkeleton() {
  return (
    <div className={`${panelClass} overflow-hidden`} aria-label="Loading task calendar" aria-busy="true" aria-live="polite">
      <div className="grid gap-4 border-b border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${surfacePanelClass} p-3`}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-10" />
          </div>
        ))}
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
          <div key={index} className="min-h-[86px] border-r border-t border-[var(--border)] p-2 last:border-r-0">
            <Skeleton className="h-4 w-6" />
            {index % 4 === 0 ? <Skeleton className="mt-4 h-5 w-full rounded-full" /> : null}
            {index % 7 === 0 ? <Skeleton className="mt-2 h-5 w-2/3 rounded-full" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
