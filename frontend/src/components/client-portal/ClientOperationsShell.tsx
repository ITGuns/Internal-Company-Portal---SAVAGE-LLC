"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  FolderOpen,
  Gauge,
  Map,
  MessageSquare,
  ShieldCheck,
  Ticket,
  UserPlus,
} from "lucide-react";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  ProductionMetricStrip,
  ProductionPanel,
  ProductionStatusHero,
  type ProductionMetricItem,
} from "@/components/workspace/ProductionWorkspace";
import { useClientOperationsWorkspace, type ClientOperationsWorkspace } from "@/hooks/useClientOperationsWorkspace";
import { splitClientOrganizationsByHistory } from "@/lib/client-organization-history";
import {
  CLIENT_OPERATIONS_NAV_ITEMS,
  getClientOperationsRouteTitle,
  isClientOperationsNavItemActive,
  withClientOperationsClientParam,
} from "@/lib/client-operations-navigation";
import { buildClientCommandCenter } from "@/lib/client-portal-command";
import { getClientBillingTierLabel } from "@/lib/client-portal-display";
import { cn } from "@/lib/utils";

function ClientOrganizationButton({
  organization,
  isSelected,
  onSelect,
}: {
  organization: ClientOperationsWorkspace["organizations"][number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors",
        isSelected
          ? "border-[var(--accent)] bg-[var(--card-surface)]"
          : "border-[var(--border)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-sm font-semibold">{organization.name}</div>
        {organization.status !== "active" ? <StatusBadge label={organization.status} size="sm" /> : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="truncate">{organization.slug}</span>
        <span>{organization.counts?.tickets || 0} requests</span>
      </div>
    </button>
  );
}

function ClientOperationsClientPicker({ workspace }: { workspace: ClientOperationsWorkspace }) {
  const { current, history } = splitClientOrganizationsByHistory(workspace.organizations);

  return (
    <aside className="min-w-0 space-y-4" aria-label="Client account selector">
      <ProductionPanel title="Clients" icon={BriefcaseBusiness} bodyClassName="p-4">
        {workspace.organizations.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={BriefcaseBusiness}
            title="No clients yet"
            description="Create the first client from Accounts."
          />
        ) : (
          <div className="mt-4 space-y-2">
            <select
              className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={workspace.selectedId}
              onChange={(event) => workspace.selectClient(event.target.value)}
              aria-label="Selected client"
            >
              {current.length > 0 ? (
                <optgroup label="Current clients">
                  {current.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.status === "active" ? organization.name : `${organization.name} (${organization.status})`}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {history.length > 0 ? (
                <optgroup label="History">
                  {history.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name} (archived)</option>
                  ))}
                </optgroup>
              ) : null}
            </select>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase text-[var(--muted)]">Current</div>
                {current.length > 0 ? (
                  current.map((organization) => (
                    <ClientOrganizationButton
                      key={organization.id}
                      organization={organization}
                      isSelected={workspace.selectedId === organization.id}
                      onSelect={() => workspace.selectClient(organization.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-xs leading-5 text-[var(--muted)]">
                    No current clients. Restored accounts will return here.
                  </div>
                )}
              </div>

              {history.length > 0 ? (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--muted)]">
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>History</span>
                    <span className="ml-auto rounded-full bg-[var(--card-surface)] px-2 py-0.5">{history.length}</span>
                  </div>
                  {history.map((organization) => (
                    <ClientOrganizationButton
                      key={organization.id}
                      organization={organization}
                      isSelected={workspace.selectedId === organization.id}
                      onSelect={() => workspace.selectClient(organization.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </ProductionPanel>
    </aside>
  );
}

function ClientOperationsTopNav({
  pathname,
  selectedId,
}: {
  pathname: string;
  selectedId: string;
}) {
  return (
    <nav
      aria-label="Client operations sections"
      className="mt-4 border-y border-[var(--border)] bg-[var(--surface-raised)]/70 px-2 py-2 shadow-[0_18px_42px_-38px_var(--accent)] backdrop-blur"
    >
      <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CLIENT_OPERATIONS_NAV_ITEMS.map((item) => {
          const isActive = isClientOperationsNavItemActive(item.href, pathname);

          return (
            <Link
              key={item.href}
              href={withClientOperationsClientParam(item.href, selectedId)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border px-3 text-xs font-semibold",
                "transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]",
                "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_0_24px_-16px_var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--muted)] hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function ClientOperationsClientHeader({ workspace }: { workspace: ClientOperationsWorkspace }) {
  const organization = workspace.selectedOrganization;
  if (!organization || !workspace.overview) return null;

  const summaryItems: ProductionMetricItem[] = [
    { label: "Projects", value: workspace.summary.projectCount, caption: "Delivery tracks", icon: Activity, tone: "info" },
    { label: "Requests", value: workspace.summary.openTicketCount, caption: "Open client asks", icon: Ticket, tone: "warning" },
    { label: "Updates", value: workspace.summary.updateCount, caption: "Published notes", icon: FileText, tone: "success" },
    { label: "Progress", value: `${workspace.summary.averageProgress}%`, caption: "Average visible progress", icon: Gauge, tone: "accent" },
  ];

  return (
    <ProductionStatusHero
      eyebrow="Client operations"
      title={organization.name}
      description="Admin control for the client-facing communication loop: delivery progress, requests, approvals, reports, assets, billing, and scheduled work."
      icon={BriefcaseBusiness}
      status={<StatusBadge label={organization.status} size="sm" className="border border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-accent-soft)] text-[var(--workspace-ink-accent)]" />}
      metrics={summaryItems}
    >
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">Client slug</div>
          <div className="mt-1 truncate text-sm font-semibold text-[var(--workspace-ink-foreground)]">{organization.slug}</div>
        </div>

        <div className="border-t border-[var(--workspace-ink-border)] pt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">Website</div>
          <div className="mt-2">
            {organization.websiteUrl ? (
              <a
                className="inline-flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--workspace-ink-foreground)] transition-colors hover:bg-[var(--workspace-ink-accent-soft)] hover:text-[var(--workspace-ink-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--workspace-ink-accent)]"
                href={organization.websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="truncate">{organization.websiteUrl}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-sm text-[var(--workspace-ink-muted)]">No website URL</span>
            )}
          </div>
        </div>

        <div className="grid gap-3 border-t border-[var(--workspace-ink-border)] pt-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">Service tier</div>
            <div className="mt-1 text-sm font-semibold text-[var(--workspace-ink-foreground)]">{organization.tier?.name || "No tier set"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">Members</div>
            <div className="mt-1 text-sm font-semibold text-[var(--workspace-ink-foreground)]">{organization.counts?.memberships || workspace.memberships.length || 0}</div>
          </div>
        </div>
      </div>
    </ProductionStatusHero>
  );
}

function ClientOperationsRouteSummary({
  pathname,
  routeTitle,
  workspace,
}: {
  pathname: string;
  routeTitle: { title: string; subtitle?: string };
  workspace: ClientOperationsWorkspace;
}) {
  const currentOverview = workspace.overview;
  if (!currentOverview) return null;

  const command = buildClientCommandCenter(currentOverview);
  const approvals = currentOverview.approvals || [];
  const reports = currentOverview.reports || [];
  const assets = currentOverview.assets || [];
  const calendarItems = currentOverview.calendarItems || [];
  const roadmapItems = currentOverview.roadmapRecommendations || [];
  const openApprovals = approvals.filter((approval) => approval.status === "pending");
  const openWork = command.openWorkItems;
  const completedWorkItems = (currentOverview.workItems || []).filter((item) => ["completed", "done"].includes(item.status));
  const resources = currentOverview.resources || [];
  const ticketComments = currentOverview.tickets.reduce((total, ticket) => total + (ticket.comments?.length || 0), 0);

  function metricsForRoute(overview: NonNullable<ClientOperationsWorkspace["overview"]>): ProductionMetricItem[] {
    if (pathname.includes("/accounts")) {
      return [
        { label: "Members", value: workspace.memberships.length, caption: "Assigned client users", icon: UserPlus, tone: "accent" },
        { label: "Account status", value: workspace.selectedOrganization?.status || "Unknown", caption: "Current access state", icon: ShieldCheck, tone: "success" },
        { label: "Requests", value: workspace.summary.openTicketCount, caption: "Open client asks", icon: Ticket, tone: "warning" },
        { label: "Projects", value: workspace.summary.projectCount, caption: "Delivery tracks", icon: Activity, tone: "info" },
      ];
    }

    if (pathname.includes("/delivery")) {
      return [
        { label: "Projects", value: overview.projects.length, caption: "Tracked delivery areas", icon: Activity, tone: "info" },
        { label: "Open work", value: openWork.length, caption: "Active client-visible tasks", icon: Gauge, tone: "accent" },
        { label: "Completed", value: completedWorkItems.length, caption: "Published completion records", icon: CheckCircle2, tone: "success" },
        { label: "Updates", value: overview.updates.length, caption: "Progress notes", icon: FileText, tone: "warning" },
      ];
    }

    if (pathname.includes("/requests")) {
      return [
        { label: "Tickets", value: overview.tickets.length, caption: "All client requests", icon: Ticket, tone: "accent" },
        { label: "Open", value: command.openRequests.length, caption: "Not closed yet", icon: Activity, tone: "warning" },
        { label: "Replies", value: ticketComments, caption: "Visible and internal notes", icon: MessageSquare, tone: "info" },
        { label: "Queue", value: workspace.queueItems.length, caption: "Derived next actions", icon: Gauge, tone: "success" },
      ];
    }

    if (pathname.includes("/approvals")) {
      return [
        { label: "Pending", value: openApprovals.length, caption: "Waiting on decision", icon: CheckCircle2, tone: "warning" },
        { label: "Total approvals", value: approvals.length, caption: "Approval records", icon: FileText, tone: "accent" },
        { label: "Client-visible", value: approvals.filter((approval) => approval.visibleToClient !== false).length, caption: "Shown in portal", icon: ShieldCheck, tone: "success" },
        { label: "Queue", value: command.reviewRequests.length, caption: "Actionable reviews", icon: Gauge, tone: "info" },
      ];
    }

    if (pathname.includes("/reports")) {
      return [
        { label: "Reports", value: reports.length, caption: "Monthly records", icon: BarChart3, tone: "accent" },
        { label: "Metrics", value: overview.metrics.length, caption: "Published snapshots", icon: Gauge, tone: "info" },
        { label: "Leads", value: reports[0]?.leadsCaptured ?? 0, caption: "Latest report signal", icon: Activity, tone: "success" },
        { label: "Follow-up", value: reports[0]?.followUpStatus || "Not set", caption: "Latest report state", icon: CheckCircle2, tone: "warning" },
      ];
    }

    if (pathname.includes("/assets")) {
      return [
        { label: "Resources", value: resources.length, caption: "Shared links", icon: FolderOpen, tone: "accent" },
        { label: "Assets", value: assets.length, caption: "Production files", icon: FileText, tone: "info" },
        { label: "Client-visible", value: assets.filter((asset) => asset.visibleToClient !== false).length, caption: "Shown in portal", icon: ShieldCheck, tone: "success" },
        { label: "Requested", value: assets.filter((asset) => asset.status === "requested").length, caption: "Needs client asset", icon: Ticket, tone: "warning" },
      ];
    }

    if (pathname.includes("/billing")) {
      const billing = overview.billingStatus;
      return [
        { label: "Status", value: billing?.status || "Not set", caption: "Client billing state", icon: CreditCard, tone: "accent" },
        { label: "Tier", value: getClientBillingTierLabel(workspace.selectedOrganization, billing), caption: "Service level", icon: BriefcaseBusiness, tone: "info" },
        { label: "Visible", value: billing ? (billing.visibleToClient === false ? "No" : "Yes") : "Not set", caption: "Client portal exposure", icon: ShieldCheck, tone: "success" },
        { label: "Renewal", value: billing?.renewalAt ? "Scheduled" : "Not set", caption: "Renewal date state", icon: CalendarDays, tone: "warning" },
      ];
    }

    if (pathname.includes("/roadmap")) {
      return [
        { label: "Ideas", value: roadmapItems.length, caption: "Recommendations", icon: Map, tone: "accent" },
        { label: "Next", value: roadmapItems.filter((item) => item.status === "next").length, caption: "Near-term priorities", icon: Activity, tone: "warning" },
        { label: "Planned", value: roadmapItems.filter((item) => item.status === "planned").length, caption: "Committed roadmap", icon: CalendarDays, tone: "info" },
        { label: "Client-visible", value: roadmapItems.filter((item) => item.visibleToClient !== false).length, caption: "Shown in portal", icon: ShieldCheck, tone: "success" },
      ];
    }

    if (pathname.includes("/calendar")) {
      return [
        { label: "Items", value: calendarItems.length, caption: "Scheduled records", icon: CalendarDays, tone: "accent" },
        { label: "Scheduled", value: calendarItems.filter((item) => item.status === "scheduled").length, caption: "Ready on calendar", icon: CheckCircle2, tone: "success" },
        { label: "Planned", value: calendarItems.filter((item) => item.status === "planned").length, caption: "Draft schedule", icon: Activity, tone: "info" },
        { label: "Client-visible", value: calendarItems.filter((item) => item.visibleToClient !== false).length, caption: "Shown in portal", icon: ShieldCheck, tone: "warning" },
      ];
    }

    return [
      { label: "Open work", value: openWork.length, caption: "Client-visible production items", icon: Activity, tone: "info" },
      { label: "Open requests", value: workspace.summary.openTicketCount, caption: "Client asks needing handling", icon: Ticket, tone: "warning" },
      { label: "Approvals", value: openApprovals.length, caption: "Waiting on decisions", icon: CheckCircle2, tone: "success" },
      { label: "Reports", value: reports.length, caption: "Client performance records", icon: BarChart3, tone: "accent" },
    ];
  }

  return (
    <ProductionMetricStrip
      eyebrow="Control surface"
      title={`${routeTitle.title} for ${currentOverview.organization.name}`}
      description={routeTitle.subtitle || "Client operations control route."}
      metrics={metricsForRoute(currentOverview)}
    />
  );
}

export default function ClientOperationsShell({
  children,
}: {
  children: (workspace: ClientOperationsWorkspace) => React.ReactNode;
}) {
  const workspace = useClientOperationsWorkspace();
  const pathname = usePathname() || "/operations/clients";
  const routeTitle = getClientOperationsRouteTitle(pathname);

  if (workspace.userLoading) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-0">
          <Header title={routeTitle.title} subtitle={routeTitle.subtitle} />
          <div className="mt-6 text-sm text-[var(--muted)]">Checking client operations access...</div>
        </div>
      </main>
    );
  }

  if (!workspace.canManageClients) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-0">
          <Header title={routeTitle.title} subtitle={routeTitle.subtitle} />
          <div className="mt-6">
            <EmptyState
              icon={ShieldCheck}
              title="Client operations access required"
              description="Client administration is available to admins, operations managers, and web developers."
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title={routeTitle.title} subtitle={routeTitle.subtitle} />
        <ClientOperationsTopNav pathname={pathname} selectedId={workspace.selectedId} />

        <div className="mt-6 space-y-5">
          {workspace.loading ? (
            <div className="text-sm text-[var(--muted)]">Loading client operations...</div>
          ) : (
            <div className="grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
              <ClientOperationsClientPicker workspace={workspace} />
              <div className="min-w-0 space-y-5">
                <ClientOperationsClientHeader workspace={workspace} />
                <ClientOperationsRouteSummary pathname={pathname} routeTitle={routeTitle} workspace={workspace} />
                {children(workspace)}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
