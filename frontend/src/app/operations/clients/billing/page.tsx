"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import BillingPanel from "@/components/client-portal/production-records/BillingPanel";
import { useToast } from "@/components/ToastProvider";
import {
  fetchClientServiceTiers,
  updateClientOrganizationServiceTier,
  type ClientServiceTier,
} from "@/lib/client-portal";
import { sortClientServiceTiers } from "@/lib/client-service-tiers";

export default function ClientBillingPage() {
  const { error: showError, success: showSuccess } = useToast();
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
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={CreditCard} title="Select a client" description="Billing controls appear after a client is selected." />;
        }

        return (
          <BillingPanel
            organizationId={workspace.selectedId}
            overview={workspace.overview}
            saving={workspace.saving}
            submitScoped={workspace.submitScoped}
            serviceTiers={serviceTiers}
            onServiceTierChange={async (tierId) => {
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
            }}
          />
        );
      }}
    </ClientOperationsShell>
  );
}
