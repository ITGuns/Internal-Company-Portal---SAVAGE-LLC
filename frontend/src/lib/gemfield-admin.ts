import { apiFetch } from './api';

// Staff (developer control panel) API. All reads/writes are Gemfield-scoped and gated server-side.

export type SlaState = 'on_track' | 'due_soon' | 'breached' | 'met';

export interface GemfieldPipelineItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  ticketKind: string | null;
  changeClass: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string };
  gfId: string | null;
  gemfieldPhase: string | null;
  commentCount: number;
  attachmentCount: number;
  sla: { firstResponse: SlaState; resolution: SlaState };
}

export interface PipelineFilters {
  status?: string;
  assigneeId?: string;
  priority?: string;
  devAssist?: boolean;
  organizationId?: string;
  search?: string;
}

export async function fetchGemfieldPipeline(filters: PipelineFilters = {}): Promise<GemfieldPipelineItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.devAssist) params.set('devAssist', 'true');
  if (filters.organizationId) params.set('organizationId', filters.organizationId);
  if (filters.search) params.set('search', filters.search);
  const query = params.toString();
  const response = await apiFetch(`/gemfield/admin/pipeline${query ? `?${query}` : ''}`);
  const data = await response.json();
  return Array.isArray(data?.items) ? (data.items as GemfieldPipelineItem[]) : [];
}

export async function moveGemfieldTicket(ticketId: string, status: string): Promise<void> {
  await apiFetch(`/gemfield/admin/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function assignGemfieldTicket(ticketId: string, assigneeId: string | null): Promise<void> {
  await apiFetch(`/gemfield/admin/tickets/${encodeURIComponent(ticketId)}/assignee`, {
    method: 'PATCH',
    body: JSON.stringify({ assigneeId }),
  });
}

export async function classifyGemfieldTicket(ticketId: string, changeClass: string): Promise<void> {
  await apiFetch(`/gemfield/admin/tickets/${encodeURIComponent(ticketId)}/classification`, {
    method: 'PATCH',
    body: JSON.stringify({ changeClass }),
  });
}

export interface GemfieldEntitlement {
  id: string;
  gemfieldClient: boolean;
  gemfieldCaseIds: string[];
}

export async function setGemfieldEntitlement(
  organizationId: string,
  input: { gemfieldClient?: boolean; gemfieldCaseIds?: string[] },
): Promise<GemfieldEntitlement> {
  const response = await apiFetch(`/gemfield/admin/organizations/${encodeURIComponent(organizationId)}/entitlement`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return response.json();
}

// Reply reuses the existing client ticket comment endpoint (extend, never parallel). The panel
// defaults visibility to 'internal' so an internal note is never accidentally sent to the client.
export async function replyToTicket(
  ticketId: string,
  body: string,
  visibility: 'internal' | 'client',
): Promise<void> {
  await apiFetch(`/clients/tickets/${encodeURIComponent(ticketId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, visibility }),
  });
}
