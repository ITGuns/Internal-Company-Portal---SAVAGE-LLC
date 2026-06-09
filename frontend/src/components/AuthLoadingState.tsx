'use client';

import Header from './Header';
import { PageSkeleton } from './ui/Skeleton';

export default function AuthLoadingState({ isPublicRoute }: { isPublicRoute: boolean }) {
  if (!isPublicRoute) {
    return (
      <main className="main-content-height bg-transparent text-[var(--foreground)]">
        <div className="p-6 pt-3">
          <Header />
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
