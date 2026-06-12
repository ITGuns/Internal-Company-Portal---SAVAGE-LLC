"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, GitBranch, Search, UserRound, Users } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import {
  getMemberAuthorizationLabels,
  getMemberDisplayName,
  getMemberRoleLabel,
  type OperationsMember,
} from "@/lib/member-role-management";
import {
  buildOperationsOrgChartRows,
  buildOperationsOrgChartTree,
  collectOperationsDescendantIds,
  memberMatchesOperationsOrgQuery,
  type OperationsOrgChartRow,
  type OperationsOrgChartRowNode,
} from "@/lib/operations-org-chart";

const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-10 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const selectClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const orgChartRowWidthClasses = [
  "max-w-[50rem]",
  "max-w-[76rem]",
  "max-w-[102rem]",
  "max-w-[120rem]",
  "max-w-[120rem]",
];

interface OperationsOrgChartPanelProps {
  members: OperationsMember[];
  canManageMembers: boolean;
  onUpdateManager: (userId: string, managerId: string | null) => Promise<void>;
}

function getOrgChartRowWidthClass(depth: number) {
  return orgChartRowWidthClasses[Math.min(depth, orgChartRowWidthClasses.length - 1)];
}

export default function OperationsOrgChartPanel({
  members,
  canManageMembers,
  onUpdateManager,
}: OperationsOrgChartPanelProps) {
  const [query, setQuery] = useState("");
  const [savingMemberId, setSavingMemberId] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const tree = useMemo(() => buildOperationsOrgChartTree(members), [members]);
  const rows = useMemo(() => buildOperationsOrgChartRows(members, normalizedQuery), [members, normalizedQuery]);
  const sortedMembers = useMemo(
    () => [...members].sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right))),
    [members],
  );
  const descendantIdsByMemberId = useMemo(() => {
    if (!canManageMembers) return new Map<string, Set<string>>();

    return new Map(
      members.map((member) => [member.id, collectOperationsDescendantIds(member.id, tree)]),
    );
  }, [canManageMembers, members, tree]);
  const matchingMemberCount = useMemo(
    () => members.filter((member) => memberMatchesOperationsOrgQuery(member, normalizedQuery)).length,
    [members, normalizedQuery],
  );
  const visibleNodeCount = useMemo(
    () => rows.reduce((count, row) => count + row.nodes.length, 0),
    [rows],
  );

  async function updateManager(member: OperationsMember, managerId: string) {
    const normalizedManagerId = managerId || null;
    if ((member.managerId || null) === normalizedManagerId) return;

    setSavingMemberId(member.id);
    try {
      await onUpdateManager(member.id, normalizedManagerId);
    } finally {
      setSavingMemberId("");
    }
  }

  function renderMemberNode(rowNode: OperationsOrgChartRowNode): React.ReactNode {
    const member = rowNode.member;
    const displayName = getMemberDisplayName(member);
    const roleLabels = (member.roles || []).map(getMemberRoleLabel);
    const authorizationLabels = getMemberAuthorizationLabels(member);
    const descendants = descendantIdsByMemberId.get(member.id) || new Set<string>();
    const managerSelectId = `org-manager-${member.id}`;
    const managerOptions = sortedMembers.filter((candidate) => candidate.id !== member.id && !descendants.has(candidate.id));

    return (
      <article
        key={`${member.id}-${rowNode.depth}-${rowNode.isCycle ? "cycle" : "node"}`}
        data-org-chart-node
        data-org-chart-depth={rowNode.depth}
        className="motion-list-in relative w-full max-w-[21rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-sm)]"
      >
        {rowNode.depth > 0 ? (
          <span
            className="absolute -top-5 left-1/2 h-5 w-px -translate-x-1/2 bg-[var(--border)]"
            aria-hidden="true"
          />
        ) : null}

        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card-surface)] text-[var(--accent)]">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{displayName}</h3>
              <p className="truncate text-xs text-[var(--muted)]">{member.email}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]">
            Level {rowNode.depth + 1}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(roleLabels.length ? roleLabels : ["No role assigned"]).map((label) => (
            <span key={label} className="rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-xs text-[var(--foreground)]">
              {label}
            </span>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {authorizationLabels.map((label) => (
            <span key={label} className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)]">
              {label}
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-xs text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">{rowNode.directReportCount}</span>{" "}
          direct report{rowNode.directReportCount === 1 ? "" : "s"}
        </div>

        {rowNode.isCycle ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Reporting cycle detected
          </div>
        ) : null}

        <div className="mt-3">
          <label htmlFor={managerSelectId} className="mb-1 block text-xs text-[var(--muted)]">
            Reports to
          </label>
          {canManageMembers ? (
            <select
              id={managerSelectId}
              name={managerSelectId}
              className={selectClass}
              value={member.managerId || ""}
              disabled={savingMemberId === member.id}
              onChange={(event) => void updateManager(member, event.target.value)}
              aria-label={`Set manager for ${displayName}`}
            >
              <option value="">No manager</option>
              {managerOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {getMemberDisplayName(candidate)}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm font-medium">
              {member.manager ? getMemberDisplayName(member.manager) : "No manager"}
            </div>
          )}
        </div>
      </article>
    );
  }

  function renderOrgChartRow(row: OperationsOrgChartRow, rowIndex: number) {
    return (
      <div
        key={row.depth}
        className={`relative flex w-full ${getOrgChartRowWidthClass(row.depth)} flex-wrap items-start justify-center gap-4 px-1 ${rowIndex > 0 ? "pt-8" : ""}`}
      >
        {rowIndex > 0 ? (
          <>
            <span
              className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-[var(--border)]"
              aria-hidden="true"
            />
            {row.nodes.length > 1 ? (
              <span
                className="absolute left-[10%] right-[10%] top-3 hidden h-px bg-[var(--border)] sm:block"
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : null}

        {row.nodes.map((rowNode) => renderMemberNode(rowNode))}
      </div>
    );
  }

  function renderOrgChartRows() {
    if (rows.length === 0) {
      return (
        <EmptyState
          icon={Search}
          title="No matching members"
          description="Try another member, role, or manager search."
        />
      );
    }

    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 sm:p-5">
        <div className="chat-scroll overflow-x-auto pb-2">
          <div className="flex min-w-full flex-col items-center gap-7 py-1">
            {rows.map((row, rowIndex) => renderOrgChartRow(row, rowIndex))}
          </div>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members found"
        description="Approved employees and internal users will appear here after onboarding."
      />
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="operations-org-chart-heading">
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 id="operations-org-chart-heading" className="text-base font-semibold">Organization Chart</h2>
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {visibleNodeCount} of {members.length} shown{normalizedQuery && visibleNodeCount !== matchingMemberCount ? ` (${matchingMemberCount} matched)` : ""}
          </div>
        </div>
        <label className="relative w-full lg:max-w-sm">
          <span className="sr-only">Search organization chart</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <input
            className={inputClass}
            name="operations-org-chart-search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by member, role, or manager"
          />
        </label>
      </div>

      {renderOrgChartRows()}
    </section>
  );
}
