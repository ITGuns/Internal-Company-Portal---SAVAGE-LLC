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

const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-10 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const selectClass = "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

interface OperationsOrgChartPanelProps {
  members: OperationsMember[];
  canManageMembers: boolean;
  onUpdateManager: (userId: string, managerId: string | null) => Promise<void>;
}

type OrgNode = {
  member: OperationsMember;
  reports: OrgNode[];
};

function memberMatchesQuery(member: OperationsMember, query: string) {
  if (!query) return true;
  const haystack = [
    member.name,
    member.email,
    member.status,
    member.employeeProfile?.jobTitle,
    member.manager?.name,
    member.manager?.email,
    ...(member.roles || []).map((role) => `${role.role} ${role.department?.name || ""}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function buildOrgTree(members: OperationsMember[]): OrgNode[] {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const childrenByManager = new Map<string, OperationsMember[]>();

  members.forEach((member) => {
    if (!member.managerId || !memberById.has(member.managerId)) return;
    const reports = childrenByManager.get(member.managerId) || [];
    reports.push(member);
    childrenByManager.set(member.managerId, reports);
  });

  const visited = new Set<string>();
  const buildNode = (member: OperationsMember, path = new Set<string>()): OrgNode => {
    if (path.has(member.id)) {
      return { member, reports: [] };
    }
    visited.add(member.id);
    const nextPath = new Set(path);
    nextPath.add(member.id);
    const reports = (childrenByManager.get(member.id) || [])
      .sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right)))
      .map((report) => buildNode(report, nextPath));
    return { member, reports };
  };

  const roots = members
    .filter((member) => !member.managerId || !memberById.has(member.managerId))
    .sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right)))
    .map((member) => buildNode(member));

  members
    .filter((member) => !visited.has(member.id))
    .sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right)))
    .forEach((member) => roots.push(buildNode(member)));

  return roots;
}

function collectDescendantIds(memberId: string, tree: OrgNode[]): Set<string> {
  const descendants = new Set<string>();

  function walk(node: OrgNode): boolean {
    if (node.member.id === memberId) {
      collect(node);
      return true;
    }
    return node.reports.some(walk);
  }

  function collect(node: OrgNode) {
    node.reports.forEach((report) => {
      descendants.add(report.member.id);
      collect(report);
    });
  }

  tree.some(walk);
  return descendants;
}

function nodeHasMatch(node: OrgNode, query: string): boolean {
  return memberMatchesQuery(node.member, query) || node.reports.some((report) => nodeHasMatch(report, query));
}

export default function OperationsOrgChartPanel({
  members,
  canManageMembers,
  onUpdateManager,
}: OperationsOrgChartPanelProps) {
  const [query, setQuery] = useState("");
  const [savingMemberId, setSavingMemberId] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const tree = useMemo(() => buildOrgTree(members), [members]);
  const visibleCount = useMemo(
    () => members.filter((member) => memberMatchesQuery(member, normalizedQuery)).length,
    [members, normalizedQuery],
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

  function renderNode(node: OrgNode, depth = 0, path = new Set<string>()): React.ReactNode {
    if (normalizedQuery && !nodeHasMatch(node, normalizedQuery)) return null;

    const member = node.member;
    const displayName = getMemberDisplayName(member);
    const roleLabels = (member.roles || []).map(getMemberRoleLabel);
    const authorizationLabels = getMemberAuthorizationLabels(member);
    const descendants = canManageMembers ? collectDescendantIds(member.id, tree) : new Set<string>();
    const hasCycle = path.has(member.id);
    const nextPath = new Set(path);
    nextPath.add(member.id);

    return (
      <div key={member.id} className={depth > 0 ? "ml-4 border-l border-[var(--border)] pl-4" : ""}>
        <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--card-surface)] text-[var(--accent)]">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{displayName}</h3>
                  <p className="truncate text-xs text-[var(--muted)]">{member.email}</p>
                </div>
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

              {hasCycle ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Reporting cycle detected
                </div>
              ) : null}
            </div>

            <div className="w-full lg:max-w-xs">
              <div className="text-xs text-[var(--muted)]">Reports to</div>
              {canManageMembers ? (
                <select
                  className={selectClass}
                  value={member.managerId || ""}
                  disabled={savingMemberId === member.id}
                  onChange={(event) => void updateManager(member, event.target.value)}
                  aria-label={`Set manager for ${displayName}`}
                >
                  <option value="">No manager</option>
                  {members
                    .filter((candidate) => candidate.id !== member.id && !descendants.has(candidate.id))
                    .sort((left, right) => getMemberDisplayName(left).localeCompare(getMemberDisplayName(right)))
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {getMemberDisplayName(candidate)}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="mt-1 text-sm font-medium">
                  {member.manager ? getMemberDisplayName(member.manager) : "No manager"}
                </div>
              )}
            </div>
          </div>
        </article>

        {!hasCycle && node.reports.length > 0 ? (
          <div className="mt-3 space-y-3">
            {node.reports.map((report) => renderNode(report, depth + 1, nextPath))}
          </div>
        ) : null}
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
            <h2 id="operations-org-chart-heading" className="text-base font-semibold">Organization chart</h2>
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {visibleCount} of {members.length} shown
          </div>
        </div>
        <label className="relative w-full lg:max-w-sm">
          <span className="sr-only">Search organization chart</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by member, role, or manager"
          />
        </label>
      </div>

      <div className="space-y-3">
        {tree.map((node) => renderNode(node))}
      </div>
    </section>
  );
}
