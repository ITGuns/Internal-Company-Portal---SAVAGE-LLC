type NumericInput = string | number | null | undefined;

export interface WorkItemEditForm {
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: NumericInput;
  dueAt?: string;
  visibleToClient: boolean;
}

export interface ApprovalEditForm {
  title: string;
  description?: string;
  status: string;
  dueAt?: string;
  visibleToClient: boolean;
}

export interface ReportEditForm {
  title: string;
  summary?: string;
  status: string;
  periodStart?: string;
  periodEnd?: string;
  leadsCaptured?: NumericInput;
  missedOpportunities?: NumericInput;
  followUpStatus?: string;
  visibleToClient: boolean;
}

export interface RoadmapEditForm {
  title: string;
  body: string;
  priority: string;
  status: string;
  impact?: string;
  effort?: string;
  visibleToClient: boolean;
}

export interface AssetEditForm {
  label: string;
  url: string;
  type: string;
  status: string;
  notes?: string;
  visibleToClient: boolean;
}

export interface BillingEditForm {
  planName?: string;
  status: string;
  monthlyAmount?: NumericInput;
  currency?: string;
  renewalAt?: string;
  notes?: string;
  visibleToClient: boolean;
}

export interface StorageRootEditForm {
  provider: string;
  status: string;
  folderName?: string;
  externalFolderId?: string;
  externalUrl?: string;
  notes?: string;
}

export interface BookingRequestEditForm {
  provider: string;
  status: string;
  subject: string;
  preferredStartAt?: string;
  preferredEndAt?: string;
  timezone?: string;
  meetingUrl?: string;
  notes?: string;
  visibleToClient: boolean;
}

export interface PaymentConnectionEditForm {
  provider: string;
  accountType: string;
  status: string;
  mode: string;
  accountLabel?: string;
  externalCustomerId?: string;
  externalMerchantId?: string;
  lastFour?: string;
  webhookStatus: string;
  notes?: string;
}

export interface InvoiceEditForm {
  provider: string;
  status: string;
  invoiceNumber?: string;
  amount?: NumericInput;
  currency?: string;
  issueAt?: string;
  dueAt?: string;
  paidAt?: string;
  externalInvoiceId?: string;
  hostedInvoiceUrl?: string;
  notes?: string;
  visibleToClient: boolean;
}

export interface CalendarEditForm {
  title: string;
  description?: string;
  channel?: string;
  status: string;
  startAt: string;
  endAt?: string;
  projectId?: string;
  visibleToClient: boolean;
}

export function toDateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function toDateTimeLocalValue(value?: string | null): string {
  return value ? value.slice(0, 16) : "";
}

