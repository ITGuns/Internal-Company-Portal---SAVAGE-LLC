"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gauge,
  LinkIcon,
  MessageSquare,
  Plus,
  Send,
  Ticket,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/Button";
import ClientActionQueue from "@/components/client-portal/ClientActionQueue";
import ClientActivityTimeline from "@/components/client-portal/ClientActivityTimeline";
import ChoiceGroup from "@/components/client-portal/ChoiceGroup";
import TicketDetailPresets from "@/components/client-portal/TicketDetailPresets";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  ProductionMetricStrip,
  ProductionPanel,
  ProductionStatusHero,
  type ProductionMetricItem,
} from "@/components/workspace/ProductionWorkspace";
import { useToast } from "@/components/ToastProvider";
import {
  fetchClientActionQueue,
  fetchClientActivity,
  type ClientActionQueueItem,
  type ClientActivity,
} from "@/lib/client-activity";
import {
  ClientOrganization,
  ClientPortalOverview,
  createClientTicket,
  fetchClientOrganizations,
  fetchClientOverview,
} from "@/lib/client-portal";
import {
  buildClientTicketTitle,
  CLIENT_PROJECT_STATUSES,
  CLIENT_TICKET_CATEGORIES,
  CLIENT_TICKET_PRIORITIES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { formatClientPortalDate } from "@/lib/client-portal-display";
import { buildClientCommandCenter } from "@/lib/client-portal-command";
import { buildClientPortalSummary } from "@/lib/client-portal-summary";

const textareaClass = "min-h-28 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
const heroActionClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--workspace-ink-accent)]";

function clampPercent(value?: number | null) {
  return Math.min(100, Math.max(0, value || 0));
}

