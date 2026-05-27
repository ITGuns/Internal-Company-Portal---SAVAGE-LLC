"use client";

import { FolderOpen } from "lucide-react";
import AdminClientResourcesPanel from "@/components/client-portal/AdminClientResourcesPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import AssetsPanel from "@/components/client-portal/production-records/AssetsPanel";

export default function ClientAssetsPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={FolderOpen} title="Select a client" description="Asset and resource controls appear after a client is selected." />;
        }

        return (
          <div className="grid gap-5 xl:grid-cols-2">
            <AdminClientResourcesPanel
              organizationId={workspace.selectedId}
              resources={workspace.overview.resources}
              saving={workspace.saving}
              submitScoped={workspace.submitScoped}
            />
            <AssetsPanel
              organizationId={workspace.selectedId}
              overview={workspace.overview}
              saving={workspace.saving}
              submitScoped={workspace.submitScoped}
            />
          </div>
        );
      }}
    </ClientOperationsShell>
  );
}
