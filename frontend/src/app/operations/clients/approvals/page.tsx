"use client";

import { CheckCircle2 } from "lucide-react";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import ApprovalsPanel from "@/components/client-portal/production-records/ApprovalsPanel";

export default function ClientApprovalsPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={CheckCircle2} title="Select a client" description="Approval records appear after a client is selected." />;
        }

        return (
          <ApprovalsPanel
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
