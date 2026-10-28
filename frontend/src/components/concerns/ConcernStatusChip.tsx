import React from 'react';
import { getConcernStatusLabel, getConcernStatusTone, type ConcernTone } from '@/lib/concerns';
import { cn } from '@/lib/utils';

const toneClasses: Record<ConcernTone, string> = {
  warning: 'border-[var(--priority-medium)] bg-[var(--priority-medium-bg)] text-[var(--priority-medium)]',
  success: 'border-[var(--status-completed)] bg-[var(--status-completed-bg)] text-[var(--status-completed)]',
  muted: 'border-[var(--border)] bg-[var(--card-surface)] text-[var(--muted)]',
};

export default function ConcernStatusChip({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-5',
        toneClasses[getConcernStatusTone(status)],
        className,
      )}
    >
      {getConcernStatusLabel(status)}
    </span>
  );
}
