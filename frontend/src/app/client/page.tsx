"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  LinkIcon,
  Plus,
  Ticket,
} from "lucide-react";
import Button from "@/components/Button";
import ChoiceGroup from "@/components/client-portal/ChoiceGroup";
import TicketDetailPresets from "@/components/client-portal/TicketDetailPresets";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
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

const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function Panel({ title, icon: Icon, children, count }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; count?: number }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {typeof count === "number" ? <span className="text-xs text-[var(--muted)]">{count}</span> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function ClientPortalPage() {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState<ClientPortalOverview | null>(null);
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
  const nextActionTicket = commandCenter.reviewRequests[0] || null;

  const loadOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    setOrganizations(nextOrganizations);
    setSelectedId((current) => current || nextOrganizations[0]?.id || "");
  }, []);

  const loadOverview = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setOverview(null);
      return;
    }
    setOverview(await fetchClientOverview(organizationId));
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
      toast.success("Ticket submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Client Portal" subtitle="Project progress, requests, updates, performance, and resources." />

        {loading ? (
          <div className="mt-6 text-sm text-[var(--muted)]">Loading client workspace...</div>
        ) : organizations.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={BriefcaseBusiness} title="No client workspace assigned" description="Your account is not connected to a client organization yet." />
          </div>
        ) : overview ? (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <select
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                aria-label="Client organization"
              >
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
              <Link href="/client/tickets" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline">
                <Ticket className="h-4 w-4" />
                Ticket center
              </Link>
            </div>

            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase text-[var(--muted)]">{overview.organization.slug}</div>
                  <h1 className="mt-1 text-xl font-semibold">{overview.organization.name}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
                    See what moved, what needs your input, and how the work is progressing without exposing internal production details.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  {[
                    ["Projects", summary.projectCount],
                    ["Open tickets", summary.openTicketCount],
                    ["Updates", summary.updateCount],
                    ["Progress", `${summary.averageProgress}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3">
                      <div className="text-lg font-semibold">{value}</div>
                      <div className="text-xs text-[var(--muted)]">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-4 lg:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase text-[var(--muted)]">Latest Team Update</div>
                  <div className="mt-1 text-sm font-semibold">{latestUpdate?.title || "No update published yet"}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {latestUpdate?.body || "The team will post progress notes here as work becomes visible to you."}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-[var(--muted)]">Your Next Action</div>
                  <div className="mt-1 text-sm font-semibold">
                    {nextActionTicket ? `Review: ${nextActionTicket.title}` : "No action needed right now"}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {nextActionTicket
                      ? "Open the ticket center, review the request, and reply with approval or changes."
                      : "You can keep watching progress here. New requests or approvals will appear in Tickets."}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
              <div className="space-y-5">
                <Panel title="Projects" icon={Activity} count={overview.projects.length}>
                  {overview.projects.length === 0 ? (
                    <EmptyState variant="compact" icon={Activity} title="No active projects yet" />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {overview.projects.map((project) => (
                        <div key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate font-medium">{project.name}</div>
                            <StatusBadge label={getClientPortalOptionLabel(CLIENT_PROJECT_STATUSES, project.status)} size="sm" />
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{project.summary || "Progress is being prepared."}</p>
                          <div className="mt-4 h-2 rounded-full bg-[var(--card-surface)]">
                            <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                            <span>{project.progress || 0}% complete</span>
                            <span>Updated {formatClientPortalDate(project.updatedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Updates" icon={FileText} count={overview.updates.length}>
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
                          <p className="mt-2 text-sm text-[var(--muted)]">{update.body}</p>
                          <time className="mt-3 block text-xs text-[var(--muted)]" dateTime={update.createdAt || undefined}>
                            {formatClientPortalDate(update.createdAt)}
                          </time>
                        </article>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>

              <div className="space-y-5">
                <Panel title="Submit Request" icon={Plus}>
                  <form onSubmit={handleCreateTicket} className="space-y-4">
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
                    <Button type="submit" loading={saving} fullWidth>Send Request</Button>
                  </form>
                </Panel>

                <Panel title="Performance" icon={BarChart3} count={overview.metrics.length}>
                  {overview.metrics.length === 0 ? (
                    <EmptyState variant="compact" icon={BarChart3} title="No metrics published yet" />
                  ) : (
                    <div className="grid gap-2">
                      {overview.metrics.map((metric) => (
                        <div key={metric.id} className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2">
                          <div className="text-lg font-semibold">{metric.value}{metric.unit ? ` ${metric.unit}` : ""}</div>
                          <div className="text-xs text-[var(--muted)]">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel title="Resources" icon={LinkIcon} count={overview.resources.length}>
                  {overview.resources.length === 0 ? (
                    <EmptyState variant="compact" icon={LinkIcon} title="No resources yet" />
                  ) : (
                    <div className="space-y-2">
                      {overview.resources.map((resource) => (
                        <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-hover)]">
                          <span className="min-w-0 truncate">{resource.label}</span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        </a>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
