"use client";

import { CreditCard } from "lucide-react";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import BillingPanel from "@/components/client-portal/production-records/BillingPanel";

export default function ClientBillingPage() {
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
          />
        );
      }}
    </ClientOperationsShell>
  );
}
