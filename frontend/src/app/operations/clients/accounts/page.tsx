"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Archive, BadgeDollarSign, BriefcaseBusiness, Plus, UserPlus } from "lucide-react";
import Button from "@/components/Button";
import AdminClientAccountProfilePanel from "@/components/client-portal/AdminClientAccountProfilePanel";
import AdminClientArchivePanel from "@/components/client-portal/AdminClientArchivePanel";
import AdminClientMembersPanel from "@/components/client-portal/AdminClientMembersPanel";
import AdminClientServiceTiersPanel from "@/components/client-portal/AdminClientServiceTiersPanel";
import ClientOperationsPanel, {
  clientOperationsSelectClass,
  clientOperationsTextareaClass,
} from "@/components/client-portal/ClientOperationsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import {
  createClientOrganization,
  createClientServiceTier,
  fetchClientServiceTiers,
  updateClientOrganizationServiceTier,
  updateClientOrganizationStatus,
  updateClientServiceTier,
  type ClientServiceTier,
} from "@/lib/client-portal";
import { sortClientServiceTiers, upsertClientServiceTier } from "@/lib/client-service-tiers";

const emptyOrg = { name: "", slug: "", websiteUrl: "", tierId: "", notes: "" };

export default function ClientAccountsPage() {
  const { error: showError, success: showSuccess } = useToast();
  const [orgForm, setOrgForm] = useState(emptyOrg);
  const [serviceTiers, setServiceTiers] = useState<ClientServiceTier[]>([]);

  const loadServiceTiers = useCallback(async () => {
    try {
      const tiers = await fetchClientServiceTiers();
      setServiceTiers(sortClientServiceTiers(tiers));
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to fetch service tiers");
    }
  }, [showError]);

  useEffect(() => {
    void loadServiceTiers();
  }, [loadServiceTiers]);

  return (
    <ClientOperationsShell>
      {(workspace) => {
        async function handleCreateOrganization(event: React.FormEvent) {
          event.preventDefault();
          if (!orgForm.name.trim()) {
            showError("Client name is required");
            return;
          }

          workspace.setSaving(true);
          try {
            const organization = await createClientOrganization({
              name: orgForm.name,
              slug: orgForm.slug || undefined,
              websiteUrl: orgForm.websiteUrl || undefined,
              tierId: orgForm.tierId || undefined,
              notes: orgForm.notes || undefined,
            });
            setOrgForm(emptyOrg);
            await workspace.refreshOrganizations();
            workspace.selectClient(organization.id);
            await workspace.refreshClient(organization.id);
            showSuccess("Client organization created");
          } catch (error) {
            showError(error instanceof Error ? error.message : "Failed to create client");
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
            showSuccess(status === "archived" ? "Client archived" : "Client access restored");
          } catch (error) {
            showError(error instanceof Error ? error.message : "Failed to update client status");
          } finally {
            workspace.setSaving(false);
          }
        }

        async function handleCreateServiceTier(data: {
          name: string;
          description?: string;
          monthlyPrice?: number;
          priorityRank?: number;
        }) {
          workspace.setSaving(true);
          try {
            const tier = await createClientServiceTier(data);
            setServiceTiers((tiers) => upsertClientServiceTier(tiers, tier));
            showSuccess("Service tier added");
            return tier;
          } catch (error) {
            showError(error instanceof Error ? error.message : "Failed to add service tier");
            throw error;
          } finally {
            workspace.setSaving(false);
          }
        }

        async function handleUpdateServiceTier(
          tierId: string,
          data: {
            name: string;
            description: string | null;
            monthlyPrice: number | null;
            priorityRank: number;
          },
        ) {
          workspace.setSaving(true);
          try {
            const tier = await updateClientServiceTier(tierId, data);
            setServiceTiers((tiers) => upsertClientServiceTier(tiers, tier));
            if (workspace.selectedOrganization?.tierId === tier.id) {
              await workspace.refreshOrganizations();
              await workspace.refreshClient(workspace.selectedId);
            }
            showSuccess("Service tier updated");
            return tier;
          } catch (error) {
            showError(error instanceof Error ? error.message : "Failed to update service tier");
            throw error;
          } finally {
            workspace.setSaving(false);
          }
        }

        async function handleTierAssignmentChange(tierId: string) {
          if (!workspace.selectedId) return;

          workspace.setSaving(true);
          try {
            await updateClientOrganizationServiceTier(workspace.selectedId, tierId || null);
            await workspace.refreshOrganizations();
            await workspace.refreshClient(workspace.selectedId);
            showSuccess(tierId ? "Service tier assigned" : "Service tier cleared");
          } catch (error) {
            showError(error instanceof Error ? error.message : "Failed to update service tier");
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
                  <label className="grid gap-2 text-sm">
                    <span className="font-medium">Service Tier</span>
                    <select
                      className={clientOperationsSelectClass}
                      value={orgForm.tierId}
                      onChange={(event) => setOrgForm((form) => ({ ...form, tierId: event.target.value }))}
                    >
                      <option value="">Not assigned</option>
                      {serviceTiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </label>
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
                <AdminClientAccountProfilePanel
                  organization={workspace.selectedOrganization}
                  serviceTiers={serviceTiers}
                  saving={workspace.saving}
                  onTierAssignmentChange={handleTierAssignmentChange}
                />
              </ClientOperationsPanel>

              <ClientOperationsPanel icon={BadgeDollarSign} title="Service Tiers" count={serviceTiers.length}>
                <AdminClientServiceTiersPanel
                  tiers={serviceTiers}
                  saving={workspace.saving}
                  onCreate={handleCreateServiceTier}
                  onUpdate={handleUpdateServiceTier}
                />
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
