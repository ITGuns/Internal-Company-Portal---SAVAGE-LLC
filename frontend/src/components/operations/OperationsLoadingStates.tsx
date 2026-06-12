import { RefreshCw } from "lucide-react";
import Button from "@/components/Button";

type OperationsGridSkeletonVariant = "department" | "role";

const skeletonBlockClass = "animate-pulse rounded bg-[var(--surface-hover)]";
const skeletonCardClass = "rounded-lg border border-[var(--border)] bg-[var(--card-surface)] p-5";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`${skeletonBlockClass} ${className}`} />;
}

export function OperationsGridSkeleton({
  label,
  rows = 6,
  variant = "department",
}: {
  label: string;
  rows?: number;
  variant?: OperationsGridSkeletonVariant;
}) {
  const isRole = variant === "role";

  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <article key={index} className={`${skeletonCardClass} ${isRole ? "h-32" : "h-40"}`}>
            {isRole ? (
              <div className="flex h-full flex-col justify-between">
                <div className="space-y-3">
                  <SkeletonBlock className="h-5 w-2/3" />
                  <SkeletonBlock className="h-3 w-1/2" />
                </div>
                <div className="flex justify-end">
                  <SkeletonBlock className="h-10 w-10 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-5 w-32 max-w-full" />
                      <SkeletonBlock className="h-3 w-20" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                  <SkeletonBlock className="h-10 w-10 shrink-0 rounded" />
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function MembersPanelSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-live="polite" aria-label="Loading members">
      <span className="sr-only">Loading members</span>
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <SkeletonBlock className="h-5 w-28" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="relative w-full lg:max-w-sm">
          <SkeletonBlock className="h-10 w-full rounded-[var(--radius-md)]" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SkeletonBlock className="h-4 w-40 max-w-full" />
                  <SkeletonBlock className="h-5 w-20 rounded-full" />
                </div>
                <SkeletonBlock className="h-3 w-64 max-w-full" />
                <SkeletonBlock className="h-3 w-36 max-w-full" />
              </div>
              <div className="hidden flex-wrap justify-end gap-2 lg:flex">
                <SkeletonBlock className="h-7 w-28 rounded-full" />
                <SkeletonBlock className="h-7 w-24 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SkeletonBlock className="h-7 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-36 rounded-full" />
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-10 w-full rounded-[var(--radius-md)]" />
              </div>
              <SkeletonBlock className="h-10 w-28 rounded-[var(--radius-md)]" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

export function OperationsErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-5">
      <div className="text-sm font-semibold text-red-500">{title}</div>
      <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
      <Button className="mt-4" variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
