import { apiFetch } from './api';

export interface ClientServiceTier {
  id: string;
  name: string;
  description?: string | null;
  monthlyPrice?: number | null;
  priorityRank?: number;
}

export interface ClientOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  websiteUrl?: string | null;
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
  visibleToClient?: boolean;
}

export interface ClientPortalOverview {
  organization: ClientOrganization;
  projects: ClientProject[];
  tickets: ClientTicket[];
  updates: ClientUpdate[];
  metrics: ClientMetricSnapshot[];
  resources: ClientResourceLink[];
}

export async function fetchClientOrganizations(): Promise<ClientOrganization[]> {
  const response = await apiFetch('/clients/organizations');
  return response.json();
}

export async function createClientOrganization(data: {
  name: string;
  slug?: string;
  websiteUrl?: string;
  notes?: string;
  tierId?: string;
}): Promise<ClientOrganization> {
  const response = await apiFetch('/clients/organizations', {
    method: 'POST',
    body: JSON.stringify(data),
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
}) {
  const response = await apiFetch(`/clients/organizations/${organizationId}/resources`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
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
