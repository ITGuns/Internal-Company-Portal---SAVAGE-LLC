import { apiFetch } from './api';

// Client-facing Gemfield build progress. Mirrors the backend serializer in
// backend/src/clients/gemfield/gemfield.service.ts (SerializedGemfieldProject).

export interface GemfieldPhaseInfo {
  phase: string;
  label: string;
}

export interface GemfieldMilestone {
  phase: string;
  label: string;
  status: string;
  note: string | null;
  at: string | null;
}

export interface GemfieldProject {
  id: string;
  name: string;
  gfId: string | null;
  currentPhase: string | null;
  currentPhaseLabel: string | null;
  stagingUrl: string | null;
  liveUrl: string | null;
  progress: number;
  status: string;
  phases: GemfieldPhaseInfo[];
  milestones: GemfieldMilestone[];
}

/**
 * Fetch an org's Gemfield build progress. The backend guard returns 404 for a non-entitled or
 * cross-org caller, so callers should only invoke this for an entitled organization.
 */
export async function fetchGemfieldProgress(organizationId: string): Promise<GemfieldProject[]> {
  const response = await apiFetch(`/gemfield/organizations/${encodeURIComponent(organizationId)}/progress`);
  const data = await response.json();
  return Array.isArray(data?.projects) ? (data.projects as GemfieldProject[]) : [];
}

export type GemfieldTicketKind = 'standard' | 'callback' | 'dev_assist';

export interface GemfieldWizardAttachment {
  name?: string;
  contentType?: string;
  data: string; // base64 or data: URI
}

export interface GemfieldWizardSubmission {
  category: string;
  title?: string;
  description?: string | null;
  projectId?: string | null;
  ticketKind?: GemfieldTicketKind;
  wizardVersion?: string;
  wizardAnswers?: Record<string, unknown> | null;
  callbackNumber?: string | null;
  callbackWindow?: string | null;
  attachments?: GemfieldWizardAttachment[];
}

export interface GemfieldTicketResult {
  ok: boolean;
  reference: string;
  attachmentCount: number;
  ticket: { id: string; title: string; priority: string; ticketKind: string | null };
}

export async function submitGemfieldTicket(
  organizationId: string,
  submission: GemfieldWizardSubmission,
): Promise<GemfieldTicketResult> {
  const response = await apiFetch(`/gemfield/organizations/${encodeURIComponent(organizationId)}/tickets`, {
    method: 'POST',
    body: JSON.stringify(submission),
  });
  return response.json();
}

export interface GemfieldSupportConfig {
  supportPhone: string | null;
  callbackHours: string | null;
}

export async function fetchGemfieldSupport(organizationId: string): Promise<GemfieldSupportConfig> {
  const response = await apiFetch(`/gemfield/organizations/${encodeURIComponent(organizationId)}/support`);
  return response.json();
}

/** Read a File into a base64 data URI (for wizard attachments). */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
