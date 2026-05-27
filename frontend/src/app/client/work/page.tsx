"use client";

import { Activity, CheckCircle2, ClipboardList, Ticket } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import { buildClientCommandCenter } from "@/lib/client-portal-command";
import {
  CLIENT_PROJECT_STATUSES,
  CLIENT_TICKET_STATUSES,
  CLIENT_WORK_ITEM_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { formatClientPortalDate } from "@/lib/client-portal-display";
import type { ClientUpdate, ClientWorkItem } from "@/lib/client-portal";

function getCompletedWorkBody(item: ClientUpdate | ClientWorkItem): string {
  if ("body" in item) return item.body;
  return item.description || "Work item completed and logged by the team.";
}

function getCompletedWorkDate(item: ClientUpdate | ClientWorkItem): string | null | undefined {
  if ("createdAt" in item) return item.createdAt;
  return item.completedAt || item.updatedAt;
}

export default function ClientWorkPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Work"
      subtitle="Website progress, open requests, and completed work."
    >
      {({ overview }) => {
        if (!overview) return null;
        const command = buildClientCommandCenter(overview);

        return (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <ClientPortalPanel title="Website Build Progress" icon={Activity} count={`${command.averageProgress}%`}>
                {overview.projects.length === 0 ? (
                  <EmptyState variant="compact" icon={Activity} title="No active website work yet" />
                ) : (
                  <div className="space-y-3">
                    {overview.projects.map((project) => (
                      <article key={project.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-medium">{project.name}</h3>
                            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                              {project.summary || "Progress details are being prepared."}
                            </p>
                          </div>
                          <StatusBadge label={getClientPortalOptionLabel(CLIENT_PROJECT_STATUSES, project.status)} size="sm" />
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-[var(--card-surface)]">
                          <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]">
                          <span>{project.progress || 0}% complete</span>
                          <span>Updated {formatClientPortalDate(project.updatedAt)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </ClientPortalPanel>

              <ClientPortalPanel title="Completed Work Log" icon={CheckCircle2} count={command.recentCompletedWork.length}>
                {command.recentCompletedWork.length === 0 ? (
                  <EmptyState variant="compact" icon={CheckCircle2} title="No completed work published yet" />
                ) : (
                  <div className="space-y-3">
                    {command.recentCompletedWork.map((item) => (
                      <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="font-medium">{item.title}</h3>
                          <time className="text-xs text-[var(--muted)]" dateTime={getCompletedWorkDate(item) || undefined}>
                            {formatClientPortalDate(getCompletedWorkDate(item))}
                          </time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{getCompletedWorkBody(item)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </ClientPortalPanel>
            </div>

            <div className="space-y-5">
              <ClientPortalPanel title="Open Requests" icon={Ticket} count={command.openRequests.length}>
                {command.openRequests.length === 0 ? (
                  <EmptyState variant="compact" icon={Ticket} title="No open requests" />
                ) : (
                  <div className="space-y-2">
                    {command.openRequests.map((ticket) => (
                      <article key={ticket.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-medium">{ticket.title}</h3>
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{ticket.description || "No details provided."}</p>
                          </div>
                          <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, ticket.status)} size="sm" />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </ClientPortalPanel>

              <ClientPortalPanel title="Open Tasks" icon={ClipboardList} count={command.openWorkItems.length}>
                {command.openWorkItems.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    icon={ClipboardList}
                    title="No open client tasks"
                    description="Tasks assigned to the current client workflow will appear here."
                  />
                ) : (
                  <div className="space-y-2">
                    {command.openWorkItems.map((item) => (
                      <article key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-medium">{item.title}</h3>
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{item.description || "No details provided."}</p>
                          </div>
                          <StatusBadge label={getClientPortalOptionLabel(CLIENT_WORK_ITEM_STATUSES, item.status)} size="sm" />
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-[var(--card-surface)]">
                          <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, Math.max(0, item.progress || 0))}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]">
                          <span>{item.progress || 0}% complete</span>
                          <span>Due {formatClientPortalDate(item.dueAt)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </ClientPortalPanel>
            </div>
          </div>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
