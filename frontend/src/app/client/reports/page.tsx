"use client";

import { BarChart3, FileText, TrendingUp } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import { buildClientCommandCenter } from "@/lib/client-portal-command";
import { formatClientPortalDate } from "@/lib/client-portal-display";

function formatReportObject(value?: Record<string, unknown> | null): Array<[string, string]> {
  if (!value) return [];
  return Object.entries(value).map(([key, item]) => [key, String(item)]);
}

export default function ClientReportsPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Reports"
      subtitle="Monthly performance, leads, reviews, and local visibility."
    >
      {({ overview }) => {
        if (!overview) return null;
        const command = buildClientCommandCenter(overview);
        const sourceBreakdown = formatReportObject(command.latestReport?.leadSourceBreakdown);
        const reputation = formatReportObject(command.latestReport?.reputationSnapshot);
        const visibility = formatReportObject(command.latestReport?.localVisibilitySnapshot);

        return (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <ClientPortalPanel title="Monthly Report Dashboard" icon={BarChart3} count={command.reportMetrics.length}>
              {command.reportMetrics.length === 0 ? (
                <EmptyState variant="compact" icon={BarChart3} title="No report metrics published yet" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {command.reportMetrics.map((metric) => (
                    <article key={metric.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                      <div className="text-2xl font-semibold">{metric.value}{metric.unit ? ` ${metric.unit}` : ""}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{metric.label}</div>
                    </article>
                  ))}
                </div>
              )}
            </ClientPortalPanel>

            <div className="space-y-5">
              <ClientPortalPanel title="Latest Report Note" icon={FileText}>
                {command.latestReport ? (
                  <article>
                    <h3 className="font-medium">{command.latestReport.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{command.latestReport.summary || "Report summary is being prepared."}</p>
                    <time className="mt-3 block text-xs text-[var(--muted)]" dateTime={command.latestReport.periodEnd || undefined}>
                      Period ended {formatClientPortalDate(command.latestReport.periodEnd)}
                    </time>
                  </article>
                ) : command.latestUpdate ? (
                  <article>
                    <h3 className="font-medium">{command.latestUpdate.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{command.latestUpdate.body}</p>
                    <time className="mt-3 block text-xs text-[var(--muted)]" dateTime={command.latestUpdate.createdAt || undefined}>
                      {formatClientPortalDate(command.latestUpdate.createdAt)}
                    </time>
                  </article>
                ) : (
                  <EmptyState variant="compact" icon={FileText} title="No report note yet" />
                )}
              </ClientPortalPanel>

              <ClientPortalPanel title="Growth Areas" icon={TrendingUp}>
                {sourceBreakdown.length + reputation.length + visibility.length === 0 ? (
                  <div className="space-y-2 text-sm text-[var(--muted)]">
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">Leads captured</div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">Lead source breakdown</div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">Review and reputation tracker</div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">Local visibility snapshot</div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {[
                      ["Lead Sources", sourceBreakdown],
                      ["Reputation", reputation],
                      ["Local Visibility", visibility],
                    ].map(([label, rows]) => (
                      (rows as Array<[string, string]>).length > 0 ? (
                        <div key={label as string} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                          <h3 className="text-xs font-semibold uppercase text-[var(--muted)]">{label as string}</h3>
                          <dl className="mt-2 space-y-1">
                            {(rows as Array<[string, string]>).map(([key, value]) => (
                              <div key={key} className="flex justify-between gap-3">
                                <dt className="capitalize text-[var(--muted)]">{key.replace(/[_-]+/g, " ")}</dt>
                                <dd className="font-medium">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null
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
