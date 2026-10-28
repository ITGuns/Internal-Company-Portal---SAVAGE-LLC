import React from 'react';
import Link from 'next/link';
import { ChevronRight, Lock, MessageSquare } from 'lucide-react';
import MemberAvatar from '@/components/org-chart/MemberAvatar';
import ConcernStatusChip from './ConcernStatusChip';
import {
  canOpenConcern,
  formatConcernDateTime,
  formatConcernTime,
  getConcernNextStep,
  getPersonName,
  type ConcernBox,
  type ConcernListViewer,
  type ConcernSummary,
} from '@/lib/concerns';

function peopleLine(concern: ConcernSummary, box: ConcernBox): { person: ConcernSummary['assignee']; text: string } {
  if (box === 'inbox') return { person: concern.requester, text: `From ${getPersonName(concern.requester)}` };
  if (box === 'sent') return { person: concern.assignee, text: `To ${getPersonName(concern.assignee)}` };
  return {
    person: concern.requester,
    text: `${getPersonName(concern.requester)} to ${getPersonName(concern.assignee)}`,
  };
}

const rowClass =
  'flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 sm:p-4';

/** One concern in a list. Rows the viewer cannot open (the All box) are shown without a link. */
export default function ConcernRow({ concern, box, viewer }: { concern: ConcernSummary; box: ConcernBox; viewer: ConcernListViewer }) {
  const { person, text } = peopleLine(concern, box);
  const openable = canOpenConcern(concern, viewer);

  const content = (
    <>
      <MemberAvatar person={person} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-semibold text-[var(--foreground)]">
            <span className="mr-2 font-mono text-xs font-normal tabular-nums text-[var(--muted)]">#{concern.number}</span>
            <span className="break-words">{concern.subject}</span>
          </p>
          <time
            dateTime={concern.updatedAt}
            title={`Updated ${formatConcernDateTime(concern.updatedAt)}`}
            className="shrink-0 text-xs tabular-nums text-[var(--muted)]"
          >
            {formatConcernTime(concern.updatedAt)}
          </time>
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[var(--muted)]">
          <ConcernStatusChip status={concern.status} />
          <span className="text-[var(--foreground)]">{getConcernNextStep(concern, viewer.id)}</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {concern.messageCount} message{concern.messageCount === 1 ? '' : 's'}
          </span>
          {!openable ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Only the two people on it and admins can open it
            </span>
          ) : null}
        </div>
      </div>
      {openable ? <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" /> : null}
    </>
  );

  if (!openable) return <div className={rowClass}>{content}</div>;

  return (
    <Link
      href={`/concerns/${concern.id}`}
      className={`${rowClass} motion-interactive hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]`}
    >
      {content}
    </Link>
  );
}
