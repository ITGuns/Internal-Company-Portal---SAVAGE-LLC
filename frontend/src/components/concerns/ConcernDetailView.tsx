"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, CheckCircle2, RotateCcw, Shuffle } from 'lucide-react';
import Button from '@/components/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ToastProvider';
import MemberAvatar from '@/components/org-chart/MemberAvatar';
import ConcernStatusChip from './ConcernStatusChip';
import ConcernThread from './ConcernThread';
import ReassignDialog from './ReassignDialog';
import { useUser } from '@/contexts/UserContext';
import { APP_CONFIG } from '@/lib/config';
import { getFallbackListQueryOptions } from '@/lib/realtime-fallback';
import {
  BODY_MAX_LENGTH,
  CONCERNS_INBOX_OPEN_KEY,
  CONCERNS_LIST_KEY,
  concernDetailKey,
  fetchConcern,
  formatConcernDateTime,
  getConcernNextStep,
  getPersonName,
  isConcernUnavailableError,
  reassignConcern,
  replyToConcern,
  setConcernClosed,
  validateReply,
  type ConcernDetail,
} from '@/lib/concerns';

const DETAIL_REFRESH = getFallbackListQueryOptions(APP_CONFIG.enableRealtime, APP_CONFIG.listPollInterval);

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/** Who hears about a reply, from the writer's side. */
function replyAudience(concern: ConcernDetail, viewerId: string): string {
  if (viewerId === concern.assignee.id) return `${getPersonName(concern.requester)} gets a notification.`;
  if (viewerId === concern.requester.id) return `${getPersonName(concern.assignee)} gets a notification.`;
  return 'Both people on this concern get a notification.';
}

function BackLink() {
  return (
    <Link href="/concerns" className="inline-flex min-h-10 items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      All concerns
    </Link>
  );
}

