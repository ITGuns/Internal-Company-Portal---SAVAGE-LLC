export interface ClientPortalOption {
  value: string;
  label: string;
  description?: string;
}

export const CLIENT_TICKET_CATEGORIES: ClientPortalOption[] = [
  { value: "website", label: "Website Change", description: "Pages, copy, images, forms" },
  { value: "content", label: "Content Update", description: "Text, photos, offers, hours" },
  { value: "reporting", label: "Results Question", description: "Leads, calls, rankings, ROI" },
  { value: "access", label: "Access Help", description: "Login, account, portal support" },
  { value: "billing", label: "Billing", description: "Invoice or payment question" },
  { value: "general", label: "Other Request", description: "Anything else we should handle" },
];

export const CLIENT_TICKET_PRIORITIES: ClientPortalOption[] = [
  { value: "normal", label: "Normal", description: "Standard queue" },
  { value: "high", label: "High", description: "Needs attention soon" },
  { value: "urgent", label: "Urgent", description: "Blocking launch or sales" },
];

export const CLIENT_TICKET_STATUSES: ClientPortalOption[] = [
  { value: "new", label: "New" },
  { value: "review", label: "Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const CLIENT_TICKET_QUICK_REPLIES = [
  "Approved, please proceed.",
  "Looks good to me.",
  "Please make a small change.",
  "Can we review this on a call?",
];

export const CLIENT_ADMIN_TICKET_REPLIES = [
  "We are reviewing this now and will update this ticket with the next step.",
  "This is in progress. We will post another update when the change is ready for review.",
  "This is ready for your review. Please reply here with approval or requested changes.",
  "Completed. Please confirm everything looks correct on your side.",
];

export const CLIENT_ADMIN_TICKET_VISIBILITY_OPTIONS: ClientPortalOption[] = [
  {
    value: "client",
    label: "Client-visible reply",
    description: "Send this reply to the client conversation.",
  },
  {
    value: "internal",
    label: "Internal note",
    description: "Keep this note hidden from the client.",
  },
];

export interface ClientUpdatePreset {
  label: string;
  title: string;
  body: string;
}

export const CLIENT_UPDATE_PRESETS: ClientUpdatePreset[] = [
  {
    label: "Progress made",
    title: "Progress update",
    body: "We completed another round of work and the project is moving forward. The next visible milestone is being prepared now.",
  },
  {
    label: "Ready for review",
    title: "Ready for your review",
    body: "A client-facing item is ready for review. Please check the latest preview and reply in the portal with approval or requested changes.",
  },
  {
    label: "Need client input",
    title: "Client input needed",
    body: "We need your input before the next step can move forward. Please review the open request and send the missing detail in the portal.",
  },
  {
    label: "Work completed",
    title: "Work completed",
    body: "This phase is complete. We will keep monitoring the result and post the next update when there is new progress to review.",
  },
];

export interface ClientTicketDetailPreset {
  category: string;
  label: string;
  detail: string;
}

export const CLIENT_TICKET_DETAIL_PRESETS: ClientTicketDetailPreset[] = [
  {
    category: "website",
    label: "Update hours/contact info",
    detail: "Please update our business hours, phone number, address, or contact details.",
  },
  {
    category: "website",
    label: "Review a page before launch",
    detail: "Please send the page or preview that needs my review before it goes live.",
  },
  {
    category: "content",
    label: "Replace text or photos",
    detail: "Please replace the current text, photos, offer, or service details with the updated version.",
  },
  {
    category: "reporting",
    label: "Explain recent results",
    detail: "Please explain what changed in our recent leads, calls, rankings, or campaign performance.",
  },
  {
    category: "access",
    label: "Login or account help",
    detail: "I need help with portal login, user access, password, or account permissions.",
  },
  {
    category: "billing",
    label: "Invoice or payment question",
    detail: "I have a question about an invoice, payment, subscription, or billing detail.",
  },
  {
    category: "general",
    label: "Ask the team",
    detail: "Please route this to the right person and let me know the next step.",
  },
];

export const CLIENT_MEMBER_ROLES: ClientPortalOption[] = [
  { value: "client_owner", label: "Owner" },
  { value: "client_admin", label: "Admin" },
  { value: "client_member", label: "Member" },
  { value: "client", label: "Client" },
];

export const CLIENT_MEMBER_STATUSES: ClientPortalOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const CLIENT_PROJECT_STATUSES: ClientPortalOption[] = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
];

export function getClientPortalOptionLabel(options: ClientPortalOption[], value?: string | null): string {
  return options.find((option) => option.value === value)?.label || value || "Unknown";
}

export function getClientTicketDetailPresets(category: string): ClientTicketDetailPreset[] {
  const matchingPresets = CLIENT_TICKET_DETAIL_PRESETS.filter((preset) => preset.category === category);
  return matchingPresets.length ? matchingPresets : CLIENT_TICKET_DETAIL_PRESETS.filter((preset) => preset.category === "general");
}

export function buildClientTicketTitle(category: string, description: string): string {
  const categoryLabel = getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, category).replace(/\s+Request$/, "");
  const cleanDescription = description.trim().replace(/\s+/g, " ");
  if (!cleanDescription) return `${categoryLabel} Request`;

  const summary = cleanDescription.length > 72 ? `${cleanDescription.slice(0, 69)}...` : cleanDescription;
  return `${categoryLabel}: ${summary}`;
}