function optionalString(value?: string | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

function requiredString(value: string): string {
  return value.trim();
}

function optionalDate(value?: string | null): string | undefined {
  return optionalString(value);
}

function optionalNumber(value: NumericInput): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function optionalInteger(value: NumericInput): number | undefined {
  const numericValue = optionalNumber(value);
  return typeof numericValue === "number" ? Math.round(numericValue) : undefined;
}

function progressNumber(value: NumericInput): number {
  const numericValue = optionalInteger(value) ?? 0;
  return Math.min(100, Math.max(0, numericValue));
}

export function buildWorkItemUpdatePayload(form: WorkItemEditForm) {
  return {
    title: requiredString(form.title),
    ...(optionalString(form.description) ? { description: optionalString(form.description) } : {}),
    status: form.status,
    priority: form.priority,
    progress: progressNumber(form.progress),
    ...(optionalDate(form.dueAt) ? { dueAt: optionalDate(form.dueAt) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildApprovalUpdatePayload(form: ApprovalEditForm) {
  return {
    title: requiredString(form.title),
    ...(optionalString(form.description) ? { description: optionalString(form.description) } : {}),
    status: form.status,
    ...(optionalDate(form.dueAt) ? { dueAt: optionalDate(form.dueAt) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildReportUpdatePayload(form: ReportEditForm) {
  return {
    title: requiredString(form.title),
    ...(optionalString(form.summary) ? { summary: optionalString(form.summary) } : {}),
    status: form.status,
    ...(optionalDate(form.periodStart) ? { periodStart: optionalDate(form.periodStart) } : {}),
    ...(optionalDate(form.periodEnd) ? { periodEnd: optionalDate(form.periodEnd) } : {}),
    ...(optionalInteger(form.leadsCaptured) !== undefined ? { leadsCaptured: optionalInteger(form.leadsCaptured) } : {}),
    ...(optionalInteger(form.missedOpportunities) !== undefined ? { missedOpportunities: optionalInteger(form.missedOpportunities) } : {}),
    ...(optionalString(form.followUpStatus) ? { followUpStatus: optionalString(form.followUpStatus) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildReportDraftPayload(form: Pick<ReportEditForm, "title" | "periodStart" | "periodEnd" | "visibleToClient">) {
  return {
    ...(optionalString(form.title) ? { title: optionalString(form.title) } : {}),
    periodStart: requiredString(form.periodStart || ""),
    periodEnd: requiredString(form.periodEnd || ""),
    visibleToClient: form.visibleToClient,
  };
}

export function buildRoadmapUpdatePayload(form: RoadmapEditForm) {
  return {
    title: requiredString(form.title),
    body: requiredString(form.body),
    priority: form.priority,
    status: form.status,
    ...(optionalString(form.impact) ? { impact: optionalString(form.impact) } : {}),
    ...(optionalString(form.effort) ? { effort: optionalString(form.effort) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildAssetUpdatePayload(form: AssetEditForm) {
  return {
    label: requiredString(form.label),
    url: requiredString(form.url),
    type: requiredString(form.type),
    status: form.status,
    ...(optionalString(form.notes) ? { notes: optionalString(form.notes) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildBillingPayload(form: BillingEditForm) {
  return {
    ...(optionalString(form.planName) ? { planName: optionalString(form.planName) } : {}),
    status: form.status,
    ...(optionalNumber(form.monthlyAmount) !== undefined ? { monthlyAmount: optionalNumber(form.monthlyAmount) } : {}),
    currency: (optionalString(form.currency) || "USD").toUpperCase(),
    ...(optionalDate(form.renewalAt) ? { renewalAt: optionalDate(form.renewalAt) } : {}),
    ...(optionalString(form.notes) ? { notes: optionalString(form.notes) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildStorageRootPayload(form: StorageRootEditForm) {
  return {
    provider: form.provider,
    status: form.status,
    ...(optionalString(form.folderName) ? { folderName: optionalString(form.folderName) } : {}),
    externalFolderId: optionalString(form.externalFolderId) || null,
    externalUrl: optionalString(form.externalUrl) || null,
    notes: optionalString(form.notes) || null,
  };
}

export function buildBookingRequestPayload(form: BookingRequestEditForm) {
  return {
    provider: form.provider,
    status: form.status,
    subject: requiredString(form.subject),
    ...(optionalDate(form.preferredStartAt) ? { preferredStartAt: optionalDate(form.preferredStartAt) } : {}),
    ...(optionalDate(form.preferredEndAt) ? { preferredEndAt: optionalDate(form.preferredEndAt) } : {}),
    timezone: optionalString(form.timezone) || "UTC",
    ...(optionalString(form.meetingUrl) ? { meetingUrl: optionalString(form.meetingUrl) } : {}),
    ...(optionalString(form.notes) ? { notes: optionalString(form.notes) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildPaymentConnectionPayload(form: PaymentConnectionEditForm) {
  return {
    provider: form.provider,
    accountType: form.accountType || "payment",
    status: form.status,
    mode: form.mode,
    accountLabel: optionalString(form.accountLabel) || null,
    externalCustomerId: optionalString(form.externalCustomerId) || null,
    externalMerchantId: optionalString(form.externalMerchantId) || null,
    lastFour: optionalString(form.lastFour) || null,
    webhookStatus: form.webhookStatus,
    notes: optionalString(form.notes) || null,
  };
}

export function buildInvoicePayload(form: InvoiceEditForm) {
  const amount = optionalNumber(form.amount);
  return {
    provider: form.provider,
    status: form.status,
    ...(optionalString(form.invoiceNumber) ? { invoiceNumber: optionalString(form.invoiceNumber) } : {}),
    ...(amount !== undefined ? { amount } : {}),
    currency: (optionalString(form.currency) || "USD").toUpperCase(),
    ...(optionalDate(form.issueAt) ? { issueAt: optionalDate(form.issueAt) } : {}),
    ...(optionalDate(form.dueAt) ? { dueAt: optionalDate(form.dueAt) } : {}),
    ...(optionalDate(form.paidAt) ? { paidAt: optionalDate(form.paidAt) } : {}),
    ...(optionalString(form.externalInvoiceId) ? { externalInvoiceId: optionalString(form.externalInvoiceId) } : {}),
    ...(optionalString(form.hostedInvoiceUrl) ? { hostedInvoiceUrl: optionalString(form.hostedInvoiceUrl) } : {}),
    ...(optionalString(form.notes) ? { notes: optionalString(form.notes) } : {}),
    visibleToClient: form.visibleToClient,
  };
}

export function buildCalendarUpdatePayload(form: CalendarEditForm) {
  return {
    title: requiredString(form.title),
    ...(optionalString(form.description) ? { description: optionalString(form.description) } : {}),
    ...(optionalString(form.channel) ? { channel: optionalString(form.channel) } : {}),
    status: form.status,
    ...(optionalDate(form.startAt) ? { startAt: optionalDate(form.startAt) } : {}),
    ...(optionalDate(form.endAt) ? { endAt: optionalDate(form.endAt) } : {}),
    projectId: optionalString(form.projectId) || null,
    visibleToClient: form.visibleToClient,
  };
}
