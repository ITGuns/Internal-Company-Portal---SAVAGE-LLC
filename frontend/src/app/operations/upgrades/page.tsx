"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CreditCard, Receipt, XCircle } from "lucide-react";
import Header from "@/components/Header";
import Card from "@/components/Card";
import Button from "@/components/Button";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { formatPlanPrice } from "@/lib/pricing-plans";
import {
  UPGRADE_REQUEST_STATUS_LABELS,
  fetchUpgradeRequests,
  updateUpgradeRequest,
  type UpgradeRequest,
  type UpgradeRequestStatus,
} from "@/lib/upgrade-requests";
import { fetchClientOrganizations, type ClientOrganization } from "@/lib/client-portal";

/**
 * Staff queue for plan upgrade requests.
 *
 * Payment is manual: nobody is charged in-app, so "Payment received" is a human
 * confirming money arrived, not a gateway callback. The request carries provider
 * and external-payment fields already, so wiring a real gateway later means
 * filling those in rather than reshaping this screen.
 *
 * The account is created by staff, not automatically - a requester is often a
 * bare sign-up with no organization, and naming/structuring their account is a
 * judgment call. Fulfilment is therefore blocked until an account is linked.
 */
export default function UpgradeRequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, orgs] = await Promise.all([
        fetchUpgradeRequests(),
        fetchClientOrganizations().catch(() => [] as ClientOrganization[]),
      ]);
      setRequests(queue);
      setOrganizations(orgs);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load upgrade requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply(id: string, input: Parameters<typeof updateUpgradeRequest>[1], message: string) {
    setBusyId(id);
    try {
      await updateUpgradeRequest(id, input);
      toast.success(message);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the request");
    } finally {
      setBusyId(null);
    }
  }

  const tone: Record<UpgradeRequestStatus, "pending" | "in-progress" | "completed" | "blocked"> = {
    requested: "pending",
    invoiced: "in-progress",
    paid: "completed",
    fulfilled: "completed",
    declined: "blocked",
  };

  return (
    <main className="main-content-height bg-transparent text-[var(--foreground)]">
      <Header title="Upgrade Requests" subtitle="Plan requests from clients and new sign-ups." />
      <div className="mx-auto max-w-[1480px] p-4 pt-3 md:p-6">
        <Link
          href="/operations"
          className="inline-flex min-h-9 items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to operations
        </Link>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-[var(--muted)]">Loading requests...</div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No open upgrade requests"
              description="Requests appear here when someone chooses a plan on the upgrade page."
            />
          ) : (
            requests.map((request) => {
              const busy = busyId === request.id;
              return (
                <Card key={request.id} padding="lg" className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {request.user?.name || request.user?.email || "Unknown user"}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--muted)]">{request.user?.email}</div>
                      <div className="mt-2 text-sm">
                        Wants <strong>{request.planName}</strong> —{" "}
                        <span className="tabular-nums">{formatPlanPrice(request.monthlyPrice)}</span>/mo
                      </div>
                      {request.note ? (
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{request.note}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge label={UPGRADE_REQUEST_STATUS_LABELS[request.status]} status={tone[request.status]} size="sm" />
                      {request.paidAt ? (
                        <span className="text-xs text-[var(--muted)]">
                          Paid {new Date(request.paidAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Which client account fulfils this. Staff create it in Accounts,
                      then link it here - fulfilment is refused without it. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-[var(--muted)]" htmlFor={`org-${request.id}`}>
                      Client account
                    </label>
                    <select
                      id={`org-${request.id}`}
                      className="min-h-9 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 text-sm"
                      value={request.organizationId || ""}
                      disabled={busy}
                      onChange={(event) =>
                        apply(
                          request.id,
                          { organizationId: event.target.value || null },
                          event.target.value ? "Client account linked" : "Client account unlinked",
                        )
                      }
                    >
                      <option value="">Not linked yet</option>
                      {organizations.map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      href="/operations/clients/accounts"
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Create an account
                    </Link>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    {request.status === "requested" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => apply(request.id, { status: "invoiced" }, "Marked as invoiced")}
                      >
                        Invoice sent
                      </Button>
                    ) : null}

                    {request.status === "requested" || request.status === "invoiced" ? (
                      <Button
                        type="button"
                        disabled={busy}
                        icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => apply(request.id, { status: "paid" }, "Payment recorded")}
                      >
                        Payment received
                      </Button>
                    ) : null}

                    {request.status === "paid" ? (
                      <Button
                        type="button"
                        disabled={busy || !request.organizationId}
                        icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                        onClick={() => apply(request.id, { status: "fulfilled" }, "Request completed")}
                        title={request.organizationId ? undefined : "Link a client account first"}
                      >
                        Account set up
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => apply(request.id, { status: "declined" }, "Request declined")}
                    >
                      Decline
                    </Button>
                  </div>

                  {request.status === "paid" && !request.organizationId ? (
                    <p className="text-xs leading-5 text-[var(--muted)]">
                      Paid, but no client account is linked yet. Create the account in Accounts, set
                      its service tier to <strong>{request.planName}</strong>, then link it above.
                    </p>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
