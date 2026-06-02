"use client";

import { CalendarDays } from "lucide-react";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import CalendarPanel from "@/components/client-portal/production-records/CalendarPanel";

export default function ClientCalendarPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={CalendarDays} title="Select a client" description="Calendar controls appear after a client is selected." />;
        }

        return (
          <CalendarPanel
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
