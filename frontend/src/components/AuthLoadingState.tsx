'use client';

import { PageSkeleton } from './ui/Skeleton';

export default function AuthLoadingState({ isPublicRoute }: { isPublicRoute: boolean }) {
  if (!isPublicRoute) {
    return (
      <main
        className="min-h-[100dvh] bg-transparent p-4 text-[var(--foreground)] md:p-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="mx-auto max-w-[1480px]">
          <header className="mb-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)]/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur md:p-5">
            <div className="text-base font-semibold tracking-tight md:text-xl">Preparing account access</div>
            <p className="mt-1 text-sm text-[var(--muted)]">Checking your session and permissions before loading the workspace.</p>
          </header>
          <PageSkeleton cards={4} rows={5} />
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
