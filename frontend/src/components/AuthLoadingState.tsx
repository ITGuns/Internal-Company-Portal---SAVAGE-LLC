'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import { OperationsGridSkeleton } from './operations/OperationsLoadingStates';
import {
  AnnouncementSkeleton,
  DailyLogsSkeleton,
  DashboardSkeleton,
  PageSkeleton,
  Skeleton,
} from './ui/Skeleton';
import {
  PayrollCalendarBodySkeleton,
  TaskFocusSectionSkeleton,
  TaskListRowsSkeleton,
  TaskProjectCardsSkeleton,
} from './ui/FeatureSkeletons';

function OperationsRouteSkeleton() {
  return (
    <div className="mt-6" aria-busy="true" aria-live="polite">
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-20 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-24 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-20 rounded-[var(--radius-md)]" />
      </div>

      <div className="mb-6 flex gap-3">
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
      </div>

      <OperationsGridSkeleton label="Loading operations" variant="department" />
    </div>
  );
}

function getProtectedRouteLoading(pathname: string) {
  if (pathname === '/' || pathname === '/dashboard') {
    return {
      mainClassName: 'main-content-height bg-transparent text-[var(--foreground)]',
      contentClassName: 'mx-auto max-w-[1480px] p-4 pt-3 md:p-6',
      header: <Header />,
      body: <DashboardSkeleton />,
    };
  }

  if (pathname === '/task-tracking') {
    return {
      mainClassName: 'min-h-[calc(100dvh-112px)] overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]',
      contentClassName: 'motion-content-enter flex min-h-0 flex-col p-6 pt-0',
      header: <Header title="Task Tracking" subtitle="Track and manage tasks, assignments, and progress." />,
      body: (
        <div className="mt-6 flex flex-col gap-4 pb-8">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <TaskFocusSectionSkeleton />
          </section>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
              <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
            </div>
            <TaskProjectCardsSkeleton />
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-full rounded-full sm:ml-auto sm:w-48" />
            <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
          </div>
          <TaskListRowsSkeleton />
        </div>
      ),
    };
  }

  if (pathname === '/payroll-calendar') {
    return {
      mainClassName: 'main-content-height bg-[var(--background)] text-[var(--foreground)]',
      contentClassName: 'p-6 pt-0',
      header: <Header title="Payroll Calendar" subtitle="Track pay periods, deadlines, and holidays" />,
      body: (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-44 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
          </div>
          <PayrollCalendarBodySkeleton />
        </div>
      ),
    };
  }

  if (pathname === '/daily-logs') {
    return {
      mainClassName: 'main-content-height bg-[var(--background)] text-[var(--foreground)]',
      contentClassName: 'p-6 pt-3',
      header: <Header title="Daily Logs" subtitle="Track daily progress and team activities" />,
      body: <DailyLogsSkeleton />,
    };
  }

  if (pathname === '/announcements') {
    return {
      mainClassName: 'main-content-height bg-[var(--background)] text-[var(--foreground)]',
      contentClassName: 'p-6 pt-3',
      header: <Header title="Announcements & Shoutouts" subtitle="Stay updated with company news and celebrate achievements" />,
      body: <AnnouncementSkeleton />,
    };
  }

  if (pathname === '/operations' || pathname.startsWith('/operations/')) {
    return {
      mainClassName: 'main-content-height bg-[var(--background)] text-[var(--foreground)]',
      contentClassName: 'p-6 pt-0',
      header: <Header title="Operations" subtitle="Manage departments, members, and operational roles." />,
      body: <OperationsRouteSkeleton />,
    };
  }

  return {
    mainClassName: 'main-content-height bg-[var(--background)] text-[var(--foreground)]',
    contentClassName: 'p-6 pt-3',
    header: <Header />,
    body: <PageSkeleton cards={4} rows={5} />,
  };
}

export default function AuthLoadingState({ isPublicRoute }: { isPublicRoute: boolean }) {
  const pathname = usePathname() || '/dashboard';

  if (!isPublicRoute) {
    const routeLoading = getProtectedRouteLoading(pathname);

    return (
      <main
        className={routeLoading.mainClassName}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className={routeLoading.contentClassName}>
          {routeLoading.header}
          {routeLoading.body}
        </div>
      </main>
    );
  }

  const label = 'Preparing account access';

  return (
    <section
      className="flex min-h-[calc(100dvh-6rem)] items-center justify-center px-4 py-10 text-[var(--foreground)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-sm)]">
        <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--accent)] border-r-transparent" aria-hidden="true" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">{label}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">Loading the account form.</div>
        </div>
      </div>
    </section>
  );
}
