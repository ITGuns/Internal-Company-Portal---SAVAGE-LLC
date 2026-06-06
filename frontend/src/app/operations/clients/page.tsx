"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Gauge,
  Ticket,
  UserPlus,
} from "lucide-react";
import ClientActionQueue from "@/components/client-portal/ClientActionQueue";
import ClientActivityTimeline from "@/components/client-portal/ClientActivityTimeline";
import ClientOperationsPanel from "@/components/client-portal/ClientOperationsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { ProductionMetricStrip, type ProductionMetricItem } from "@/components/workspace/ProductionWorkspace";
import { withClientOperationsClientParam } from "@/lib/client-operations-navigation";
import { getClientPortalOptionLabel, CLIENT_PROJECT_STATUSES } from "@/lib/client-portal-options";
import { formatClientPortalDate, getClientBillingTierLabel } from "@/lib/client-portal-display";
import { buildClientCommandCenter } from "@/lib/client-portal-command";

const quickLinks = [
  {
    href: "/operations/clients/accounts",
    icon: UserPlus,
    title: "Accounts",
    description: "Invite users and manage access.",
  },
  {
    href: "/operations/clients/delivery",
    icon: Activity,
    title: "Delivery",
    description: "Update build progress and work items.",
  },
  {
    href: "/operations/clients/requests",
    icon: Ticket,
    title: "Requests",
    description: "Reply to client change requests.",
  },
  {
    href: "/operations/clients/reports",
    icon: BarChart3,
    title: "Reports",
    description: "Publish monthly performance notes.",
  },
  {
    href: "/operations/clients/assets",
    icon: FolderOpen,
    title: "Assets",
    description: "Share resources and files.",
  },
];

export default function ClientOperationsOverviewPage() {
  return (
    <ClientOperationsShell>
      {(workspace) => {
        if (workspace.organizations.length === 0) {
          return (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No client accounts yet"
              description="Create a client account before setting up delivery, requests, reports, assets, and billing."
            />
          );
        }

        if (!workspace.overview) {
          return <EmptyState icon={BriefcaseBusiness} title="Select a client" description="Choose a client to review their operations dashboard." />;
        }

        const overview = workspace.overview;
        const commandCenter = buildClientCommandCenter(overview);
        const openApprovals = (overview.approvals || []).filter((approval) => approval.status === "pending");
        const openWork = (overview.workItems || []).filter((item) => !["completed", "archived"].includes(item.status));
        const latestUpdate = overview.updates[0] || null;
        const latestReport = overview.reports?.[0] || null;
        const billingStatus = overview.billingStatus;
        const operationsMetrics: ProductionMetricItem[] = [
          { label: "Open work", value: openWork.length, caption: "Client-visible production items", icon: Activity, tone: "info" },
          { label: "Open requests", value: workspace.summary.openTicketCount, caption: "Client asks needing handling", icon: Ticket, tone: "warning" },
          { label: "Approvals", value: openApprovals.length, caption: "Waiting on client decisions", icon: CheckCircle2, tone: "success" },
          { label: "Progress", value: `${commandCenter.averageProgress}%`, caption: "Average project completion", icon: Gauge, tone: "accent" },
        ];

        return (
          <div className="space-y-5">
            <ProductionMetricStrip
              eyebrow="Operations signal"
              title="Team-facing client command picture"
              description="Route the next admin action from real requests, approvals, work items, reports, and progress instead of a disconnected dashboard."
              metrics={operationsMetrics}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <ClientOperationsPanel icon={Clock} title="Action Queue" count={workspace.queueItems.length}>
                <ClientActionQueue items={workspace.queueItems} showOrganization={false} />
              </ClientOperationsPanel>

              <ClientOperationsPanel icon={Activity} title="Latest Activity" count={workspace.activities.length}>
                <ClientActivityTimeline activities={workspace.activities} limit={6} />
              </ClientOperationsPanel>
            </div>

            <ClientOperationsPanel icon={FileText} title="Latest Client-Facing Updates">
              <div className="space-y-3">
                {latestUpdate ? (
                  <article className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{latestUpdate.title}</div>
                      <StatusBadge label={latestUpdate.visibleToClient === false ? "Internal" : "Client visible"} size="sm" />
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{latestUpdate.body}</p>
                  </article>
                ) : (
                  <EmptyState variant="compact" icon={FileText} title="No updates yet" />
                )}
                {latestReport ? (
                  <article className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                    <div className="text-sm font-semibold">{latestReport.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">Latest report period ending {formatClientPortalDate(latestReport.periodEnd)}</div>
                  </article>
                ) : null}
              </div>
            </ClientOperationsPanel>

            <ClientOperationsPanel icon={Activity} title="Projects">
              {overview.projects.length === 0 ? (
                <EmptyState variant="compact" icon={Activity} title="No projects yet" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {overview.projects.map((project) => (
                    <article key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{project.name}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{project.progress || 0}% complete</div>
                        </div>
                        <StatusBadge label={getClientPortalOptionLabel(CLIENT_PROJECT_STATUSES, project.status)} size="sm" />
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--card-surface)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${project.progress || 0}%` }} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </ClientOperationsPanel>

            <ClientOperationsPanel icon={BriefcaseBusiness} title="Work Areas">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={withClientOperationsClientParam(item.href, workspace.selectedId)}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <Icon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
                      <div className="mt-3 text-sm font-semibold">{item.title}</div>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                    </Link>
                  );
                })}
              </div>
            </ClientOperationsPanel>

            {billingStatus ? (
              <ClientOperationsPanel icon={BriefcaseBusiness} title="Billing Snapshot">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{getClientBillingTierLabel(overview.organization, billingStatus)}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">Renewal {formatClientPortalDate(billingStatus.renewalAt)}</div>
                  </div>
                  <StatusBadge label={billingStatus.status} size="sm" />
                </div>
              </ClientOperationsPanel>
            ) : null}
          </div>
        );
      }}
    </ClientOperationsShell>
  );
}
