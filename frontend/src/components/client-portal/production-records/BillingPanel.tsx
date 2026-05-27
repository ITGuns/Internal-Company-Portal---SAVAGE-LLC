"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import { upsertClientBillingStatus } from "@/lib/client-portal";
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

const emptyBilling = { planName: "", status: "active", monthlyAmount: "", currency: "USD", renewalAt: "", visibleToClient: false };

function toBillingForm(overview: ProductionRecordPanelProps["overview"]): BillingEditForm {
  return {
    ...emptyBilling,
    planName: overview.billingStatus?.planName || "",
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
}: ProductionRecordPanelProps) {
  const [billingForm, setBillingForm] = useState<BillingEditForm>(() => toBillingForm(overview));

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
          <FormField id="billing-plan" label="Plan" value={billingForm.planName || ""} onChange={(planName) => setBillingForm((form) => ({ ...form, planName }))} />
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
