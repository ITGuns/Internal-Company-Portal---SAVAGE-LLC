"use client";

import React from 'react';
import { ChevronDown, ChevronRight, MessageSquarePlus, UserCog } from 'lucide-react';
import MemberAvatar from './MemberAvatar';
import styles from './org-chart.module.css';
import {
  NO_DEPARTMENT_LABEL,
  canContactMember,
  getMemberDisplayName,
  type OrgChartMember,
  type OrgChartNode,
} from '@/lib/org-chart';
import { cn } from '@/lib/utils';

export interface OrgChartTreeContext {
  viewerId: string;
  canEditReportingLines: boolean;
  isSearching: boolean;
  matchIds: Set<string>;
  collapsedIds: Set<string>;
  onToggle: (memberId: string) => void;
  onContact: (member: OrgChartMember) => void;
  onChangeManager: (member: OrgChartMember) => void;
}

const actionButtonClass =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 text-xs font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

function reportLabel(count: number): string {
  if (count === 0) return 'No reports';
  return `${count} report${count === 1 ? '' : 's'}`;
}

/** One member card plus, when expanded, the row (or indented list) of their reports. */
export default function OrgChartBranch({ node, context }: { node: OrgChartNode; context: OrgChartTreeContext }) {
  const { member, reports } = node;
  const name = getMemberDisplayName(member);
  const isMe = member.id === context.viewerId;
  const isMatch = context.matchIds.has(member.id);
  const hasReports = reports.length > 0;
  const expanded = hasReports && !context.collapsedIds.has(member.id);
  const reportsId = `org-reports-${member.id}`;

  return (
    <li className={styles.branch}>
      <article
        id={`org-node-${member.id}`}
        data-org-node={member.id}
        className={cn(
          'w-full rounded-[var(--radius-md)] border bg-[var(--card-bg)] p-3 shadow-[var(--shadow-sm)] transition-[opacity,box-shadow,border-color] duration-150 sm:w-60',
          isMe ? 'border-[var(--accent)]' : 'border-[var(--border)]',
          context.isSearching && (isMatch ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]' : 'opacity-60'),
        )}
      >
        <div className="flex items-start gap-3">
          <MemberAvatar person={member} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-2">
              <h3 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-[var(--foreground)]" title={name}>{name}</h3>
              {isMe ? (
                <span className="mt-0.5 shrink-0 rounded-[var(--radius-sm)] border border-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-[var(--accent)]">
                  Me
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-[var(--foreground)]" title={member.roleLabel}>{member.roleLabel}</p>
            <p className="truncate text-xs text-[var(--muted)]">{member.departmentName || NO_DEPARTMENT_LABEL}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
          {hasReports ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? reportsId : undefined}
              aria-label={`${expanded ? 'Hide' : 'Show'} ${reportLabel(member.directReportCount)} of ${name}`}
              onClick={() => context.onToggle(member.id)}
              className={cn(actionButtonClass, 'whitespace-nowrap border-transparent px-1.5 text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]')}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className="tabular-nums">{reportLabel(member.directReportCount)}</span>
            </button>
          ) : (
            <span className="whitespace-nowrap px-1.5 text-xs text-[var(--muted)]">{reportLabel(member.directReportCount)}</span>
          )}

          <div className="flex shrink-0 items-center gap-1">
            {canContactMember(member, context.viewerId) ? (
              <button
                type="button"
                onClick={() => context.onContact(member)}
                aria-label={`Contact ${name}`}
                className={cn(actionButtonClass, 'border-[var(--border)] bg-[var(--card-surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]')}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Contact
              </button>
            ) : null}
            {context.canEditReportingLines ? (
              <button
                type="button"
                onClick={() => context.onChangeManager(member)}
                aria-label={`Change manager for ${name}`}
                title="Change manager"
                className={cn(actionButtonClass, 'w-9 border-transparent px-0 text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]')}
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </article>

      {expanded ? (
        <ul id={reportsId} className={styles.children} aria-label={`Reports to ${name}`}>
          {reports.map((report) => (
            <OrgChartBranch key={report.member.id} node={report} context={context} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
