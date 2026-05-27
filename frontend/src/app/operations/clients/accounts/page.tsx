"use client";

import type React from "react";
import { useState } from "react";
import { Archive, BriefcaseBusiness, ExternalLink, Plus, UserPlus } from "lucide-react";
import Button from "@/components/Button";
import AdminClientArchivePanel from "@/components/client-portal/AdminClientArchivePanel";
import AdminClientMembersPanel from "@/components/client-portal/AdminClientMembersPanel";
import ClientOperationsPanel, { clientOperationsTextareaClass } from "@/components/client-portal/ClientOperationsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { createClientOrganization, updateClientOrganizationStatus } from "@/lib/client-portal";

const emptyOrg = { name: "", slug: "", websiteUrl: "", notes: "" };

export default function ClientAccountsPage() {
  const toast = useToast();
  const [orgForm, setOrgForm] = useState(emptyOrg);

  return (
    <ClientOperationsShell>
      {(workspace) => {
        async function handleCreateOrganization(event: React.FormEvent) {
          event.preventDefault();
          if (!orgForm.name.trim()) {
            toast.error("Client name is required");
            return;
          }

          workspace.setSaving(true);
          try {
            const organization = await createClientOrganization({
              name: orgForm.name,
              slug: orgForm.slug || undefined,
              websiteUrl: orgForm.websiteUrl || undefined,
              notes: orgForm.notes || undefined,
            });
            setOrgForm(emptyOrg);
            await workspace.refreshOrganizations();
            workspace.selectClient(organization.id);
            await workspace.refreshClient(organization.id);
            toast.success("Client organization created");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create client");
          } finally {
            workspace.setSaving(false);
          }
        }

        async function handleOrganizationStatusChange(status: "active" | "archived") {
          if (!workspace.selectedId) return;

          workspace.setSaving(true);
          try {
            await updateClientOrganizationStatus(workspace.selectedId, status);
            await workspace.refreshOrganizations();
            await workspace.refreshClient(workspace.selectedId);
            toast.success(status === "archived" ? "Client archived" : "Client access restored");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update client status");
          } finally {
            workspace.setSaving(false);
          }
        }

        return (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <ClientOperationsPanel icon={BriefcaseBusiness} title="Create Client">
                <form onSubmit={handleCreateOrganization} className="space-y-3">
                  <FormField id="client-name" label="Client Name" value={orgForm.name} onChange={(name) => setOrgForm((form) => ({ ...form, name }))} placeholder="Gem Field HVAC" required />
                  <FormField id="client-slug" label="Slug" value={orgForm.slug} onChange={(slug) => setOrgForm((form) => ({ ...form, slug }))} placeholder="gem-field-hvac" />
                  <FormField id="client-website" label="Website URL" value={orgForm.websiteUrl} onChange={(websiteUrl) => setOrgForm((form) => ({ ...form, websiteUrl }))} placeholder="https://example.com" />
                  <textarea
                    className={clientOperationsTextareaClass}
                    value={orgForm.notes}
                    onChange={(event) => setOrgForm((form) => ({ ...form, notes: event.target.value }))}
                    placeholder="Internal notes"
                    aria-label="Internal client notes"
                  />
                  <Button type="submit" icon={<Plus className="h-4 w-4" />} loading={workspace.saving} fullWidth>Create Client</Button>
                </form>
              </ClientOperationsPanel>

              <ClientOperationsPanel icon={BriefcaseBusiness} title="Account Profile">
                {workspace.selectedOrganization ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-medium uppercase text-[var(--muted)]">{workspace.selectedOrganization.slug}</div>
                      <div className="mt-1 text-lg font-semibold">{workspace.selectedOrganization.name}</div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="text-xs text-[var(--muted)]">Status</div>
                        <div className="mt-2"><StatusBadge label={workspace.selectedOrganization.status} size="sm" /></div>
                      </div>
                      <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="text-xs text-[var(--muted)]">Service Tier</div>
                        <div className="mt-1 text-sm font-medium">{workspace.selectedOrganization.tier?.name || "Not assigned"}</div>
                      </div>
                    </div>
                    {workspace.selectedOrganization.websiteUrl ? (
                      <a
                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
                        href={workspace.selectedOrganization.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open website
                      </a>
                    ) : null}
                    {workspace.selectedOrganization.notes ? (
                      <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3 text-sm leading-6 text-[var(--muted)]">
                        {workspace.selectedOrganization.notes}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState variant="compact" icon={BriefcaseBusiness} title="Create or select a client" />
                )}
              </ClientOperationsPanel>

              <ClientOperationsPanel icon={Archive} title="Remove Client">
                {workspace.selectedOrganization ? (
                  <AdminClientArchivePanel
                    organization={workspace.selectedOrganization}
                    saving={workspace.saving}
                    onStatusChange={handleOrganizationStatusChange}
                  />
                ) : (
                  <EmptyState variant="compact" icon={Archive} title="No selected client" />
                )}
              </ClientOperationsPanel>
            </div>

            <ClientOperationsPanel icon={UserPlus} title="Team And Access" count={workspace.memberships.length}>
              {workspace.selectedId ? (
                <AdminClientMembersPanel
                  organizationId={workspace.selectedId}
                  memberships={workspace.memberships}
                  users={workspace.users}
                  saving={workspace.saving}
                  submitScoped={workspace.submitScoped}
                />
              ) : (
                <EmptyState variant="compact" icon={UserPlus} title="No selected client" description="Create a client before inviting client users." />
              )}
            </ClientOperationsPanel>
          </div>
        );
      }}
    </ClientOperationsShell>
  );
}
