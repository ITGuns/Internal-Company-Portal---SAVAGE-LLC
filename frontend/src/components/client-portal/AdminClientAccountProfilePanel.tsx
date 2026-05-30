"use client";

import { ExternalLink, BriefcaseBusiness } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ClientOrganization, ClientServiceTier } from "@/lib/client-portal";
import { clientOperationsSelectClass } from "./ClientOperationsPanel";

export default function AdminClientAccountProfilePanel({
  organization,
  serviceTiers,
  saving,
  onTierAssignmentChange,
}: {
  organization: ClientOrganization | null;
  serviceTiers: ClientServiceTier[];
  saving: boolean;
  onTierAssignmentChange: (tierId: string) => void | Promise<void>;
}) {
  if (!organization) {
    return <EmptyState variant="compact" icon={BriefcaseBusiness} title="Create or select a client" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium uppercase text-[var(--muted)]">{organization.slug}</div>
        <div className="mt-1 text-lg font-semibold">{organization.name}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <div className="text-xs text-[var(--muted)]">Status</div>
          <div className="mt-2">
            <StatusBadge label={organization.status} size="sm" />
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <label className="grid gap-2 text-sm">
            <span className="text-xs text-[var(--muted)]">Service Tier</span>
            <select
              className={clientOperationsSelectClass}
              value={organization.tierId || ""}
              onChange={(event) => void onTierAssignmentChange(event.target.value)}
              disabled={saving}
            >
              <option value="">Not assigned</option>
              {serviceTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {organization.websiteUrl ? (
        <a
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
          href={organization.websiteUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-4 w-4" />
          Open website
        </a>
      ) : null}
      {organization.notes ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3 text-sm leading-6 text-[var(--muted)]">
          {organization.notes}
        </p>
      ) : null}
    </div>
  );
}
