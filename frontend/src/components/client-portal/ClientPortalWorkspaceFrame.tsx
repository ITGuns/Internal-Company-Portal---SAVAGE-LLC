"use client";

import React from "react";
import { Activity, BriefcaseBusiness, CheckCircle2, FileText, Gauge } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { ProductionMetricStrip, type ProductionMetricItem } from "@/components/workspace/ProductionWorkspace";
import {
  ClientPortalWorkspaceState,
  useClientPortalWorkspace,
} from "@/hooks/useClientPortalWorkspace";
import { buildClientCommandCenter } from "@/lib/client-portal-command";
import { buildClientPortalSummary } from "@/lib/client-portal-summary";

interface ClientPortalWorkspaceFrameProps {
  title: string;
  subtitle: string;
  children: (workspace: ClientPortalWorkspaceState) => React.ReactNode;
}

export default function ClientPortalWorkspaceFrame({
  title,
  subtitle,
  children,
}: ClientPortalWorkspaceFrameProps) {
  const workspace = useClientPortalWorkspace();
  const { organizations, selectedId, setSelectedId, loading, overviewLoading } = workspace;

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-4 sm:p-6">
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {organizations.length > 1 ? (
              <select
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                aria-label="Client organization"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            ) : <div />}
            {overviewLoading ? <span className="text-xs text-[var(--muted)]">Refreshing workspace...</span> : null}
          </div>

          {loading ? (
            <div className="text-sm text-[var(--muted)]">Loading client workspace...</div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No client workspace assigned"
              description="Your account is not connected to a client organization yet."
            />
          ) : (
            <>
              {workspace.overview ? (
                <ClientRouteSummary
                  title={title}
                  subtitle={subtitle}
                  workspace={workspace}
                />
              ) : null}
              {children(workspace)}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function ClientRouteSummary({
  title,
  subtitle,
  workspace,
}: {
  title: string;
  subtitle: string;
  workspace: ClientPortalWorkspaceState;
}) {
  const overview = workspace.overview;
  if (!overview) return null;

  const summary = buildClientPortalSummary(overview);
  const command = buildClientCommandCenter(overview);
  const metrics: ProductionMetricItem[] = [
    { label: "Progress", value: `${summary.averageProgress}%`, caption: "Average project completion", icon: Gauge, tone: "accent" },
    { label: "Requests", value: summary.openTicketCount, caption: "Open workspace requests", icon: Activity, tone: "warning" },
    { label: "Actions", value: command.reviewRequests.length, caption: "Waiting for review", icon: CheckCircle2, tone: "success" },
    { label: "Updates", value: summary.updateCount, caption: "Client-visible notes", icon: FileText, tone: "info" },
  ];

  return (
    <ProductionMetricStrip
      eyebrow={overview.organization.slug}
      title={`${title} for ${overview.organization.name}`}
      description={subtitle}
      metrics={metrics}
    />
  );
}
