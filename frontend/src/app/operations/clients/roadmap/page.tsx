"use client";

import { Map } from "lucide-react";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import RoadmapPanel from "@/components/client-portal/production-records/RoadmapPanel";

export default function ClientRoadmapPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={Map} title="Select a client" description="Roadmap recommendations appear after a client is selected." />;
        }

        return (
          <RoadmapPanel
            organizationId={workspace.selectedId}
            overview={workspace.overview}
            saving={workspace.saving}
            submitScoped={workspace.submitScoped}
            layout="full"
          />
        );
      }}
    </ClientOperationsShell>
  );
}
