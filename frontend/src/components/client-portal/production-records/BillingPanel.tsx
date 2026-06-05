"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type { ClientServiceTier } from "@/lib/client-portal";
import { upsertClientBillingStatus } from "@/lib/client-portal";
import { getClientBillingTierLabel } from "@/lib/client-portal-display";
import { getClientServiceTierDisplayName } from "@/lib/client-service-tiers";
import {
  buildBillingPayload,
  toDateInputValue,
  type BillingEditForm,
} from "@/lib/client-production-record-forms";
import { CLIENT_BILLING_STATUSES } from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  MiniPanel,
  selectClass,
  VisibilityCheckbox,
} from "./shared";

const emptyBilling = { status: "active", monthlyAmount: "", currency: "USD", renewalAt: "", visibleToClient: false };

function toBillingForm(overview: ProductionRecordPanelProps["overview"]): BillingEditForm {
  return {
    ...emptyBilling,
    status: overview.billingStatus?.status || "active",
    monthlyAmount: overview.billingStatus?.monthlyAmount ? String(overview.billingStatus.monthlyAmount) : "",
    currency: overview.billingStatus?.currency || "USD",
    renewalAt: toDateInputValue(overview.billingStatus?.renewalAt),
    visibleToClient: overview.billingStatus?.visibleToClient || false,
  };
}

export default function BillingPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  serviceTiers = [],
  onServiceTierChange,
}: ProductionRecordPanelProps & {
  serviceTiers?: ClientServiceTier[];
  onServiceTierChange?: (tierId: string) => void | Promise<void>;
}) {
  const [billingForm, setBillingForm] = useState<BillingEditForm>(() => toBillingForm(overview));
  const assignedTierId = overview.organization.tierId || "";

  useEffect(() => {
    setBillingForm(toBillingForm(overview));
  }, [overview]);

  return (
    <MiniPanel title="Billing Status" icon={CreditCard}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitScoped(
            () => upsertClientBillingStatus(organizationId, buildBillingPayload(billingForm)),
            "Billing status saved",
            () => undefined,
          );
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Service Tier</span>
            {serviceTiers.length > 0 && onServiceTierChange ? (
              <select
                className={selectClass}
                value={assignedTierId}
                onChange={(event) => void onServiceTierChange(event.target.value)}
                disabled={saving}
              >
                <option value="">Not assigned</option>
                {serviceTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {getClientServiceTierDisplayName(tier)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
                {getClientBillingTierLabel(overview.organization, overview.billingStatus)}
              </span>
            )}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Status</span>
            <select className={selectClass} value={billingForm.status} onChange={(event) => setBillingForm((form) => ({ ...form, status: event.target.value }))}>
              {CLIENT_BILLING_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <FormField id="billing-amount" label="Monthly Amount" type="number" value={billingForm.monthlyAmount || ""} onChange={(monthlyAmount) => setBillingForm((form) => ({ ...form, monthlyAmount }))} />
          <FormField id="billing-currency" label="Currency" value={billingForm.currency || "USD"} onChange={(currency) => setBillingForm((form) => ({ ...form, currency }))} />
          <FormField id="billing-renewal" label="Renewal" type="date" value={billingForm.renewalAt || ""} onChange={(renewalAt) => setBillingForm((form) => ({ ...form, renewalAt }))} />
        </div>
        <VisibilityCheckbox checked={billingForm.visibleToClient} onChange={(visibleToClient) => setBillingForm((form) => ({ ...form, visibleToClient }))} />
        <Button type="submit" loading={saving}>Save Billing</Button>
      </form>
    </MiniPanel>
  );
}
