import React from 'react';
import MemberAvatar from '@/components/org-chart/MemberAvatar';
import { formatConcernDateTime, getPersonName, type ConcernDetail } from '@/lib/concerns';
import { cn } from '@/lib/utils';

/** The conversation, oldest first. The viewer's own messages carry an accent edge. */
export default function ConcernThread({ concern, viewerId }: { concern: ConcernDetail; viewerId: string }) {
  return (
    <ol className="space-y-3" aria-label="Conversation">
      {concern.messages.map((message) => {
        const isMine = message.author.id === viewerId;
        // No badge for anyone else (an admin, or a supervisor it was handed on from).
        const role = message.author.id === concern.requester.id
          ? 'Raised it'
          : message.author.id === concern.assignee.id
            ? 'Assignee'
            : null;
        return (
          <li key={message.id}>
            <article
              className={cn(
                'rounded-[var(--radius-md)] border bg-[var(--card-bg)] p-3 sm:p-4',
                isMine ? 'border-[var(--border)] border-l-2 border-l-[var(--accent)]' : 'border-[var(--border)]',
              )}
            >
              <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <MemberAvatar person={message.author} size="sm" />
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {getPersonName(message.author)}
                  {isMine ? <span className="font-normal text-[var(--muted)]"> (you)</span> : null}
                </span>
                {role ? (
                  <span className="rounded-[var(--radius-sm)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase leading-none text-[var(--muted)]">
                    {role}
                  </span>
                ) : null}
                <time dateTime={message.createdAt} className="ml-auto text-xs tabular-nums text-[var(--muted)]">
                  {formatConcernDateTime(message.createdAt)}
                </time>
              </header>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--foreground)]">{message.body}</p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
