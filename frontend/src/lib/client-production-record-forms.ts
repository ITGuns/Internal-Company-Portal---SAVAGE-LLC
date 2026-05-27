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
  visibleToClient: boolean;
}

export interface CalendarEditForm {
  title: string;
  description?: string;
  channel?: string;
  status: string;
  startAt: string;
  endAt?: string;
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
    visibleToClient: form.visibleToClient,
  };
}
