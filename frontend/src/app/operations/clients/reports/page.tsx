"use client";

import { BarChart3, FileText } from "lucide-react";
import AdminClientMetricsPanel from "@/components/client-portal/AdminClientMetricsPanel";
import ClientOperationsPanel from "@/components/client-portal/ClientOperationsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import ReportsPanel from "@/components/client-portal/production-records/ReportsPanel";

export default function ClientReportsPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (!workspace.selectedId || !workspace.overview) {
          return <EmptyState icon={BarChart3} title="Select a client" description="Report controls appear after a client is selected." />;
        }

        const latestReport = workspace.overview.reports?.[0] || null;

        return (
          <div className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <ReportsPanel
                organizationId={workspace.selectedId}
                overview={workspace.overview}
                saving={workspace.saving}
                submitScoped={workspace.submitScoped}
              />
              <AdminClientMetricsPanel
                organizationId={workspace.selectedId}
                metrics={workspace.overview.metrics}
                saving={workspace.saving}
                submitScoped={workspace.submitScoped}
              />
            </div>

            <ClientOperationsPanel icon={FileText} title="Report Signals">
              {latestReport ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                    <div className="text-xs text-[var(--muted)]">Leads Captured</div>
                    <div className="mt-1 text-2xl font-semibold">{latestReport.leadsCaptured ?? 0}</div>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                    <div className="text-xs text-[var(--muted)]">Missed Opportunities</div>
                    <div className="mt-1 text-2xl font-semibold">{latestReport.missedOpportunities ?? 0}</div>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                    <div className="text-xs text-[var(--muted)]">Follow-up Status</div>
                    <div className="mt-1 text-sm font-semibold">{latestReport.followUpStatus || "Not set"}</div>
                  </div>
                </div>
              ) : (
                <EmptyState variant="compact" icon={FileText} title="No monthly report yet" />
              )}
            </ClientOperationsPanel>
          </div>
        );
      }}
    </ClientOperationsShell>
  );
}
