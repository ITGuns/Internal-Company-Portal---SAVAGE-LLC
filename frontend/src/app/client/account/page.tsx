"use client";

import { BriefcaseBusiness, ExternalLink, ShieldCheck, Users } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import { formatClientPortalDate, getClientBillingTierLabel } from "@/lib/client-portal-display";
import {
  getActiveClientMemberships,
  getClientMembershipDisplayName,
} from "@/lib/client-memberships";
import {
  CLIENT_MEMBER_ROLES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

function formatMonthlyAmount(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== "number") return "Amount pending";
  return new Intl.NumberFormat([], {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ClientAccountPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Account"
      subtitle="Service tier, team, access, and account status."
    >
      {({ overview }) => {
        if (!overview) return null;
        const { organization } = overview;
        const billing = overview.billingStatus;
        const activeMembers = getActiveClientMemberships(overview.memberships || []);

        return (
          <div className="grid gap-5 lg:grid-cols-2">
            <ClientPortalPanel title="Account Status" icon={BriefcaseBusiness}>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium uppercase text-[var(--muted)]">Client</div>
                  <h2 className="mt-1 text-lg font-semibold">{organization.name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge label={organization.status} size="sm" />
                    {organization.websiteUrl ? (
                      <a
                        href={organization.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                      >
                        Website <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <div className="text-xs font-medium uppercase text-[var(--muted)]">Service Tier</div>
                  <div className="mt-1 font-medium">{organization.tier?.name || "Tier pending"}</div>
                  {organization.tier?.description ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">{organization.tier.description}</p>
                  ) : null}
                </div>
                {billing ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-medium uppercase text-[var(--muted)]">Billing Status</div>
                        <div className="mt-1 font-medium">{getClientBillingTierLabel(organization, billing)}</div>
                      </div>
                      <StatusBadge label={billing.status.replace(/_/g, " ")} size="sm" />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
                      <div>{formatMonthlyAmount(billing.monthlyAmount, billing.currency)}</div>
                      <div>Renewal {formatClientPortalDate(billing.renewalAt)}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </ClientPortalPanel>

            <ClientPortalPanel title="Team Access" icon={Users}>
              {activeMembers.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={ShieldCheck}
                  title="No active team users"
                  description="Ask your account manager to add the right users for portal access."
                />
              ) : (
                <div className="space-y-3">
                  {activeMembers.map((membership) => (
                    <div
                      key={membership.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{getClientMembershipDisplayName(membership)}</div>
                        <div className="truncate text-xs text-[var(--muted)]">{membership.user?.email || "No email on file"}</div>
                      </div>
                      <StatusBadge
                        label={getClientPortalOptionLabel(CLIENT_MEMBER_ROLES, membership.role)}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ClientPortalPanel>
          </div>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
