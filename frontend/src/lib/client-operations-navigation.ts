export interface ClientOperationsNavItem {
  href: string;
  label: string;
  title: string;
  subtitle: string;
}

export const CLIENT_OPERATIONS_NAV_ITEMS: ClientOperationsNavItem[] = [
  {
    href: "/operations/clients",
    label: "Overview",
    title: "Client Operations",
    subtitle: "Client workspaces, requests, approvals, reports, and delivery progress",
  },
  {
    href: "/operations/clients/accounts",
    label: "Accounts",
    title: "Client Accounts",
    subtitle: "Client setup, team access, invitations, and account status",
  },
  {
    href: "/operations/clients/delivery",
    label: "Delivery",
    title: "Client Delivery",
    subtitle: "Website progress, work items, completed work, and client updates",
  },
  {
    href: "/operations/clients/requests",
    label: "Requests",
    title: "Client Requests",
    subtitle: "Website change requests, support tickets, replies, and internal notes",
  },
  {
    href: "/operations/clients/approvals",
    label: "Approvals",
    title: "Approval Queue",
    subtitle: "Client decisions, change requests, and pending approvals",
  },
  {
    href: "/operations/clients/reports",
    label: "Reports",
    title: "Client Reports",
    subtitle: "Monthly performance, leads, reputation, and local visibility",
  },
  {
    href: "/operations/clients/assets",
    label: "Assets",
    title: "Client Assets",
    subtitle: "Files, resources, shared links, and client-visible materials",
  },
  {
    href: "/operations/clients/billing",
    label: "Billing",
    title: "Billing Status",
    subtitle: "Service tier, payment status, renewal details, and visibility",
  },
  {
    href: "/operations/clients/roadmap",
    label: "Roadmap",
    title: "Client Roadmap",
    subtitle: "Next recommendations, impact, effort, and future work",
  },
  {
    href: "/operations/clients/calendar",
    label: "Calendar",
    title: "Client Calendar",
    subtitle: "Campaign, content, and scheduled client-facing work",
  },
];

export function getClientOperationsRouteTitle(pathname: string): Pick<ClientOperationsNavItem, "title" | "subtitle"> {
  const route = [...CLIENT_OPERATIONS_NAV_ITEMS]
    .sort((first, second) => second.href.length - first.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return route
    ? { title: route.title, subtitle: route.subtitle }
    : CLIENT_OPERATIONS_NAV_ITEMS[0];
}

export function isClientOperationsNavItemActive(href: string, pathname: string): boolean {
  if (href === "/operations/clients") return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function withClientOperationsClientParam(href: string, clientId?: string | null): string {
  if (!clientId) return href;

  return `${href}?client=${encodeURIComponent(clientId)}`;
}
