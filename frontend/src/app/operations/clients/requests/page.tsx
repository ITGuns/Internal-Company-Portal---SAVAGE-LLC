"use client";

import { Ticket } from "lucide-react";
import AdminClientRequestsPanel from "@/components/client-portal/AdminClientRequestsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";

export default function ClientRequestsPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={Ticket} title="Select a client" description="Client requests appear after a client is selected." />;
        }

        return (
          <AdminClientRequestsPanel
            organizationId={workspace.selectedId}
            tickets={workspace.overview.tickets}
            currentUserId={workspace.user?.id}
            saving={workspace.saving}
            setSaving={workspace.setSaving}
            refreshClient={workspace.refreshClient}
          />
        );
      }}
    </ClientOperationsShell>
  );
}
