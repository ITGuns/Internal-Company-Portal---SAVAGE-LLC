"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Settings2,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  CLIENT_ACTION_QUEUE_CATEGORIES,
  CLIENT_ACTION_QUEUE_LABELS,
  groupClientActionQueue,
  type ClientActionQueueCategory,
  type ClientActionQueueItem,
} from "@/lib/client-activity";
import { formatClientPortalDate } from "@/lib/client-portal-display";

const categoryIcons: Record<ClientActionQueueCategory, typeof MessageSquare> = {
  team_response_needed: MessageSquare,
  client_response_needed: MessageSquare,
  approval_needed: CheckCircle2,
  work_due_soon: Clock,
  report_ready: FileText,
  recently_completed: Settings2,
};

function priorityLabel(priority: string) {
  if (!priority) return "Normal";
  return priority
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export default function ClientActionQueue({
  items,
  limitPerGroup = 3,
  showOrganization = true,
}: {
  items: ClientActionQueueItem[];
  limitPerGroup?: number;
  showOrganization?: boolean;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={AlertCircle}
        title="No queued actions"
        description="Replies, approvals, due work, and ready reports will appear here."
      />
    );
  }

  const grouped = groupClientActionQueue(items);
  const visibleCategories = CLIENT_ACTION_QUEUE_CATEGORIES.filter((category) => grouped[category].length > 0);

  return (
    <div className="space-y-4">
      {visibleCategories.map((category) => {
        const Icon = categoryIcons[category];
        const categoryItems = grouped[category].slice(0, limitPerGroup);

        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <h3 className="truncate text-xs font-semibold uppercase text-[var(--muted)]">
                  {CLIENT_ACTION_QUEUE_LABELS[category]}
                </h3>
              </div>
              <span className="rounded-full bg-[var(--card-surface)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {grouped[category].length}
              </span>
            </div>

            <div className="space-y-2">
              {categoryItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3 transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{item.title}</div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{item.summary}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                    {showOrganization ? <span className="truncate">{item.organizationName}</span> : null}
                    <StatusBadge label={priorityLabel(item.priority)} size="sm" />
                    {item.dueAt ? <span>Due {formatClientPortalDate(item.dueAt)}</span> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
