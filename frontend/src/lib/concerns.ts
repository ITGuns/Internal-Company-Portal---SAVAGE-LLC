import { apiFetch } from './api';

// Concerns (internal tickets): shapes of /api/concerns (backend/src/concerns) and
// pure helpers. The limits mirror backend/src/concerns/concerns.rules.ts.

export type ConcernStatus = 'open' | 'answered' | 'closed';
export type ConcernBox = 'inbox' | 'sent' | 'all';
export type ConcernTone = 'warning' | 'success' | 'muted';

export const CONCERN_STATUSES: readonly ConcernStatus[] = ['open', 'answered', 'closed'];
export const CONCERN_BOXES: readonly ConcernBox[] = ['inbox', 'sent', 'all'];
export const SUBJECT_MIN_LENGTH = 3;
export const SUBJECT_MAX_LENGTH = 120;
export const BODY_MAX_LENGTH = 4000;
// The socket's data:changed { resource: 'concerns' } invalidates everything under this key.
export const CONCERNS_QUERY_KEY = ['concerns'] as const;
export const CONCERNS_LIST_KEY = [...CONCERNS_QUERY_KEY, 'list'] as const;
export const CONCERNS_INBOX_OPEN_KEY = [...CONCERNS_QUERY_KEY, 'inbox-open'] as const;

// Backend refusals for a concern that is missing or not yours (404 and 403).
const UNAVAILABLE_MESSAGES = ['Concern not found', 'You do not have access to this concern'];

export interface ConcernPerson {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

export interface ConcernSummary {
  id: string;
  number: number;
  subject: string;
  status: ConcernStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  requester: ConcernPerson;
  assignee: ConcernPerson;
  messageCount: number;
}

export interface ConcernMessage {
  id: string;
  body: string;
  createdAt: string;
  author: ConcernPerson;
}

export interface ConcernDetail extends ConcernSummary {
  canView: true;
  messages: ConcernMessage[];
  permissions: { canReply: boolean; canClose: boolean; canReopen: boolean; canReassign: boolean };
}

export interface ConcernHandedOn {
  id: string;
  number: number;
  canView: false;
  assignee: Pick<ConcernPerson, 'id' | 'name' | 'email'>;
}

export interface ConcernListViewer {
  id: string;
  isFullAccess: boolean;
  canListAll: boolean;
}

export interface ConcernList {
  box: ConcernBox;
  status: ConcernStatus | null;
  q: string;
  items: ConcernSummary[];
  counts: Record<ConcernStatus, number>;
  viewer: ConcernListViewer;
}

export interface ConcernFilters {
  box: ConcernBox;
  status: ConcernStatus | null;
  q: string;
}

export interface ConcernDraftErrors {
  assigneeId?: string;
  subject?: string;
  body?: string;
}

export interface ConcernAttentionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  severity: 'warning';
}

const STATUS_LABELS: Record<ConcernStatus, string> = { open: 'Open', answered: 'Answered', closed: 'Closed' };
const STATUS_TONES: Record<ConcernStatus, ConcernTone> = { open: 'warning', answered: 'success', closed: 'muted' };

export function getConcernStatusLabel(status: string): string {
  return STATUS_LABELS[status as ConcernStatus] ?? 'Unknown';
}

export function getConcernStatusTone(status: string): ConcernTone {
  return STATUS_TONES[status as ConcernStatus] ?? 'muted';
}

/** One plain line about whose turn it is, from the viewer's side. */
export function getConcernNextStep(concern: Pick<ConcernSummary, 'status' | 'requester' | 'assignee'>, viewerId: string): string {
  if (concern.status === 'closed') return 'Closed';
  const isAssignee = concern.assignee.id === viewerId;
  const isRequester = concern.requester.id === viewerId;
  if (concern.status === 'open') {
    if (isAssignee) return 'Waiting for your reply';
    if (isRequester) return 'Waiting for a reply';
    return 'Waiting for the assignee';
  }
  if (isRequester) return 'Reply received';
  if (isAssignee) return 'You replied';
  return 'Answered';
}

export function getPersonName(person: Pick<ConcernPerson, 'name' | 'email'> | null | undefined): string {
  return person?.name?.trim() || person?.email || 'Unknown member';
}

export function concernDetailKey(id: string) {
  return [...CONCERNS_QUERY_KEY, 'detail', id] as const;
}

export function concernListKey(filters: ConcernFilters) {
  return [...CONCERNS_LIST_KEY, filters.box, filters.status ?? 'any', filters.q] as const;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fullFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Compact list time: the time today, the date this year, the full date before that. */
export function formatConcernTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (date.toDateString() === now.toDateString()) return timeFormatter.format(date);
  if (date.getFullYear() === now.getFullYear()) return dayFormatter.format(date);
  return fullFormatter.format(date);
}

