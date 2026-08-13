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

export interface SetGemfieldPhaseInput {
  phase: string;
  /** Milestone state; defaults to 'complete' server-side. */
  status?: string;
  /** Becomes the body of a CLIENT-VISIBLE activity. Never put internal notes here. */
  note?: string;
  stagingUrl?: string;
  liveUrl?: string;
}

/**
 * Staff phase editor. Hits the entitlement-guarded staff route, which 404s for a
 * non-Gemfield org or a non-privileged caller - so only call it for an org with
 * gemfieldClient true.
 *
 * Forward-only by design: the backend sets the project's current phase to the
 * furthest phase it has ever seen, so recording an earlier phase backfills that
 * milestone without regressing the build.
 */
export async function setGemfieldProjectPhase(
  organizationId: string,
  projectId: string,
  input: SetGemfieldPhaseInput,
): Promise<void> {
  await apiFetch(
    `/gemfield/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/phase`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
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

export interface GemfieldTicketComment {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string } | null;
}

export interface GemfieldTicketAttachment {
  id: string;
  uploadId: string;
  name: string;
  contentType: string | null;
  url: string;
}

export interface GemfieldTicketDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  ticketKind: string | null;
  changeClass: string | null;
  wizardAnswers: Record<string, unknown> | null;
  sourceWizardVersion: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  organization: { id: string; name: string };
  project: { gfId: string | null; gemfieldPhase: string | null; name: string } | null;
  creator: { id: string; name: string | null; email: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
  comments: GemfieldTicketComment[];
  attachments: GemfieldTicketAttachment[];
}

export async function fetchGemfieldTicketDetail(ticketId: string): Promise<GemfieldTicketDetail> {
  const response = await apiFetch(`/gemfield/admin/tickets/${encodeURIComponent(ticketId)}`);
  return response.json();
}

// Attachments are auth-protected, so we fetch the bytes with the token and open a blob URL rather
// than linking directly (a plain <a href> would 401 - the access token lives in memory, not a cookie).
export async function openGemfieldAttachment(uploadId: string): Promise<void> {
  const response = await apiFetch(`/uploads/files/${encodeURIComponent(uploadId)}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
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
