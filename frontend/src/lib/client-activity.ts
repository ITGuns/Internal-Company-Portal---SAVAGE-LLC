import { apiFetch } from "./api";

export interface ClientActivity {
  id: string;
  organizationId: string;
  actorId?: string | null;
  actor?: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
  type: string;
  subjectType: string;
  subjectId?: string | null;
  visibility: "internal" | "client" | string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | null;
}

export const CLIENT_ACTION_QUEUE_CATEGORIES = [
  "team_response_needed",
  "client_response_needed",
  "approval_needed",
  "work_due_soon",
  "report_ready",
  "recently_completed",
] as const;

export type ClientActionQueueCategory = typeof CLIENT_ACTION_QUEUE_CATEGORIES[number];

export interface ClientActionQueueItem {
  id: string;
  organizationId: string;
  organizationName: string;
  category: ClientActionQueueCategory;
  title: string;
  summary: string;
  subjectType: string;
  subjectId: string;
  priority: string;
  dueAt: string | null;
  href: string;
  visibility: "internal" | "client" | string;
}

export type ClientActivityTone = "message" | "approval" | "work" | "report" | "calendar" | "account";

export const CLIENT_ACTION_QUEUE_LABELS: Record<ClientActionQueueCategory, string> = {
  team_response_needed: "Team response needed",
  client_response_needed: "Client response needed",
  approval_needed: "Approval needed",
  work_due_soon: "Work due soon",
  report_ready: "Report ready",
  recently_completed: "Recently completed",
};

export async function fetchClientActivity(
  organizationId: string,
  options: { limit?: number; subjectType?: string; subjectId?: string } = {},
): Promise<ClientActivity[]> {
  const query = new URLSearchParams();
  if (options.limit) query.set("limit", String(options.limit));
  if (options.subjectType) query.set("subjectType", options.subjectType);
  if (options.subjectId) query.set("subjectId", options.subjectId);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiFetch(`/clients/organizations/${organizationId}/activity${suffix}`);
  return response.json();
}

export async function fetchClientActionQueue(organizationId?: string): Promise<ClientActionQueueItem[]> {
  const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
  const response = await apiFetch(`/clients/activity/queue${query}`);
  return response.json();
}

export function groupClientActionQueue(items: ClientActionQueueItem[]) {
  const groups = CLIENT_ACTION_QUEUE_CATEGORIES.reduce((result, category) => {
    result[category] = [];
    return result;
  }, {} as Record<ClientActionQueueCategory, ClientActionQueueItem[]>);

  for (const item of items) {
    if (item.category in groups) {
      groups[item.category].push(item);
    }
  }

  return groups;
}

export function getClientActivityTone(type: string): ClientActivityTone {
  if (type.includes("approval")) return "approval";
  if (type.includes("work_item")) return "work";
  if (type.includes("report")) return "report";
  if (type.includes("calendar")) return "calendar";
  if (type.includes("organization") || type.includes("billing") || type.includes("membership")) return "account";
  return "message";
}
