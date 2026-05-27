"use client";

import { Activity, ClipboardList, FileText } from "lucide-react";
import AdminClientProjectsPanel from "@/components/client-portal/AdminClientProjectsPanel";
import AdminClientUpdatesPanel from "@/components/client-portal/AdminClientUpdatesPanel";
import ClientOperationsPanel from "@/components/client-portal/ClientOperationsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import WorkItemsPanel from "@/components/client-portal/production-records/WorkItemsPanel";
import { formatClientPortalDate } from "@/lib/client-portal-display";

export default function ClientDeliveryPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={Activity} title="Select a client" description="Delivery controls appear after a client is selected." />;
        }

        const completedWork = (workspace.overview.workItems || []).filter((item) => item.status === "completed");

        return (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-2">
              <AdminClientProjectsPanel
                organizationId={workspace.selectedId}
                projects={workspace.overview.projects}
                saving={workspace.saving}
                submitScoped={workspace.submitScoped}
                refreshClient={workspace.refreshClient}
                setSaving={workspace.setSaving}
              />
              <AdminClientUpdatesPanel
                organizationId={workspace.selectedId}
                projects={workspace.overview.projects}
                updates={workspace.overview.updates}
                saving={workspace.saving}
                submitScoped={workspace.submitScoped}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <WorkItemsPanel
                organizationId={workspace.selectedId}
                overview={workspace.overview}
                saving={workspace.saving}
                submitScoped={workspace.submitScoped}
              />

              <ClientOperationsPanel icon={FileText} title="Completed Work Log" count={completedWork.length}>
                {completedWork.length === 0 ? (
                  <EmptyState variant="compact" icon={ClipboardList} title="No completed work yet" />
                ) : (
                  <div className="space-y-2">
                    {completedWork.map((item) => (
                      <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">Completed {formatClientPortalDate(item.completedAt || item.updatedAt)}</div>
                      </article>
                    ))}
                  </div>
                )}
              </ClientOperationsPanel>
            </div>
          </div>
        );
      }}
    </ClientOperationsShell>
  );
}