export function formatConcernDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : fullFormatter.format(date);
}

export function parseConcernBox(value: string | null | undefined): ConcernBox {
  return CONCERN_BOXES.includes(value as ConcernBox) ? (value as ConcernBox) : 'inbox';
}

export function parseConcernStatus(value: string | null | undefined): ConcernStatus | null {
  return CONCERN_STATUSES.includes(value as ConcernStatus) ? (value as ConcernStatus) : null;
}

/** Query string for the page URL and the API: defaults are left out. */
export function buildConcernsQuery(filters: Partial<ConcernFilters>): string {
  const params = new URLSearchParams();
  if (filters.box && filters.box !== 'inbox') params.set('box', filters.box);
  if (filters.status) params.set('status', filters.status);
  const q = filters.q?.trim();
  if (q) params.set('q', q);
  return params.toString();
}

export function canOpenConcern(concern: Pick<ConcernSummary, 'requester' | 'assignee'>, viewer: Pick<ConcernListViewer, 'id' | 'isFullAccess'>): boolean {
  return viewer.isFullAccess || concern.requester.id === viewer.id || concern.assignee.id === viewer.id;
}

export function validateConcernDraft(draft: { assigneeId: string; subject: string; body: string }): ConcernDraftErrors {
  const subject = draft.subject.trim();
  const body = draft.body.trim();
  return {
    ...(draft.assigneeId ? {} : { assigneeId: 'Choose who should get this concern.' }),
    ...(subject.length < SUBJECT_MIN_LENGTH || subject.length > SUBJECT_MAX_LENGTH
      ? { subject: `Subject must be ${SUBJECT_MIN_LENGTH} to ${SUBJECT_MAX_LENGTH} characters.` }
      : {}),
    ...(body.length === 0 ? { body: 'Write what you need help with.' } : {}),
    ...(body.length > BODY_MAX_LENGTH ? { body: `Keep it under ${BODY_MAX_LENGTH} characters.` } : {}),
  };
}

export function hasDraftErrors(errors: ConcernDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function validateReply(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return 'Write a reply first.';
  if (trimmed.length > BODY_MAX_LENGTH) return `Keep it under ${BODY_MAX_LENGTH} characters.`;
  return null;
}

export function isConcernUnavailableError(error: unknown): boolean {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && UNAVAILABLE_MESSAGES.includes(message);
}

/** Dashboard "Needs Attention": open concerns waiting in the viewer's inbox, first in the list. */
export function withOpenConcernsAttention<T>(items: readonly T[], openCount: number): Array<T | ConcernAttentionItem> {
  if (!Number.isFinite(openCount) || openCount <= 0) return [...items];
  const item: ConcernAttentionItem = {
    id: 'open-concerns',
    title: 'Concerns waiting for you',
    description: `${openCount} open ${openCount === 1 ? 'concern needs' : 'concerns need'} your reply.`,
    href: '/concerns?status=open',
    count: openCount,
    severity: 'warning',
  };
  return [item, ...items];
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  return response.json();
}

export function fetchConcerns(filters: ConcernFilters): Promise<ConcernList> {
  const query = buildConcernsQuery(filters);
  return readJson<ConcernList>(`/concerns${query ? `?${query}` : ''}`);
}

export async function fetchOpenInboxConcernCount(): Promise<number> {
  const list = await fetchConcerns({ box: 'inbox', status: 'open', q: '' });
  return list.counts.open;
}

export function fetchConcern(id: string): Promise<ConcernDetail> {
  return readJson<ConcernDetail>(`/concerns/${encodeURIComponent(id)}`);
}

export function createConcern(input: { assigneeId: string; subject: string; body: string }): Promise<ConcernDetail> {
  return readJson<ConcernDetail>('/concerns', { method: 'POST', body: JSON.stringify(input) });
}

export function replyToConcern(id: string, body: string): Promise<ConcernDetail> {
  return readJson<ConcernDetail>(`/concerns/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
}

export function setConcernClosed(id: string, closed: boolean): Promise<ConcernDetail> {
  return readJson<ConcernDetail>(`/concerns/${encodeURIComponent(id)}/${closed ? 'close' : 'reopen'}`, { method: 'POST' });
}

export function reassignConcern(id: string, assigneeId: string): Promise<ConcernDetail | ConcernHandedOn> {
  return readJson<ConcernDetail | ConcernHandedOn>(`/concerns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ assigneeId }),
  });
}
