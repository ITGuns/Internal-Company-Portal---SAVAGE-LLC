"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CreditCard, FolderOpen, Landmark, ReceiptText } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type {
  ClientBookingRequest,
  ClientInvoice,
  ClientPaymentConnection,
  ClientServiceTier,
} from "@/lib/client-portal";
import {
  createClientBookingRequest,
  createClientInvoice,
  generateClientInvoice,
  updateClientBookingRequest,
  updateClientInvoice,
  upsertClientBillingStatus,
  upsertClientPaymentConnection,
  upsertClientStorageRoot,
} from "@/lib/client-portal";
import { getClientBillingTierLabel } from "@/lib/client-portal-display";
import { getClientServiceTierDisplayName } from "@/lib/client-service-tiers";
import {
  buildBillingPayload,
  buildBookingRequestPayload,
  buildInvoicePayload,
  buildPaymentConnectionPayload,
  buildStorageRootPayload,
  toDateInputValue,
  type BillingEditForm,
  type BookingRequestEditForm,
  type InvoiceEditForm,
  type PaymentConnectionEditForm,
  type StorageRootEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_BILLING_STATUSES,
  CLIENT_BOOKING_PROVIDERS,
  CLIENT_BOOKING_STATUSES,
  CLIENT_INVOICE_STATUSES,
  CLIENT_PAYMENT_CONNECTION_STATUSES,
  CLIENT_PAYMENT_MODES,
  CLIENT_PAYMENT_PROVIDERS,
  CLIENT_STORAGE_PROVIDERS,
  CLIENT_STORAGE_STATUSES,
  CLIENT_WEBHOOK_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  MiniPanel,
  selectClass,
  TextareaField,
  VisibilityCheckbox,
} from "./shared";

const emptyBilling: BillingEditForm = {
  planName: "",
  status: "active",
  monthlyAmount: "",
  currency: "USD",
  renewalAt: "",
  notes: "",
  visibleToClient: false,
};

const emptyBooking: BookingRequestEditForm = {
  provider: "manual",
  status: "requested",
  subject: "",
  preferredStartAt: "",
  preferredEndAt: "",
  timezone: "UTC",
  meetingUrl: "",
  notes: "",
  visibleToClient: true,
};

const emptyInvoice: InvoiceEditForm = {
  provider: "manual",
  status: "draft",
  invoiceNumber: "",
  amount: "",
  currency: "USD",
  dueAt: "",
  notes: "",
  visibleToClient: false,
};

function toBillingForm(overview: ProductionRecordPanelProps["overview"]): BillingEditForm {
  return {
    ...emptyBilling,
    planName: overview.billingStatus?.planName || "",
    status: overview.billingStatus?.status || "active",
    monthlyAmount: overview.billingStatus?.monthlyAmount ? String(overview.billingStatus.monthlyAmount) : "",
    currency: overview.billingStatus?.currency || "USD",
    renewalAt: toDateInputValue(overview.billingStatus?.renewalAt),
    notes: overview.billingStatus?.notes || "",
    visibleToClient: overview.billingStatus?.visibleToClient || false,
  };
}

function toStorageForm(overview: ProductionRecordPanelProps["overview"]): StorageRootEditForm {
  const defaultFolder = `${overview.organization.name} Client Storage`;
  return {
    provider: overview.storageRoot?.provider || "local_app_storage",
    status: overview.storageRoot?.status || "ready",
    folderName: overview.storageRoot?.folderName || defaultFolder,
    externalFolderId: overview.storageRoot?.externalFolderId || "",
    externalUrl: overview.storageRoot?.externalUrl || "",
    notes: overview.storageRoot?.notes || "",
  };
}

function defaultConnectionForm(provider: string, existing?: ClientPaymentConnection): PaymentConnectionEditForm {
  const isBank = provider === "bank_account";
  return {
    provider,
    accountType: existing?.accountType || (isBank ? "bank_account" : "payment"),
    status: existing?.status || "not_connected",
    mode: existing?.mode || "manual",
    accountLabel: existing?.accountLabel || "",
    externalCustomerId: existing?.externalCustomerId || "",
    externalMerchantId: existing?.externalMerchantId || "",
    lastFour: existing?.lastFour || "",
    webhookStatus: existing?.webhookStatus || "not_configured",
    notes: existing?.notes || "",
  };
}

function displayDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "No date";
}

