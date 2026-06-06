"use client";

import React, { useMemo, useState } from "react";
import { Search, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  buildMemberRoleAssignmentPayload,
  getMemberAuthorizationLabels,
  getMemberDisplayName,
  getMemberRoleLabel,
  type MemberAvailableRole,
  type MemberRoleAssignment,
  type OperationsMember,
} from "@/lib/member-role-management";

const selectClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-10 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

interface OperationsMembersPanelProps {
  members: OperationsMember[];
  availableRoles: MemberAvailableRole[];
  canManageMembers: boolean;
  onAssignRole: (userId: string, roleData: { role: string; departmentId?: string }) => Promise<void>;
  onRemoveRole: (userId: string, assignment: MemberRoleAssignment) => Promise<void>;
}

function formatStatus(status?: string | null, isApproved?: boolean | null) {
  if (!isApproved) return "Not approved";
  return status ? status.replace(/[_-]+/g, " ") : "Active";
}

function getRoleKey(role: MemberRoleAssignment, index: number) {
  return role.id || `${role.role}:${role.departmentId || "global"}:${index}`;
}

export default function OperationsMembersPanel({
  members,
  availableRoles,
  canManageMembers,
  onAssignRole,
  onRemoveRole,
}: OperationsMembersPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedRoleByUser, setSelectedRoleByUser] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState("");

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return members;

    return members.filter((member) => {
      const haystack = [
        member.name,
        member.email,
        member.status,
        member.employeeProfile?.jobTitle,
        ...(member.roles || []).map((role) => `${role.role} ${role.department?.name || ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [members, query]);

  async function assignRole(member: OperationsMember) {
    const roleId = selectedRoleByUser[member.id] || "";
    if (!roleId) return;

    const payload = buildMemberRoleAssignmentPayload(roleId, availableRoles);
    const actionKey = `assign:${member.id}`;
    setSavingKey(actionKey);
    try {
      await onAssignRole(member.id, payload);
      setSelectedRoleByUser((current) => ({ ...current, [member.id]: "" }));
    } finally {
      setSavingKey("");
    }
  }

  async function removeRole(member: OperationsMember, role: MemberRoleAssignment) {
    const actionKey = `remove:${member.id}:${role.role}:${role.departmentId || "global"}`;
    setSavingKey(actionKey);
    try {
      await onRemoveRole(member.id, role);
    } finally {
      setSavingKey("");
    }
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
    <section className="space-y-4" aria-labelledby="operations-members-heading">
      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="operations-members-heading" className="text-base font-semibold">Members</h2>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {filteredMembers.length} of {members.length} shown
          </div>
        </div>
        <label className="relative w-full lg:max-w-sm">
          <span className="sr-only">Search members</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
          />
        </label>
      </div>

      {filteredMembers.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={Search}
          title="No matching members"
          description="Try a different name, email, role, or department."
        />
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => {
            const displayName = getMemberDisplayName(member);
            const memberRoles = member.roles || [];
            const selectedRoleId = selectedRoleByUser[member.id] || "";
            const assignKey = `assign:${member.id}`;

            return (
              <article key={member.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{displayName}</h3>
                      <StatusBadge label={formatStatus(member.status, member.isApproved)} size="sm" />
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--muted)]">{member.email}</div>
                    {member.employeeProfile?.jobTitle ? (
                      <div className="mt-1 truncate text-xs text-[var(--muted)]">{member.employeeProfile.jobTitle}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {getMemberAuthorizationLabels(member).map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)]"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {memberRoles.length === 0 ? (
                    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
                      No role assigned
                    </span>
                  ) : (
                    memberRoles.map((role, index) => {
                      const removeKey = `remove:${member.id}:${role.role}:${role.departmentId || "global"}`;
                      return (
                        <span
                          key={getRoleKey(role, index)}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-xs text-[var(--foreground)]"
                        >
                          <span className="truncate">{getMemberRoleLabel(role)}</span>
                          {canManageMembers ? (
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Remove ${getMemberRoleLabel(role)} from ${displayName}`}
                              disabled={Boolean(savingKey)}
                              onClick={() => void removeRole(member, role)}
                            >
                              {savingKey === removeKey ? (
                                <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </button>
                          ) : null}
                        </span>
                      );
                    })
                  )}
                </div>

                {canManageMembers ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
                      <label htmlFor={`member-role-select-${member.id}`} className="mb-2 block text-sm font-medium">
                        Add role
                      </label>
                      <select
                        id={`member-role-select-${member.id}`}
                        className={selectClass}
                        value={selectedRoleId}
                        onChange={(event) => setSelectedRoleByUser((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))}
                      >
                        <option value="">Select role</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.department?.name ? `${role.name} - ${role.department.name}` : role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<UserPlus className="h-4 w-4" />}
                      disabled={!selectedRoleId || Boolean(savingKey)}
                      loading={savingKey === assignKey}
                      onClick={() => void assignRole(member)}
                    >
                      Add Role
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
