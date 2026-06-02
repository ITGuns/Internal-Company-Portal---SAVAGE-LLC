"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  MessageSquare,
  Settings2,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { getClientActivityTone, type ClientActivity, type ClientActivityTone } from "@/lib/client-activity";
import { formatClientPortalDate } from "@/lib/client-portal-display";
import { cn } from "@/lib/utils";

const toneStyles: Record<ClientActivityTone, {
  icon: typeof MessageSquare;
  className: string;
}> = {
  message: {
    icon: MessageSquare,
    className: "border-[var(--accent)] text-[var(--accent)]",
  },
  approval: {
    icon: CheckCircle2,
    className: "border-emerald-500/50 text-emerald-400",
  },
  work: {
    icon: Settings2,
    className: "border-sky-500/50 text-sky-400",
  },
  report: {
    icon: FileText,
    className: "border-amber-500/50 text-amber-400",
  },
  calendar: {
    icon: CalendarDays,
    className: "border-violet-500/50 text-violet-400",
  },
  account: {
    icon: BriefcaseBusiness,
    className: "border-rose-500/50 text-rose-400",
  },
};

export default function ClientActivityTimeline({
  activities,
  limit,
}: {
  activities: ClientActivity[];
  limit?: number;
}) {
  const visibleActivities = typeof limit === "number" ? activities.slice(0, limit) : activities;

  if (visibleActivities.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={MessageSquare}
        title="No activity yet"
        description="Client updates, replies, approvals, and schedule changes will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {visibleActivities.map((activity) => {
        const tone = getClientActivityTone(activity.type);
        const toneStyle = toneStyles[tone];
        const Icon = toneStyle.icon;
        const actorName = activity.actor?.name || activity.actor?.email || null;

        return (
          <article
            key={activity.id}
            className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 sm:grid-cols-[auto_minmax(0,1fr)]"
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border bg-[var(--card-bg)]",
                toneStyle.className,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{activity.title}</h3>
                  {actorName ? (
                    <div className="mt-1 text-xs text-[var(--muted)]">By {actorName}</div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {activity.visibility === "internal" ? <StatusBadge label="Internal" size="sm" /> : null}
                  <time className="text-xs text-[var(--muted)]" dateTime={activity.createdAt || undefined}>
                    {formatClientPortalDate(activity.createdAt)}
                  </time>
                </div>
              </div>
              {activity.body ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{activity.body}</p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
