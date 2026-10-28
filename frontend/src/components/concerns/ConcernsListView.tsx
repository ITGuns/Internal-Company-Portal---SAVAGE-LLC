"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, Inbox, Plus, Search, Send } from 'lucide-react';
import Button from '@/components/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import ConcernRow from './ConcernRow';
import NewConcernDialog from './NewConcernDialog';
import { useUser } from '@/contexts/UserContext';
import { APP_CONFIG } from '@/lib/config';
import { getFallbackListQueryOptions } from '@/lib/realtime-fallback';
import { hasFullAccess } from '@/lib/role-access';
import {
  CONCERN_STATUSES,
  buildConcernsQuery,
  concernListKey,
  fetchConcerns,
  getConcernStatusLabel,
  parseConcernBox,
  parseConcernStatus,
  type ConcernBox,
  type ConcernFilters,
  type ConcernStatus,
} from '@/lib/concerns';
import { cn } from '@/lib/utils';

const LIST_REFRESH = getFallbackListQueryOptions(APP_CONFIG.enableRealtime, APP_CONFIG.listPollInterval);
const BOX_LABELS: Record<ConcernBox, string> = { inbox: 'Inbox', sent: 'Sent', all: 'All' };

function hrefFor(pathname: string, filters: Partial<ConcernFilters>) {
  const query = buildConcernsQuery(filters);
  return query ? `${pathname}?${query}` : pathname;
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <Skeleton className="h-4 w-2/3 max-w-full" />
          <Skeleton className="mt-2 h-3 w-1/3" />
          <Skeleton className="mt-3 h-5 w-48" />
        </div>
      ))}
    </div>
  );
}

export default function ConcernsListView() {
  const router = useRouter();
  const pathname = usePathname() || '/concerns';
  const searchParams = useSearchParams();
  const { user } = useUser();
  // The All box is full access only, like the API (canListAllTickets, review fix 2026-10-28).
  const canSeeAll = hasFullAccess(user);
  const box = parseConcernBox(searchParams.get('box'));
  const status = parseConcernStatus(searchParams.get('status'));
  const urlQuery = (searchParams.get('q') || '').trim();
  const filters: ConcernFilters = { box, status, q: urlQuery };
  const [searchText, setSearchText] = useState(urlQuery);
  const [showNewConcern, setShowNewConcern] = useState(false);

  // Search lands in the URL (and the request) once typing pauses.
  useEffect(() => {
    if (searchText.trim() === urlQuery) return;
    const timer = setTimeout(() => {
      router.replace(hrefFor(pathname, { box, status, q: searchText }), { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [box, pathname, router, searchText, status, urlQuery]);

  const list = useQuery({
    ...LIST_REFRESH,
    queryKey: concernListKey(filters),
    queryFn: () => fetchConcerns(filters),
    enabled: Boolean(user),
    placeholderData: keepPreviousData,
  });

  const boxes: ConcernBox[] = canSeeAll ? ['inbox', 'sent', 'all'] : ['inbox', 'sent'];
  const counts = list.data?.counts;
  const totalInBox = counts ? counts.open + counts.answered + counts.closed : null;
  const isFiltered = Boolean(status || urlQuery);
  const chipClass = (active: boolean) => cn(
    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-[border-color,color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
    active
      ? 'border-[var(--accent)] bg-[var(--card-surface)] font-medium text-[var(--foreground)]'
      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)]',
  );

  function renderEmpty() {
    if (isFiltered) {
      return (
        <EmptyState
          icon={Search}
          title="No concerns match these filters"
          description="Try another word from the subject, or show every status."
          actionLabel="Clear filters"
          onAction={() => {
            setSearchText('');
            router.replace(hrefFor(pathname, { box }), { scroll: false });
          }}
        />
      );
    }
    if (box === 'inbox') {
      return <EmptyState icon={Inbox} title="Your inbox is clear" description="Concerns people send you show up here, and you get a notification for each one." />;
    }
    if (box === 'sent') {
      return (
        <EmptyState
          icon={Send}
          title="You have not raised a concern yet"
          description="Use Contact on a supervisor in the org chart, or start one here."
          actionLabel="New concern"
          onAction={() => setShowNewConcern(true)}
        />
      );
    }
    return <EmptyState icon={Inbox} title="No concerns yet" description="Concerns raised by anyone in the company show up here." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Concern boxes" className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-1">
          {boxes.map((option) => (
            <Link
              key={option}
              href={hrefFor(pathname, { box: option, status, q: urlQuery })}
              replace
              scroll={false}
              aria-current={option === box ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:flex-none',
                option === box ? 'bg-[var(--card-surface)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {BOX_LABELS[option]}
            </Link>
          ))}
        </nav>
        <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setShowNewConcern(true)}>
          New concern
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
          <Link href={hrefFor(pathname, { box, q: urlQuery })} replace scroll={false} aria-current={status === null ? 'true' : undefined} className={chipClass(status === null)}>
            All statuses
            {totalInBox !== null ? <span className="tabular-nums text-[var(--muted)]">{totalInBox}</span> : null}
          </Link>
          {CONCERN_STATUSES.map((option: ConcernStatus) => (
            <Link
              key={option}
              href={hrefFor(pathname, { box, status: option === status ? null : option, q: urlQuery })}
              replace
              scroll={false}
              aria-current={option === status ? 'true' : undefined}
              className={chipClass(option === status)}
            >
              {getConcernStatusLabel(option)}
              {counts ? <span className="tabular-nums text-[var(--muted)]">{counts[option]}</span> : null}
            </Link>
          ))}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <label htmlFor="concern-search" className="sr-only">Search concerns by subject</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <input
            id="concern-search"
            type="search"
            name="q"
            autoComplete="off"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by subject"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {list.isPending ? (
        <ListSkeleton />
      ) : list.isError ? (
        <div role="alert" className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--status-blocked)] bg-[var(--status-blocked-bg)] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-blocked)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Could not load concerns</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{list.error.message}</p>
            <Button className="mt-3" size="sm" variant="secondary" onClick={() => void list.refetch()}>Try again</Button>
          </div>
        </div>
      ) : list.data.items.length === 0 ? (
        renderEmpty()
      ) : (
        <ul className={cn('space-y-2 transition-opacity duration-150', list.isPlaceholderData && 'opacity-60')} aria-label={`${BOX_LABELS[box]} concerns`}>
          {list.data.items.map((concern) => (
            <li key={concern.id}>
              <ConcernRow concern={concern} box={box} viewer={list.data.viewer} />
            </li>
          ))}
        </ul>
      )}

      {showNewConcern ? <NewConcernDialog onClose={() => setShowNewConcern(false)} /> : null}
    </div>
  );
}
