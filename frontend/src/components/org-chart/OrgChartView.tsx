"use client";

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronsDownUp, ChevronsUpDown, Network, Search, X } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ToastProvider';
import NewConcernDialog from '@/components/concerns/NewConcernDialog';
import ChangeManagerDialog from './ChangeManagerDialog';
import OrgChartBranch, { type OrgChartTreeContext } from './OrgChartBranch';
import styles from './org-chart.module.css';
import { DEPARTMENTS } from '@/lib/departments';
import {
  ORG_CHART_QUERY_KEY,
  buildOrgChartTree,
  collectAncestorIds,
  findMatchingMemberIds,
  groupOrgChartByDepartment,
  updateMemberManager,
  type OrgChartData,
  type OrgChartMember,
} from '@/lib/org-chart';

const toolbarButtonClass =
  'inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] px-3 text-sm text-[var(--foreground)] transition-[border-color,color] duration-150 hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

function withoutIds(source: Set<string>, ids: Set<string>): Set<string> {
  return new Set([...source].filter((id) => !ids.has(id)));
}

export default function OrgChartView({ data }: { data: OrgChartData }) {
  const { members, viewer } = data;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [contactMember, setContactMember] = useState<OrgChartMember | null>(null);
  const [managerMember, setManagerMember] = useState<OrgChartMember | null>(null);

  const tree = useMemo(() => buildOrgChartTree(members), [members]);
  const groups = useMemo(() => groupOrgChartByDepartment(tree, DEPARTMENTS), [tree]);
  const matchIds = useMemo(() => findMatchingMemberIds(members, query), [members, query]);
  const managerIds = useMemo(() => new Set(members.filter((member) => member.managerId).map((member) => member.managerId!)), [members]);
  const isSearching = query.trim().length > 0;

  function handleSearch(value: string) {
    setQuery(value);
    // Open every branch that leads to a match; the member can still fold them again.
    const ancestors = collectAncestorIds(findMatchingMemberIds(members, value), members);
    if (ancestors.size > 0) setCollapsedIds((previous) => withoutIds(previous, ancestors));
  }

  function toggleBranch(memberId: string) {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  async function saveManager(memberId: string, managerId: string | null) {
    await updateMemberManager(memberId, managerId);
    await queryClient.invalidateQueries({ queryKey: ORG_CHART_QUERY_KEY });
    toast.success(managerId ? 'Manager updated' : 'Moved to the top of the chart');
  }

  const context: OrgChartTreeContext = {
    viewerId: viewer.id,
    canEditReportingLines: viewer.canEditReportingLines,
    isSearching,
    matchIds,
    collapsedIds,
    onToggle: toggleBranch,
    onContact: setContactMember,
    onChangeManager: setManagerMember,
  };

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="Nobody is on the org chart yet"
        description="Approved, active members appear here. Ask an admin to approve accounts in Operations."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <label htmlFor="org-chart-search" className="sr-only">Search the org chart</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <input
            id="org-chart-search"
            type="search"
            name="org-chart-search"
            autoComplete="off"
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search name, role, or department"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-9 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] [&::-webkit-search-cancel-button]:hidden"
          />
          {isSearching ? (
            <button
              type="button"
              onClick={() => handleSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm text-[var(--muted)]" aria-live="polite">
            {isSearching
              ? `${matchIds.size} match${matchIds.size === 1 ? '' : 'es'}`
              : `${members.length} member${members.length === 1 ? '' : 's'}`}
          </p>
          <button type="button" className={toolbarButtonClass} onClick={() => setCollapsedIds(new Set())}>
            <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
            Expand all
          </button>
          <button type="button" className={toolbarButtonClass} onClick={() => setCollapsedIds(new Set(managerIds))}>
            <ChevronsDownUp className="h-4 w-4" aria-hidden="true" />
            Collapse all
          </button>
        </div>
      </div>

      {isSearching && matchIds.size === 0 ? (
        <p role="status" className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--muted)]">
          Nobody matches &quot;{query.trim()}&quot;. Try a first name, a role such as Operations Manager, or a department.
        </p>
      ) : null}

      {groups.map((group, groupIndex) => (
        <section
          key={group.name}
          aria-labelledby={`org-group-${groupIndex}`}
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)]"
        >
          <header className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <h2 id={`org-group-${groupIndex}`} className="text-sm font-semibold text-[var(--foreground)]">{group.name}</h2>
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {group.size} {group.size === 1 ? 'person' : 'people'}
            </span>
          </header>
          <div className="overflow-x-auto p-4 chat-scroll">
            <div className={styles.canvas}>
              <ul className={styles.roots}>
                {group.roots.map((root) => (
                  <OrgChartBranch key={root.member.id} node={root} context={context} />
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {managerMember ? (
        <ChangeManagerDialog
          member={managerMember}
          members={members}
          canSetRoot={viewer.canSetRoot}
          onClose={() => setManagerMember(null)}
          onSave={saveManager}
        />
      ) : null}
      {contactMember ? (
        <NewConcernDialog initialAssigneeId={contactMember.id} onClose={() => setContactMember(null)} />
      ) : null}
    </div>
  );
}