export default function ConcernDetailView({ id }: { id: string }) {
  const { user } = useUser();
  const viewerId = user?.id != null ? String(user.id) : '';
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const concernQuery = useQuery({
    ...DETAIL_REFRESH,
    queryKey: concernDetailKey(id),
    queryFn: () => fetchConcern(id),
    enabled: Boolean(user) && Boolean(id),
    retry: (failureCount, error) => !isConcernUnavailableError(error) && failureCount < 1,
  });
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState('');
  const [busy, setBusy] = useState<'reply' | 'close' | 'reopen' | null>(null);
  const [showReassign, setShowReassign] = useState(false);

  function refreshLists() {
    void queryClient.invalidateQueries({ queryKey: CONCERNS_LIST_KEY });
    void queryClient.invalidateQueries({ queryKey: CONCERNS_INBOX_OPEN_KEY });
  }

  function applyDetail(detail: ConcernDetail) {
    queryClient.setQueryData(concernDetailKey(id), detail);
    refreshLists();
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateReply(reply);
    if (problem) {
      setReplyError(problem);
      return;
    }
    setReplyError('');
    setBusy('reply');
    try {
      applyDetail(await replyToConcern(id, reply.trim()));
      setReply('');
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Could not send the reply. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function changeClosed(closed: boolean) {
    setBusy(closed ? 'close' : 'reopen');
    try {
      applyDetail(await setConcernClosed(id, closed));
      toast.success(closed ? 'Concern closed' : 'Concern reopened');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the concern. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handOn(assigneeId: string) {
    const result = await reassignConcern(id, assigneeId);
    if (result.canView) {
      applyDetail(result);
      toast.success(`Reassigned to ${getPersonName(result.assignee)}`);
      return;
    }
    refreshLists();
    queryClient.removeQueries({ queryKey: concernDetailKey(id) });
    toast.success(`Handed to ${getPersonName(result.assignee)}`, 'It has left your inbox.');
    router.push('/concerns');
  }

  if (concernQuery.isPending) {
    return (
      <div className="space-y-4">
        <BackLink />
        <DetailSkeleton />
      </div>
    );
  }

  if (concernQuery.isError) {
    const unavailable = isConcernUnavailableError(concernQuery.error);
    return (
      <div className="space-y-4">
        <BackLink />
        <div role="alert" className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-blocked)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{unavailable ? 'Concern not found or access denied' : 'Could not load this concern'}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {unavailable
                ? 'It may have been handed to someone else, or it belongs to other people. Only the person who raised it, its assignee and admins can open it.'
                : concernQuery.error.message}
            </p>
            {!unavailable ? (
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => void concernQuery.refetch()}>Try again</Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const concern = concernQuery.data;
  const { permissions } = concern;
  const isClosed = concern.status === 'closed';

  return (
    <div className="space-y-4">
      <BackLink />

      <section aria-labelledby="concern-title" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs tabular-nums text-[var(--muted)]">Concern #{concern.number}</p>
            <h2 id="concern-title" className="mt-1 break-words text-lg font-semibold text-[var(--foreground)]">{concern.subject}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <ConcernStatusChip status={concern.status} />
              <span className="text-[var(--foreground)]">{getConcernNextStep(concern, viewerId)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canReassign ? (
              <Button variant="secondary" size="sm" icon={<Shuffle className="h-4 w-4" aria-hidden="true" />} onClick={() => setShowReassign(true)} disabled={busy !== null}>
                Reassign
              </Button>
            ) : null}
            {permissions.canClose ? (
              <Button variant="outline" size="sm" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} onClick={() => void changeClosed(true)} loading={busy === 'close'} disabled={busy !== null}>
                Close concern
              </Button>
            ) : null}
            {permissions.canReopen ? (
              <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />} onClick={() => void changeClosed(false)} loading={busy === 'reopen'} disabled={busy !== null}>
                Reopen
              </Button>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-3">
          {[
            { label: 'Raised by', person: concern.requester },
            { label: 'Assigned to', person: concern.assignee },
          ].map(({ label, person }) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-[var(--muted)]">{label}</dt>
              <dd className="mt-1 flex min-w-0 items-center gap-2">
                <MemberAvatar person={person} size="sm" />
                <span className="truncate font-medium">{getPersonName(person)}{person.id === viewerId ? ' (you)' : ''}</span>
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-[var(--muted)]">Opened</dt>
            <dd className="mt-1 tabular-nums">{formatConcernDateTime(concern.createdAt)}</dd>
            {concern.closedAt ? <dd className="text-xs tabular-nums text-[var(--muted)]">Closed {formatConcernDateTime(concern.closedAt)}</dd> : null}
          </div>
        </dl>
      </section>

      <ConcernThread concern={concern} viewerId={viewerId} />

      {isClosed ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--muted)]">
          This concern is closed. {permissions.canReopen ? 'Reopen it to reply.' : 'The people on it can reopen it.'}
        </p>
      ) : permissions.canReply ? (
        <form onSubmit={sendReply} noValidate className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
          <label htmlFor="concern-reply" className="mb-1.5 block text-sm font-medium">Reply</label>
          <textarea
            id="concern-reply"
            name="reply"
            rows={4}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={BODY_MAX_LENGTH}
            placeholder="Write your reply"
            aria-invalid={Boolean(replyError) || undefined}
            aria-describedby="concern-reply-note"
            className={`w-full resize-y rounded-[var(--radius-md)] border bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${replyError ? 'border-[var(--status-blocked)]' : 'border-[var(--border)]'}`}
          />
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p id="concern-reply-note" role={replyError ? 'alert' : undefined} className={`text-xs ${replyError ? 'text-[var(--status-blocked)]' : 'text-[var(--muted)]'}`}>
              {replyError || `${reply.trim().length}/${BODY_MAX_LENGTH}. ${replyAudience(concern, viewerId)}`}
            </p>
            <Button type="submit" loading={busy === 'reply'} disabled={busy !== null}>Send reply</Button>
          </div>
        </form>
      ) : null}

      {showReassign ? <ReassignDialog concern={concern} onClose={() => setShowReassign(false)} onReassign={handOn} /> : null}
    </div>
  );
}
