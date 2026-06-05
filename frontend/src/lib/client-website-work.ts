export const CLIENT_WEBSITE_WORK_TYPES = [
  {
    value: "existing_site_improvement",
    label: "Improve existing website",
    description: "Use the client's current website as the starting point.",
  },
  {
    value: "new_build",
    label: "Build new website",
    description: "Start from scratch when the client has no site or needs a full rebuild.",
  },
] as const;

export type ClientWebsiteWorkType = (typeof CLIENT_WEBSITE_WORK_TYPES)[number]["value"];

const CLIENT_WEBSITE_WORK_LABELS: Record<ClientWebsiteWorkType, string> = Object.fromEntries(
  CLIENT_WEBSITE_WORK_TYPES.map((option) => [option.value, option.label]),
) as Record<ClientWebsiteWorkType, string>;

export function isClientWebsiteWorkType(value: string): value is ClientWebsiteWorkType {
  return CLIENT_WEBSITE_WORK_TYPES.some((option) => option.value === value);
}

export function getClientWebsiteWorkTypeLabel(value?: string | null): string {
  if (!value || !isClientWebsiteWorkType(value)) return "Website work not set";
  return CLIENT_WEBSITE_WORK_LABELS[value];
}

export function getClientWebsiteUrlLabel(value?: string | null): string {
  return value === "new_build" ? "Current or target Website URL" : "Existing Website URL";
}

export function getClientWebsiteUrlHelperText(value?: string | null): string {
  if (value === "new_build") {
    return "Optional. Use it for a current domain, planned launch URL, or leave blank if none exists yet.";
  }
  return "Paste the website we will improve.";
}