export default function ClientPortalPage() {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState<ClientPortalOverview | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [queueItems, setQueueItems] = useState<ClientActionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ticketForm, setTicketForm] = useState({ description: "", category: "website", priority: "normal" });

  const summary = useMemo(() => buildClientPortalSummary(overview), [overview]);
  const commandCenter = useMemo(() => buildClientCommandCenter(overview), [overview]);
  const projectNameById = useMemo(
    () => new Map((overview?.projects || []).map((project) => [project.id, project.name])),
    [overview],
  );
  const latestUpdate = commandCenter.latestUpdate;
  const latestMessage = commandCenter.latestMessage;
  const nextActionItem = commandCenter.reviewRequests[0] || commandCenter.openRequests[0] || null;
  const visibleResources = useMemo(() => {
    const resources = (overview?.resources || []).map((resource) => ({
      id: resource.id,
      label: resource.label,
      url: resource.url,
      meta: getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, resource.type),
    }));
    const assets = commandCenter.assets.map((asset) => ({
      id: asset.id,
      label: asset.label,
      url: asset.url,
      meta: asset.status,
    }));
    return [...resources, ...assets];
  }, [commandCenter.assets, overview?.resources]);

  const heroMetrics: ProductionMetricItem[] = [
    { label: "Average progress", value: `${summary.averageProgress}%`, caption: "Across visible client projects" },
    { label: "Client actions", value: commandCenter.reviewRequests.length, caption: "Approvals or reviews waiting" },
    { label: "Open work", value: commandCenter.openWorkItems.length, caption: "Visible production items" },
    { label: "Reports", value: overview?.reports?.length || 0, caption: "Published or drafted summaries" },
  ];

  const stripMetrics: ProductionMetricItem[] = [
    { label: "Projects", value: summary.projectCount, caption: "Active delivery tracks", icon: Activity, tone: "info" },
    { label: "Requests", value: summary.openTicketCount, caption: "Open client requests", icon: Ticket, tone: "warning" },
    { label: "Updates", value: summary.updateCount, caption: "Team progress notes", icon: FileText, tone: "success" },
    { label: "Resources", value: summary.resourceCount + commandCenter.assets.length, caption: "Links, assets, and files", icon: LinkIcon, tone: "accent" },
  ];

  const loadOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    setOrganizations(nextOrganizations);
    setSelectedId((current) => current || nextOrganizations[0]?.id || "");
  }, []);

  const loadOverview = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setOverview(null);
      setActivities([]);
      setQueueItems([]);
      return;
    }
    const [nextOverview, nextActivities, nextQueueItems] = await Promise.all([
      fetchClientOverview(organizationId),
      fetchClientActivity(organizationId, { limit: 30 }),
      fetchClientActionQueue(organizationId),
    ]);
    setOverview(nextOverview);
    setActivities(nextActivities);
    setQueueItems(nextQueueItems);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        setLoading(true);
        await loadOrganizations();
      } catch (error) {
        console.error(error);
        toast.error("Failed to load client portal");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      isMounted = false;
    };
  }, [loadOrganizations, toast]);

  useEffect(() => {
    loadOverview(selectedId).catch((error) => {
      console.error(error);
      toast.error("Failed to load client overview");
    });
  }, [loadOverview, selectedId, toast]);

  async function handleCreateTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !ticketForm.description.trim()) {
      toast.error("Request details are required");
      return;
    }

    setSaving(true);
    try {
      await createClientTicket(selectedId, {
        ...ticketForm,
        title: buildClientTicketTitle(ticketForm.category, ticketForm.description),
      });
      setTicketForm({ description: "", category: "website", priority: "normal" });
      await loadOverview(selectedId);
      toast.success("Request submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-4 pt-0 sm:p-6 sm:pt-0">
        <Header title="Client Portal" subtitle="Progress, requests, approvals, reports, resources, and next actions." />

        {loading ? (
          <div className="mt-6 text-sm text-[var(--muted)]">Loading client workspace...</div>
        ) : organizations.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={BriefcaseBusiness} title="No client workspace assigned" description="Your account is not connected to a client organization yet." />
          </div>
        ) : overview ? (
          <div className="mt-6 space-y-5">
            <ProductionStatusHero
              eyebrow="Client command center"
              title={`${overview.organization.name} delivery cockpit`}
              description="A single place to see what moved, what needs your input, and what the team is preparing next without exposing internal production notes."
              icon={BriefcaseBusiness}
              status={<StatusBadge label={overview.organization.status} size="sm" className="border border-[var(--workspace-ink-border)] bg-[var(--workspace-ink-accent-soft)] text-[var(--workspace-ink-accent)]" />}
              metrics={heroMetrics}
              actions={(
                <>
                  <a href="#submit-request" className={`${heroActionClass} border-[var(--workspace-ink-accent)] bg-[var(--workspace-ink-accent)] text-[var(--accent-foreground)] hover:brightness-105`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Submit Request
                  </a>
                  <Link href="/client/reports" className={`${heroActionClass} border-[var(--workspace-ink-border)] bg-transparent text-[var(--workspace-ink-foreground)] hover:bg-[var(--workspace-ink-accent-soft)] hover:text-[var(--workspace-ink-accent)]`}>
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    View Reports
                  </Link>
                </>
              )}
            >
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">Delivery progress</div>
                      <div className="mt-1 text-3xl font-semibold tabular-nums text-[var(--workspace-ink-foreground)]">{summary.averageProgress}%</div>
                    </div>
                    <Gauge className="h-9 w-9 text-[var(--workspace-ink-accent)]" aria-hidden="true" />
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--workspace-ink-border)]">
                    <div className="h-full rounded-full bg-[var(--workspace-ink-accent)]" style={{ width: `${clampPercent(summary.averageProgress)}%` }} />
                  </div>
                </div>

                <div className="grid gap-4 border-t border-[var(--workspace-ink-border)] pt-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      Latest update
                    </div>
                    <div className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--workspace-ink-foreground)]">{latestUpdate?.title || "No update published yet"}</div>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--workspace-ink-muted)]">
                      {latestUpdate?.body || "Progress notes will appear here when the team publishes client-visible updates."}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--workspace-ink-muted)]">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Your next action
                    </div>
                    <div className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--workspace-ink-foreground)]">
                      {nextActionItem ? nextActionItem.title : "No action needed right now"}
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--workspace-ink-muted)]">
                      {nextActionItem
                        ? "Open requests or approvals, review the item, and reply with approval or needed changes."
                        : "Keep watching progress here. New reviews, approvals, and replies will be queued automatically."}
                    </p>
                  </div>
                </div>
              </div>
            </ProductionStatusHero>

            <ProductionMetricStrip
              eyebrow="Workspace signal"
              title="The live client delivery picture"
              description="These numbers come from your current workspace data, so the page stays useful without fake executive metrics."
              metrics={stripMetrics}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="space-y-5">
                <ProductionPanel title="Delivery Progress" icon={Activity} count={overview.projects.length}>
                  {overview.projects.length === 0 ? (
                    <EmptyState variant="compact" icon={Activity} title="No active projects yet" />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {overview.projects.map((project) => (
                        <article key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold">{project.name}</h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{project.summary || "Progress is being prepared."}</p>
                            </div>
                            <StatusBadge label={getClientPortalOptionLabel(CLIENT_PROJECT_STATUSES, project.status)} size="sm" />
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--card-bg)]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${clampPercent(project.progress)}%` }} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                            <span>{project.progress || 0}% complete</span>
                            <span>Updated {formatClientPortalDate(project.updatedAt)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  {commandCenter.openWorkItems.length > 0 ? (
                    <div className="mt-5 border-t border-[var(--border)] pt-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">Current visible work</h3>
                        <span className="text-xs text-[var(--muted)]">{commandCenter.openWorkItems.length} open</span>
                      </div>
                      <div className="grid gap-2">
                        {commandCenter.openWorkItems.slice(0, 4).map((item) => (
                          <div key={item.id} className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{item.title}</div>
                              <div className="mt-1 text-xs text-[var(--muted)]">{item.dueAt ? `Due ${formatClientPortalDate(item.dueAt)}` : "No due date set"}</div>
                            </div>
                            <div className="min-w-0">
                              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-surface)]">
                                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${clampPercent(item.progress)}%` }} />
                              </div>
                              <div className="mt-1 text-right text-xs text-[var(--muted)]">{item.progress || 0}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </ProductionPanel>

                <ProductionPanel title="Progress Updates" icon={FileText} count={overview.updates.length}>
                  {overview.updates.length === 0 ? (
                    <EmptyState variant="compact" icon={FileText} title="No updates published yet" />
                  ) : (
                    <div className="space-y-3">
                      {overview.updates.map((update) => (
                        <article key={update.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h3 className="font-medium">{update.title}</h3>
                            {update.projectId && projectNameById.get(update.projectId) ? (
                              <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
                                {projectNameById.get(update.projectId)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{update.body}</p>
                          <time className="mt-3 block text-xs text-[var(--muted)]" dateTime={update.createdAt || undefined}>
                            {formatClientPortalDate(update.createdAt)}
                          </time>
                        </article>
                      ))}
                    </div>
                  )}
                </ProductionPanel>

                <ProductionPanel title="Communication Log" icon={MessageSquare} count={activities.length}>
                  {latestMessage ? (
                    <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Latest message</div>
                      <div className="mt-1 text-sm font-semibold">{latestMessage.ticket.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{latestMessage.comment.body}</p>
                    </div>
                  ) : null}
                  <ClientActivityTimeline activities={activities} limit={6} />
                </ProductionPanel>
              </div>

              <div className="space-y-5">
                <ProductionPanel title="Action Queue" icon={Clock} count={queueItems.length} variant="subtle">
                  <ClientActionQueue items={queueItems} showOrganization={false} />
                </ProductionPanel>

                <ProductionPanel title="Submit Request" icon={Send} eyebrow="Client to team" variant="subtle">
                  <form id="submit-request" onSubmit={handleCreateTicket} className="space-y-4">
                    <ChoiceGroup
                      label="Request Type"
                      options={CLIENT_TICKET_CATEGORIES}
                      value={ticketForm.category}
                      onChange={(category) => setTicketForm((form) => ({ ...form, category }))}
                      variant="pills"
                    />
                    <ChoiceGroup
                      label="Priority"
                      options={CLIENT_TICKET_PRIORITIES}
                      value={ticketForm.priority}
                      onChange={(priority) => setTicketForm((form) => ({ ...form, priority }))}
                      variant="pills"
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor="client-ticket-details" className="text-sm font-medium">Request Details</label>
                        <span className="text-xs text-[var(--muted)]">Pick a starter or type your own</span>
                      </div>
                      <TicketDetailPresets
                        category={ticketForm.category}
                        onSelect={(description) => setTicketForm((form) => ({ ...form, description }))}
                      />
                      <textarea
                        id="client-ticket-details"
                        className={textareaClass}
                        value={ticketForm.description}
                        onChange={(event) => setTicketForm((form) => ({ ...form, description: event.target.value }))}
                        placeholder={`${getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, ticketForm.category)} details`}
                        required
                      />
                    </div>
                    <Button type="submit" loading={saving} fullWidth icon={<Send className="h-4 w-4" />} iconPosition="right">Send Request</Button>
                  </form>
                </ProductionPanel>

                <ProductionPanel title="Performance Snapshot" icon={TrendingUp} count={commandCenter.reportMetrics.length}>
                  {commandCenter.reportMetrics.length === 0 ? (
                    <EmptyState variant="compact" icon={BarChart3} title="No metrics published yet" />
                  ) : (
                    <div className="grid gap-2">
                      {commandCenter.reportMetrics.map((metric) => (
                        <div key={metric.id} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2">
                          <div className="text-lg font-semibold tabular-nums">{metric.value}{metric.unit ? ` ${metric.unit}` : ""}</div>
                          <div className="text-xs text-[var(--muted)]">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </ProductionPanel>

                <ProductionPanel title="Resources & Assets" icon={LinkIcon} count={visibleResources.length}>
                  {visibleResources.length === 0 ? (
                    <EmptyState variant="compact" icon={LinkIcon} title="No resources yet" />
                  ) : (
                    <div className="space-y-2">
                      {visibleResources.map((resource) => (
                        <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{resource.label}</span>
                            <span className="block truncate text-xs text-[var(--muted)]">{resource.meta}</span>
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        </a>
                      ))}
                    </div>
                  )}
                </ProductionPanel>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
