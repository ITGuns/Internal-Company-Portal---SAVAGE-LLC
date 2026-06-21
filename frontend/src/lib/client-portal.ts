import { apiFetch } from './api';
import type { ClientActionQueueItem, ClientActivity } from './client-activity';
import type { ClientWebsiteWorkType } from './client-website-work';

export interface ClientServiceTier {
  id: string;
  name: string;
  description?: string | null;
  monthlyPrice?: number | null;
  priorityRank?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  websiteUrl?: string | null;
  websiteWorkType?: ClientWebsiteWorkType | string | null;
  tier?: ClientServiceTier | null;
  tierId?: string | null;
  notes?: string | null;
  counts?: {
    memberships?: number;
    projects?: number;
    tickets?: number;
    updates?: number;
  };
}

export interface ClientMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
  user?: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
}

export interface ClientManagedUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  status?: string | null;
  isApproved?: boolean;
  role?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientInviteResult {
  user: ClientManagedUser;
  membership: ClientMembership;
  invite: {
    setupRequired: boolean;
    emailSent: boolean;
    setupUrl?: string;
  };
}

export interface ClientProject {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  summary?: string | null;
  progress: number;
  liveUrl?: string | null;
  previewUrl?: string | null;
  internalNotes?: string | null;
  updatedAt?: string | null;
}

export interface ClientTicketComment {
  id: string;
  ticketId: string;
  authorId?: string | null;
  author?: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
  body: string;
  visibility: string;
  createdAt: string | null;
}