function BookingRequestRow({
  booking,
  saving,
  submitScoped,
}: {
  booking: ClientBookingRequest;
  saving: boolean;
  submitScoped: ProductionRecordPanelProps["submitScoped"];
}) {
  const [status, setStatus] = useState(booking.status);
  const [meetingUrl, setMeetingUrl] = useState(booking.meetingUrl || "");
  const [visibleToClient, setVisibleToClient] = useState(booking.visibleToClient !== false);

  useEffect(() => {
    setStatus(booking.status);
    setMeetingUrl(booking.meetingUrl || "");
    setVisibleToClient(booking.visibleToClient !== false);
  }, [booking]);

  const isDirty = status !== booking.status || meetingUrl !== (booking.meetingUrl || "") || visibleToClient !== (booking.visibleToClient !== false);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words font-medium">{booking.subject}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {getClientPortalOptionLabel(CLIENT_BOOKING_STATUSES, booking.status)} - {displayDate(booking.preferredStartAt)}
          </div>
        </div>
        <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
          {getClientPortalOptionLabel(CLIENT_BOOKING_PROVIDERS, booking.provider)}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)} aria-label={`Status for ${booking.subject}`}>
          {CLIENT_BOOKING_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input
          className={selectClass}
          value={meetingUrl}
          onChange={(event) => setMeetingUrl(event.target.value)}
          placeholder="Meeting URL"
          aria-label={`Meeting URL for ${booking.subject}`}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving || !isDirty}
          onClick={() => submitScoped(
            () => updateClientBookingRequest(booking.id, { status, meetingUrl: meetingUrl || null, visibleToClient }),
            "Call request updated",
            () => undefined,
          )}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  saving,
  submitScoped,
}: {
  invoice: ClientInvoice;
  saving: boolean;
  submitScoped: ProductionRecordPanelProps["submitScoped"];
}) {
  const [status, setStatus] = useState(invoice.status);
  const [visibleToClient, setVisibleToClient] = useState(invoice.visibleToClient === true);

  useEffect(() => {
    setStatus(invoice.status);
    setVisibleToClient(invoice.visibleToClient === true);
  }, [invoice]);

  const isDirty = status !== invoice.status || visibleToClient !== (invoice.visibleToClient === true);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{invoice.invoiceNumber || invoice.id}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {invoice.currency} {invoice.amount.toLocaleString()} - Due {displayDate(invoice.dueAt)}
          </div>
        </div>
        <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)]">
          {getClientPortalOptionLabel(CLIENT_PAYMENT_PROVIDERS, invoice.provider)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" value={status} onChange={(event) => setStatus(event.target.value)} aria-label={`Status for invoice ${invoice.invoiceNumber || invoice.id}`}>
          {CLIENT_INVOICE_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-xs">
          <input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={visibleToClient} onChange={(event) => setVisibleToClient(event.target.checked)} />
          Client-visible
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving || !isDirty}
          onClick={() => submitScoped(
            () => updateClientInvoice(invoice.id, { status, visibleToClient }),
            "Invoice updated",
            () => undefined,
          )}
        >
          Save
        </Button>
      </div>
    </div>
  );
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
  const [storageForm, setStorageForm] = useState<StorageRootEditForm>(() => toStorageForm(overview));
  const [bookingForm, setBookingForm] = useState<BookingRequestEditForm>(emptyBooking);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceEditForm>(emptyInvoice);
  const [selectedProvider, setSelectedProvider] = useState("stripe");
  const assignedTierId = overview.organization.tierId || "";
  const connections = useMemo(() => overview.paymentConnections || [], [overview.paymentConnections]);
  const selectedConnection = useMemo(
    () => connections.find((connection) => connection.provider === selectedProvider) || undefined,
    [connections, selectedProvider],
  );
  const [connectionForm, setConnectionForm] = useState<PaymentConnectionEditForm>(() => defaultConnectionForm("stripe"));

  useEffect(() => {
    setBillingForm(toBillingForm(overview));
    setStorageForm(toStorageForm(overview));
  }, [overview]);

  useEffect(() => {
    setConnectionForm(defaultConnectionForm(selectedProvider, selectedConnection));
  }, [selectedProvider, selectedConnection]);

  const canGenerateInvoice = Boolean(Number(billingForm.monthlyAmount) > 0) && !saving;
  const canCreateManualInvoice = Boolean(Number(invoiceForm.amount) > 0) && !saving;
  const bookingRequests = overview.bookingRequests || [];
  const invoices = overview.invoices || [];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
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
                <select className={selectClass} value={assignedTierId} onChange={(event) => void onServiceTierChange(event.target.value)} disabled={saving}>
                  <option value="">Not assigned</option>
                  {serviceTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>{getClientServiceTierDisplayName(tier)}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]">
                  {getClientBillingTierLabel(overview.organization, overview.billingStatus)}
                </span>
              )}
            </label>
            <FormField id="billing-plan" label="Plan Name" value={billingForm.planName || ""} onChange={(planName) => setBillingForm((form) => ({ ...form, planName }))} />
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
          <TextareaField value={billingForm.notes || ""} onChange={(notes) => setBillingForm((form) => ({ ...form, notes }))} placeholder="Internal billing notes" ariaLabel="Internal billing notes" />
          <VisibilityCheckbox checked={billingForm.visibleToClient} onChange={(visibleToClient) => setBillingForm((form) => ({ ...form, visibleToClient }))} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving}>Save Billing</Button>
            <Button
              type="button"
              variant="secondary"
              icon={<ReceiptText className="h-4 w-4" />}
              disabled={!canGenerateInvoice}
              onClick={() => submitScoped(
                () => generateClientInvoice(organizationId, {
                  provider: "manual",
                  status: "draft",
                  dueAt: billingForm.renewalAt || undefined,
                  visibleToClient: billingForm.visibleToClient,
                  notes: billingForm.notes,
                }),
                "Monthly invoice generated",
                () => undefined,
              )}
            >
              Generate Monthly Invoice
            </Button>
          </div>
        </form>
      </MiniPanel>

      <MiniPanel title="Client Storage" icon={FolderOpen}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitScoped(
              () => upsertClientStorageRoot(organizationId, buildStorageRootPayload(storageForm)),
              "Client storage saved",
              () => undefined,
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Provider</span>
              <select className={selectClass} value={storageForm.provider} onChange={(event) => setStorageForm((form) => ({ ...form, provider: event.target.value }))}>
                {CLIENT_STORAGE_PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Status</span>
              <select className={selectClass} value={storageForm.status} onChange={(event) => setStorageForm((form) => ({ ...form, status: event.target.value }))}>
                {CLIENT_STORAGE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <FormField id="storage-folder-name" label="Folder Name" value={storageForm.folderName || ""} onChange={(folderName) => setStorageForm((form) => ({ ...form, folderName }))} />
            <FormField id="storage-external-id" label="External Folder ID" value={storageForm.externalFolderId || ""} onChange={(externalFolderId) => setStorageForm((form) => ({ ...form, externalFolderId }))} />
            <div className="sm:col-span-2">
              <FormField id="storage-external-url" label="External Folder URL" value={storageForm.externalUrl || ""} onChange={(externalUrl) => setStorageForm((form) => ({ ...form, externalUrl }))} />
            </div>
          </div>
          <TextareaField value={storageForm.notes || ""} onChange={(notes) => setStorageForm((form) => ({ ...form, notes }))} placeholder="Storage setup notes" ariaLabel="Storage setup notes" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={saving}>Save Storage</Button>
            {overview.storageRoot?.directoryFolderId ? (
              <span className="text-xs text-[var(--muted)]">Directory root linked: {overview.storageRoot.directoryFolderId}</span>
            ) : null}
          </div>
        </form>
      </MiniPanel>

      <MiniPanel title="Book a Call" icon={CalendarClock} count={bookingRequests.length}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!bookingForm.subject.trim()) return;
            submitScoped(
              () => createClientBookingRequest(organizationId, buildBookingRequestPayload(bookingForm)),
              "Call request added",
              () => setBookingForm(emptyBooking),
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="booking-subject" label="Subject" value={bookingForm.subject} onChange={(subject) => setBookingForm((form) => ({ ...form, subject }))} required />
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Provider</span>
              <select className={selectClass} value={bookingForm.provider} onChange={(event) => setBookingForm((form) => ({ ...form, provider: event.target.value }))}>
                {CLIENT_BOOKING_PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </label>
            <FormField id="booking-start" label="Preferred Start" type="datetime-local" value={bookingForm.preferredStartAt || ""} onChange={(preferredStartAt) => setBookingForm((form) => ({ ...form, preferredStartAt }))} />
            <FormField id="booking-end" label="Preferred End" type="datetime-local" value={bookingForm.preferredEndAt || ""} onChange={(preferredEndAt) => setBookingForm((form) => ({ ...form, preferredEndAt }))} />
            <FormField id="booking-timezone" label="Timezone" value={bookingForm.timezone || "UTC"} onChange={(timezone) => setBookingForm((form) => ({ ...form, timezone }))} />
            <FormField id="booking-url" label="Meeting URL" value={bookingForm.meetingUrl || ""} onChange={(meetingUrl) => setBookingForm((form) => ({ ...form, meetingUrl }))} />
          </div>
          <TextareaField value={bookingForm.notes || ""} onChange={(notes) => setBookingForm((form) => ({ ...form, notes }))} placeholder="Call notes or agenda" ariaLabel="Call notes or agenda" />
          <VisibilityCheckbox checked={bookingForm.visibleToClient} onChange={(visibleToClient) => setBookingForm((form) => ({ ...form, visibleToClient }))} />
          <Button type="submit" loading={saving} disabled={!bookingForm.subject.trim()}>Add Call Request</Button>
        </form>
        <div className="mt-4 space-y-2">
          {bookingRequests.slice(0, 6).map((booking) => (
            <BookingRequestRow key={booking.id} booking={booking} saving={saving} submitScoped={submitScoped} />
          ))}
        </div>
      </MiniPanel>

      <MiniPanel title="Payment Connections" icon={Landmark} count={connections.length}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitScoped(
              () => upsertClientPaymentConnection(organizationId, buildPaymentConnectionPayload(connectionForm)),
              "Payment connection saved",
              () => undefined,
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Provider</span>
              <select className={selectClass} value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)}>
                {CLIENT_PAYMENT_PROVIDERS.filter((provider) => provider.value !== "manual").map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Status</span>
              <select className={selectClass} value={connectionForm.status} onChange={(event) => setConnectionForm((form) => ({ ...form, status: event.target.value }))}>
                {CLIENT_PAYMENT_CONNECTION_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Mode</span>
              <select className={selectClass} value={connectionForm.mode} onChange={(event) => setConnectionForm((form) => ({ ...form, mode: event.target.value }))}>
                {CLIENT_PAYMENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Webhook</span>
              <select className={selectClass} value={connectionForm.webhookStatus} onChange={(event) => setConnectionForm((form) => ({ ...form, webhookStatus: event.target.value }))}>
                {CLIENT_WEBHOOK_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <FormField id="payment-label" label="Account Label" value={connectionForm.accountLabel || ""} onChange={(accountLabel) => setConnectionForm((form) => ({ ...form, accountLabel }))} />
            <FormField id="payment-last-four" label="Last 4" value={connectionForm.lastFour || ""} onChange={(lastFour) => setConnectionForm((form) => ({ ...form, lastFour }))} />
            <FormField id="payment-customer" label="External Customer ID" value={connectionForm.externalCustomerId || ""} onChange={(externalCustomerId) => setConnectionForm((form) => ({ ...form, externalCustomerId }))} />
            <FormField id="payment-merchant" label="External Merchant ID" value={connectionForm.externalMerchantId || ""} onChange={(externalMerchantId) => setConnectionForm((form) => ({ ...form, externalMerchantId }))} />
          </div>
          <TextareaField value={connectionForm.notes || ""} onChange={(notes) => setConnectionForm((form) => ({ ...form, notes }))} placeholder="Provider setup notes. Do not paste API secrets here." ariaLabel="Provider setup notes" />
          <Button type="submit" loading={saving}>Save Connection</Button>
        </form>
      </MiniPanel>

      <MiniPanel title="Invoices" icon={ReceiptText} count={invoices.length}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canCreateManualInvoice) return;
            submitScoped(
              () => createClientInvoice(organizationId, buildInvoicePayload(invoiceForm) as Parameters<typeof createClientInvoice>[1]),
              "Invoice added",
              () => setInvoiceForm(emptyInvoice),
            );
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="invoice-amount" label="Amount" type="number" value={invoiceForm.amount || ""} onChange={(amount) => setInvoiceForm((form) => ({ ...form, amount }))} required />
            <FormField id="invoice-currency" label="Currency" value={invoiceForm.currency || "USD"} onChange={(currency) => setInvoiceForm((form) => ({ ...form, currency }))} />
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Provider</span>
              <select className={selectClass} value={invoiceForm.provider} onChange={(event) => setInvoiceForm((form) => ({ ...form, provider: event.target.value }))}>
                {CLIENT_PAYMENT_PROVIDERS.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Status</span>
              <select className={selectClass} value={invoiceForm.status} onChange={(event) => setInvoiceForm((form) => ({ ...form, status: event.target.value }))}>
                {CLIENT_INVOICE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <FormField id="invoice-number" label="Invoice Number" value={invoiceForm.invoiceNumber || ""} onChange={(invoiceNumber) => setInvoiceForm((form) => ({ ...form, invoiceNumber }))} />
            <FormField id="invoice-due" label="Due Date" type="date" value={invoiceForm.dueAt || ""} onChange={(dueAt) => setInvoiceForm((form) => ({ ...form, dueAt }))} />
          </div>
          <VisibilityCheckbox checked={invoiceForm.visibleToClient} onChange={(visibleToClient) => setInvoiceForm((form) => ({ ...form, visibleToClient }))} />
          <Button type="submit" loading={saving} disabled={!canCreateManualInvoice}>Add Invoice</Button>
        </form>
        <div className="mt-4 space-y-2">
          {invoices.slice(0, 8).map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} saving={saving} submitScoped={submitScoped} />
          ))}
        </div>
      </MiniPanel>
    </div>
  );
}
