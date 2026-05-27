"use client";

import React, { useEffect, useState } from "react";
import { Copy, Mail, RefreshCw, Save, UserMinus, UserPlus } from "lucide-react";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import type { User } from "@/lib/users";
import {
  ClientMembership,
  createClientMembership,
  inviteClientUser,
  updateClientMembership,
} from "@/lib/client-portal";
import {
  canSubmitClientInvite,
  createClientInvitePayload,
  emptyClientInviteForm,
  getClientInviteDeliveryLabel,
} from "@/lib/client-invitations";
import {
  buildClientMembershipUpdatePayload,
  createClientMembershipEdit,
  getClientMembershipDisplayName,
  hasClientMembershipEditChanges,
  type ClientMembershipEdit,
} from "@/lib/client-memberships";
import {
  CLIENT_MEMBER_ROLES,
  CLIENT_MEMBER_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

const selectClass = "w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const inputClass = "w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const emptyMemberForm = { userId: "", role: "client_owner", status: "active" };

interface AdminClientMembersPanelProps {
  organizationId: string;
  memberships: ClientMembership[];
  users: User[];
  saving: boolean;
  submitScoped: (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => Promise<void>;
}

export default function AdminClientMembersPanel({
  organizationId,
  memberships,
  users,
  saving,
  submitScoped,
}: AdminClientMembersPanelProps) {
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [inviteForm, setInviteForm] = useState(emptyClientInviteForm);
  const [memberEdits, setMemberEdits] = useState<Record<string, ClientMembershipEdit>>({});
  const [inviteSetupUrl, setInviteSetupUrl] = useState("");
  const [inviteDeliveryLabel, setInviteDeliveryLabel] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy link");

  useEffect(() => {
    setMemberEdits(Object.fromEntries(
      memberships.map((membership) => [membership.id, createClientMembershipEdit(membership)]),
    ));
  }, [memberships]);

  useEffect(() => {
    setCopyLabel("Copy link");
  }, [inviteSetupUrl]);

  function getMemberEdit(membership: ClientMembership): ClientMembershipEdit {
    return memberEdits[membership.id] || createClientMembershipEdit(membership);
  }

  function updateMemberEdit(membership: ClientMembership, patch: Partial<ClientMembershipEdit>) {
    setMemberEdits((current) => ({
      ...current,
      [membership.id]: {
        ...getMemberEdit(membership),
        ...patch,
      },
    }));
  }

  function saveMember(membership: ClientMembership, edit: ClientMembershipEdit) {
    const payload = buildClientMembershipUpdatePayload(membership, edit);
    void submitScoped(
      () => updateClientMembership(membership.id, payload),
      "Client member updated",
      () => undefined,
    );
  }

  function setMemberStatus(membership: ClientMembership, status: string) {
    void submitScoped(
      () => updateClientMembership(membership.id, { status }),
      status === "active" ? "Client member reactivated" : "Client member deactivated",
      () => undefined,
    );
  }

  function submitInvite() {
    const payload = createClientInvitePayload(inviteForm);

    void submitScoped(
      async () => {
        const result = await inviteClientUser(organizationId, payload);
        setInviteDeliveryLabel(getClientInviteDeliveryLabel(result));
        setInviteSetupUrl(result.invite.setupUrl || "");
        return result;
      },
      "Client invite processed",
      () => setInviteForm(emptyClientInviteForm),
    );
  }

  async function copySetupLink() {
    if (!inviteSetupUrl || !navigator.clipboard) return;

    await navigator.clipboard.writeText(inviteSetupUrl);
    setCopyLabel("Copied");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3" aria-labelledby="client-invite-heading">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 rounded-full border border-[var(--border)] p-1.5 text-[var(--accent)]">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 id="client-invite-heading" className="text-sm font-semibold">Invite external client</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Creates client access and a setup link without exposing admin-only fields.</p>
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitInvite();
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="client-invite-email" className="mb-2 block text-sm font-medium">Email</label>
              <input
                id="client-invite-email"
                type="email"
                className={inputClass}
                value={inviteForm.email}
                onChange={(event) => setInviteForm((form) => ({ ...form, email: event.target.value }))}
                placeholder="client@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="client-invite-name" className="mb-2 block text-sm font-medium">Name</label>
              <input
                id="client-invite-name"
                className={inputClass}
                value={inviteForm.name}
                onChange={(event) => setInviteForm((form) => ({ ...form, name: event.target.value }))}
                placeholder="Primary contact"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="client-invite-role" className="mb-2 block text-sm font-medium">Portal role</label>
              <select
                id="client-invite-role"
                className={selectClass}
                value={inviteForm.role}
                onChange={(event) => setInviteForm((form) => ({ ...form, role: event.target.value }))}
              >
                {CLIENT_MEMBER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="client-invite-status" className="mb-2 block text-sm font-medium">Access status</label>
              <select
                id="client-invite-status"
                className={selectClass}
                value={inviteForm.status}
                onChange={(event) => setInviteForm((form) => ({ ...form, status: event.target.value }))}
              >
                {CLIENT_MEMBER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={!canSubmitClientInvite(inviteForm) || saving}
                icon={<UserPlus className="h-4 w-4" />}
              >
                Invite client
              </Button>
            </div>
          </form>

          {inviteDeliveryLabel ? (
            <div role="status" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3 text-sm">
              <div className="font-medium">{inviteDeliveryLabel}</div>
              {inviteSetupUrl ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className={inputClass}
                    readOnly
                    aria-label="Client setup link"
                    value={inviteSetupUrl}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Copy className="h-4 w-4" />}
                    onClick={() => void copySetupLink()}
                  >
                    {copyLabel}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitScoped(
              () => createClientMembership(organizationId, memberForm),
              "Client member saved",
              () => setMemberForm(emptyMemberForm),
            );
          }}
          className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-1"
          aria-label="Add existing user to client portal"
        >
          <div className="sm:col-span-3 xl:col-span-1">
            <label htmlFor="client-member-user" className="mb-2 block text-sm font-medium">Existing user</label>
            <select
              id="client-member-user"
              className={selectClass}
              value={memberForm.userId}
              onChange={(event) => setMemberForm((form) => ({ ...form, userId: event.target.value }))}
              required
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name || user.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="client-member-role" className="mb-2 block text-sm font-medium">Role</label>
            <select
              id="client-member-role"
              className={selectClass}
              value={memberForm.role}
              onChange={(event) => setMemberForm((form) => ({ ...form, role: event.target.value }))}
            >
              {CLIENT_MEMBER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="client-member-status" className="mb-2 block text-sm font-medium">Status</label>
            <select
              id="client-member-status"
              className={selectClass}
              value={memberForm.status}
              onChange={(event) => setMemberForm((form) => ({ ...form, status: event.target.value }))}
            >
              {CLIENT_MEMBER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <Button type="submit" size="sm" loading={saving} disabled={!memberForm.userId || saving} icon={<UserPlus className="h-4 w-4" />} className="self-end">
            Add user
          </Button>
        </form>
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={UserPlus}
          title="No client users"
          description="Add an approved user to grant portal access."
        />
      ) : (
        <div className="space-y-3">
          {memberships.map((membership) => {
            const edit = getMemberEdit(membership);
            const hasChanges = hasClientMembershipEditChanges(membership, edit);
            const isInactive = membership.status !== "active";

            return (
              <div key={membership.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{getClientMembershipDisplayName(membership)}</div>
                    <div className="truncate text-xs text-[var(--muted)]">{membership.user?.email || "No email on file"}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusBadge
                      label={getClientPortalOptionLabel(CLIENT_MEMBER_ROLES, membership.role)}
                      size="sm"
                    />
                    <StatusBadge
                      label={getClientPortalOptionLabel(CLIENT_MEMBER_STATUSES, membership.status)}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
                  <div>
                    <label htmlFor={`member-role-${membership.id}`} className="mb-2 block text-sm font-medium">Role</label>
                    <select
                      id={`member-role-${membership.id}`}
                      className={selectClass}
                      value={edit.role}
                      onChange={(event) => updateMemberEdit(membership, { role: event.target.value })}
                    >
                      {CLIENT_MEMBER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`member-status-${membership.id}`} className="mb-2 block text-sm font-medium">Status</label>
                    <select
                      id={`member-status-${membership.id}`}
                      className={selectClass}
                      value={edit.status}
                      onChange={(event) => updateMemberEdit(membership, { status: event.target.value })}
                    >
                      {CLIENT_MEMBER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={<Save className="h-4 w-4" />}
                    loading={saving && hasChanges}
                    disabled={!hasChanges || saving}
                    onClick={() => saveMember(membership, edit)}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isInactive ? "outline" : "danger"}
                    icon={isInactive ? <RefreshCw className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                    disabled={saving}
                    onClick={() => setMemberStatus(membership, isInactive ? "active" : "inactive")}
                  >
                    {isInactive ? "Reactivate" : "Deactivate"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