export interface ClientTicket {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  internalNotes?: string | null;
  createdById?: string | null;
  assignedToId?: string | null;
  comments?: ClientTicketComment[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientUpdate {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  body: string;
  status: string;
  visibleToClient?: boolean;
  createdAt: string | null;
}

export interface ClientMetricSnapshot {
  id: string;
  organizationId: string;
  label: string;
  value: string;
  unit?: string | null;
  source?: string;
  notes?: string | null;
  visibleToClient?: boolean;
  createdAt: string | null;
}

export interface ClientResourceLink {
  id: string;
  organizationId: string;
  projectId?: string | null;
  label: string;
  url: string;
  type: string;
  createdById?: string | null;
  visibleToClient?: boolean;
}

export interface ClientWorkItem {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  progress: number;
  dueAt?: string | null;
  completedAt?: string | null;
  visibleToClient?: boolean;
  sortOrder?: number;
  updatedAt?: string | null;
}

export interface ClientApproval {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  responseNote?: string | null;
  dueAt?: string | null;
  decidedAt?: string | null;
  visibleToClient?: boolean;
  updatedAt?: string | null;
}

export interface ClientReport {
  id: string;
  organizationId: string;
  title: string;
  summary?: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: string;
  visibleToClient?: boolean;
  leadsCaptured?: number | null;
  missedOpportunities?: number | null;
  followUpStatus?: string | null;
  leadSourceBreakdown?: Record<string, unknown> | null;
  reputationSnapshot?: Record<string, unknown> | null;
  localVisibilitySnapshot?: Record<string, unknown> | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientRoadmapRecommendation {
  id: string;
  organizationId: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  impact?: string | null;
  effort?: string | null;
  visibleToClient?: boolean;
  sortOrder?: number;
}

export interface ClientAsset {
  id: string;
  organizationId: string;
  projectId?: string | null;
  label: string;
  url: string;
  type: string;
  status: string;
  notes?: string | null;
  visibleToClient?: boolean;
}

export interface ClientBillingStatus {
  id: string;
  organizationId: string;
  planName?: string | null;
  status: string;
  monthlyAmount?: number | null;
  currency?: string | null;
  renewalAt?: string | null;
  notes?: string | null;
  visibleToClient?: boolean;
}

export interface ClientStorageRoot {
  id: string;
  organizationId: string;
  provider: string;
  status: string;
  folderName: string;
  directoryFolderId?: string | null;
  externalFolderId?: string | null;
  externalUrl?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientBookingRequest {
  id: string;
  organizationId: string;
  requestedById?: string | null;
  provider: string;
  status: string;
  subject: string;
  preferredStartAt?: string | null;
  preferredEndAt?: string | null;
  timezone: string;
  meetingUrl?: string | null;
  notes?: string | null;
  visibleToClient?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientPaymentConnection {
  id: string;
  organizationId: string;
  provider: string;
  accountType: string;
  status: string;
  mode: string;
  accountLabel?: string | null;
  externalCustomerId?: string | null;
  externalMerchantId?: string | null;
  lastFour?: string | null;
  webhookStatus: string;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientInvoice {
  id: string;
  organizationId: string;
  billingStatusId?: string | null;
  invoiceNumber?: string | null;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  issueAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  externalInvoiceId?: string | null;
  hostedInvoiceUrl?: string | null;
  notes?: string | null;
  visibleToClient?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClientCalendarItem {
  id: string;
  organizationId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  channel?: string | null;
  status: string;
  startAt: string | null;
  endAt?: string | null;
  visibleToClient?: boolean;
  createdById?: string | null;
}

export interface ClientPortalOverview {
  organization: ClientOrganization;
  projects: ClientProject[];
  memberships?: ClientMembership[];
  tickets: ClientTicket[];
  updates: ClientUpdate[];
  metrics: ClientMetricSnapshot[];
  resources: ClientResourceLink[];
  workItems?: ClientWorkItem[];
  approvals?: ClientApproval[];
  reports?: ClientReport[];
  roadmapRecommendations?: ClientRoadmapRecommendation[];
  assets?: ClientAsset[];
  billingStatus?: ClientBillingStatus | null;
  storageRoot?: ClientStorageRoot | null;
  bookingRequests?: ClientBookingRequest[];
  paymentConnections?: ClientPaymentConnection[];
  invoices?: ClientInvoice[];
  calendarItems?: ClientCalendarItem[];
}

export interface ClientPortalBootstrap {
  organizations: ClientOrganization[];
  selectedId: string;
  overview: ClientPortalOverview | null;
  activities: ClientActivity[];
  queueItems: ClientActionQueueItem[];
}

export async function fetchClientOrganizations(): Promise<ClientOrganization[]> {
  const response = await apiFetch('/clients/organizations');
  return response.json();
}

export async function fetchClientPortalBootstrap(organizationId?: string): Promise<ClientPortalBootstrap> {
  const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
  const response = await apiFetch(`/clients/portal/bootstrap${query}`);
  return response.json();
}

export async function fetchClientServiceTiers(): Promise<ClientServiceTier[]> {
  const response = await apiFetch('/clients/service-tiers');
  return response.json();
}

export async function createClientServiceTier(data: {
  name: string;
  description?: string;
  monthlyPrice?: number;
  priorityRank?: number;
}): Promise<ClientServiceTier> {
  const response = await apiFetch('/clients/service-tiers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientServiceTier(
  tierId: string,
  data: {
    name?: string;
    description?: string | null;
    monthlyPrice?: number | null;
    priorityRank?: number;
  },
): Promise<ClientServiceTier> {
  const response = await apiFetch(`/clients/service-tiers/${tierId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteClientServiceTier(tierId: string): Promise<void> {
  await apiFetch(`/clients/service-tiers/${tierId}`, {
    method: 'DELETE',
  });
}

export async function createClientOrganization(data: {
  name: string;
  slug?: string;
  websiteUrl?: string;
  websiteWorkType?: ClientWebsiteWorkType;
  notes?: string;
  tierId?: string;
}): Promise<ClientOrganization> {
  const response = await apiFetch('/clients/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientOrganizationServiceTier(
  organizationId: string,
  tierId: string | null,
): Promise<ClientOrganization> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/service-tier`, {
    method: 'PATCH',
    body: JSON.stringify({ tierId }),
  });
  return response.json();
}

export async function updateClientOrganizationStatus(
  organizationId: string,
  status: string,
): Promise<ClientOrganization> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response.json();
}

export async function fetchClientOverview(organizationId: string): Promise<ClientPortalOverview> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/overview`);
  return response.json();
}

export async function fetchClientMemberships(organizationId: string): Promise<ClientMembership[]> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/memberships`);
  return response.json();
}

export async function createClientMembership(organizationId: string, data: {
  userId: string;
  role?: string;
  status?: string;
}): Promise<ClientMembership> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/memberships`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function inviteClientUser(organizationId: string, data: {
  email: string;
  name?: string;
  role?: string;
  status?: string;
}): Promise<ClientInviteResult> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientMembership(membershipId: string, data: {
  role?: string;
  status?: string;
}): Promise<ClientMembership> {
  const response = await apiFetch(`/clients/memberships/${membershipId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientProject(organizationId: string, data: Partial<ClientProject> & { name: string }) {
  const response = await apiFetch(`/clients/organizations/${organizationId}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientProject(projectId: string, data: {
  status?: string;
  summary?: string;
  progress?: number;
  liveUrl?: string;
  previewUrl?: string;
  internalNotes?: string;
}): Promise<ClientProject> {
  const response = await apiFetch(`/clients/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientUpdate(organizationId: string, data: {
  title: string;
  body: string;
  status?: string;
  visibleToClient?: boolean;
  projectId?: string;
}) {
  const response = await apiFetch(`/clients/organizations/${organizationId}/updates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientMetric(organizationId: string, data: {
  label: string;
  value: string;
  unit?: string;
  source?: string;
  notes?: string;
  visibleToClient?: boolean;
}) {
  const response = await apiFetch(`/clients/organizations/${organizationId}/metrics`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientResource(organizationId: string, data: {
  label: string;
  url: string;
  type?: string;
  projectId?: string;
  visibleToClient?: boolean;
}): Promise<ClientResourceLink> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/resources`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientResource(resourceId: string, data: {
  label?: string;
  url?: string;
}): Promise<ClientResourceLink> {
  const response = await apiFetch(`/clients/resources/${resourceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteClientResource(resourceId: string): Promise<void> {
  await apiFetch(`/clients/resources/${resourceId}`, {
    method: 'DELETE',
  });
}

export async function fetchClientTickets(organizationId?: string): Promise<ClientTicket[]> {
  const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
  const response = await apiFetch(`/clients/tickets${query}`);
  return response.json();
}

export async function createClientTicket(organizationId: string, data: {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  projectId?: string;
}): Promise<ClientTicket> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/tickets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientTicket(ticketId: string, data: {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  projectId?: string | null;
  assignedToId?: string | null;
  internalNotes?: string | null;
}): Promise<ClientTicket> {
  const response = await apiFetch(`/clients/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteClientTicket(ticketId: string): Promise<void> {
  await apiFetch(`/clients/tickets/${ticketId}`, {
    method: 'DELETE',
  });
}

export async function createClientTicketComment(ticketId: string, data: {
  body: string;
  visibility?: string;
}): Promise<ClientTicket> {
  const response = await apiFetch(`/clients/tickets/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientTicketStatus(ticketId: string, status: string): Promise<ClientTicket> {
  const response = await apiFetch(`/clients/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return response.json();
}

export async function createClientWorkItem(organizationId: string, data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  progress?: number;
  dueAt?: string;
  projectId?: string;
  assignedToId?: string;
  visibleToClient?: boolean;
}): Promise<ClientWorkItem> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/work-items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientWorkItem(workItemId: string, data: Partial<ClientWorkItem>): Promise<ClientWorkItem> {
  const response = await apiFetch(`/clients/work-items/${workItemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientApproval(organizationId: string, data: {
  title: string;
  description?: string;
  status?: string;
  dueAt?: string;
  projectId?: string;
  visibleToClient?: boolean;
}): Promise<ClientApproval> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/approvals`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientApproval(approvalId: string, data: Partial<ClientApproval>): Promise<ClientApproval> {
  const response = await apiFetch(`/clients/approvals/${approvalId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function respondClientApproval(approvalId: string, data: {
  status: 'approved' | 'changes_requested';
  responseNote?: string;
}): Promise<ClientApproval> {
  const response = await apiFetch(`/clients/approvals/${approvalId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientReport(organizationId: string, data: {
  title: string;
  summary?: string;
  periodStart: string;
  periodEnd: string;
  status?: string;
  visibleToClient?: boolean;
  leadsCaptured?: number;
  missedOpportunities?: number;
  followUpStatus?: string;
  leadSourceBreakdown?: Record<string, unknown>;
  reputationSnapshot?: Record<string, unknown>;
  localVisibilitySnapshot?: Record<string, unknown>;
}): Promise<ClientReport> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/reports`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function generateClientReportDraft(organizationId: string, data: {
  title?: string;
  periodStart: string;
  periodEnd: string;
  visibleToClient?: boolean;
}): Promise<ClientReport> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/reports/draft`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientReport(reportId: string, data: Partial<ClientReport>): Promise<ClientReport> {
  const response = await apiFetch(`/clients/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientRoadmapRecommendation(organizationId: string, data: {
  title: string;
  body: string;
  priority?: string;
  status?: string;
  impact?: string;
  effort?: string;
  visibleToClient?: boolean;
  sortOrder?: number;
}): Promise<ClientRoadmapRecommendation> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/roadmap`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientRoadmapRecommendation(roadmapId: string, data: Partial<ClientRoadmapRecommendation>): Promise<ClientRoadmapRecommendation> {
  const response = await apiFetch(`/clients/roadmap/${roadmapId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientAsset(organizationId: string, data: {
  label: string;
  url: string;
  type?: string;
  status?: string;
  notes?: string;
  projectId?: string;
  visibleToClient?: boolean;
}): Promise<ClientAsset> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/assets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientAsset(assetId: string, data: Partial<ClientAsset>): Promise<ClientAsset> {
  const response = await apiFetch(`/clients/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function upsertClientBillingStatus(organizationId: string, data: {
  planName?: string;
  status: string;
  monthlyAmount?: number;
  currency?: string;
  renewalAt?: string;
  notes?: string;
  visibleToClient?: boolean;
}): Promise<ClientBillingStatus> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/billing-status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function upsertClientStorageRoot(organizationId: string, data: {
  provider: string;
  status: string;
  folderName?: string;
  externalFolderId?: string | null;
  externalUrl?: string | null;
  notes?: string | null;
}): Promise<ClientStorageRoot> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/storage-root`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientBookingRequest(organizationId: string, data: {
  provider?: string;
  status?: string;
  subject: string;
  preferredStartAt?: string;
  preferredEndAt?: string;
  timezone?: string;
  meetingUrl?: string;
  notes?: string;
  visibleToClient?: boolean;
}): Promise<ClientBookingRequest> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/booking-requests`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientBookingRequest(bookingId: string, data: Partial<ClientBookingRequest>): Promise<ClientBookingRequest> {
  const response = await apiFetch(`/clients/booking-requests/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function upsertClientPaymentConnection(organizationId: string, data: {
  provider: string;
  accountType?: string;
  status: string;
  mode?: string;
  accountLabel?: string | null;
  externalCustomerId?: string | null;
  externalMerchantId?: string | null;
  lastFour?: string | null;
  webhookStatus?: string;
  notes?: string | null;
}): Promise<ClientPaymentConnection> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/payment-connections`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientInvoice(organizationId: string, data: {
  provider?: string;
  status?: string;
  invoiceNumber?: string;
  amount: number;
  currency?: string;
  issueAt?: string;
  dueAt?: string;
  paidAt?: string;
  externalInvoiceId?: string;
  hostedInvoiceUrl?: string;
  notes?: string;
  visibleToClient?: boolean;
}): Promise<ClientInvoice> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/invoices`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function generateClientInvoice(organizationId: string, data: {
  provider?: string;
  status?: string;
  dueAt?: string;
  visibleToClient?: boolean;
  notes?: string;
} = {}): Promise<ClientInvoice> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/invoices/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientInvoice(invoiceId: string, data: Partial<ClientInvoice>): Promise<ClientInvoice> {
  const response = await apiFetch(`/clients/invoices/${invoiceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function createClientCalendarItem(organizationId: string, data: {
  title: string;
  description?: string;
  channel?: string;
  status?: string;
  startAt: string;
  endAt?: string;
  projectId?: string | null;
  visibleToClient?: boolean;
}): Promise<ClientCalendarItem> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/calendar-items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateClientCalendarItem(calendarItemId: string, data: Partial<ClientCalendarItem>): Promise<ClientCalendarItem> {
  const response = await apiFetch(`/clients/calendar-items/${calendarItemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteClientCalendarItem(calendarItemId: string): Promise<void> {
  await apiFetch(`/clients/calendar-items/${calendarItemId}`, {
    method: 'DELETE',
  });
}
