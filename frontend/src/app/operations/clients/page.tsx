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
  Ticket,
  UserPlus,
} from "lucide-react";
import ClientOperationsPanel from "@/components/client-portal/ClientOperationsPanel";
import ClientOperationsShell from "@/components/client-portal/ClientOperationsShell";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { withClientOperationsClientParam } from "@/lib/client-operations-navigation";
import { getClientPortalOptionLabel, CLIENT_PROJECT_STATUSES } from "@/lib/client-portal-options";
import { formatClientPortalDate } from "@/lib/client-portal-display";

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
        const openApprovals = (overview.approvals || []).filter((approval) => approval.status === "pending");
        const openWork = (overview.workItems || []).filter((item) => !["completed", "archived"].includes(item.status));
        const latestUpdate = overview.updates[0] || null;
        const latestReport = overview.reports?.[0] || null;
        const billingStatus = overview.billingStatus;

        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Open work", value: openWork.length, icon: Activity },
                { label: "Open requests", value: workspace.summary.openTicketCount, icon: Ticket },
                { label: "Approvals", value: openApprovals.length, icon: CheckCircle2 },
                { label: "Reports", value: overview.reports?.length || 0, icon: FileText },
              ].map((item) => {
                const Icon = item.icon;

                return (
                <section key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-[var(--muted)]">{item.label}</div>
                      <div className="mt-1 text-2xl font-semibold">{item.value}</div>
                    </div>
                    <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
                  </div>
                </section>
                );
              })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <ClientOperationsPanel icon={Clock} title="Next Attention">
                <div className="space-y-3">
                  {openApprovals[0] ? (
                    <Link
                      href={withClientOperationsClientParam("/operations/clients/approvals", workspace.selectedId)}
                      className="block rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <div className="text-sm font-semibold">{openApprovals[0].title}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Approval waiting for client decision</div>
                    </Link>
                  ) : null}
                  {overview.tickets[0] ? (
                    <Link
                      href={withClientOperationsClientParam("/operations/clients/requests", workspace.selectedId)}
                      className="block rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-hover)]"
                    >
                      <div className="text-sm font-semibold">{overview.tickets[0].title}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">Latest client request</div>
                    </Link>
                  ) : null}
                  {openApprovals.length === 0 && overview.tickets.length === 0 ? (
                    <EmptyState variant="compact" icon={CheckCircle2} title="No urgent client actions" />
                  ) : null}
                </div>
              </ClientOperationsPanel>

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
            </div>

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
                    <div className="text-sm font-semibold">{billingStatus.planName || "Client plan"}</div>
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
