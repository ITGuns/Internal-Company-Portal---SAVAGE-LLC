export interface ClientPortalNavItem {
  href: string;
  label: string;
  title: string;
  subtitle: string;
}

export const CLIENT_PORTAL_NAV_ITEMS: ClientPortalNavItem[] = [
  {
    href: "/client",
    label: "Command Center",
    title: "Command Center",
    subtitle: "Progress, approvals, requests, reports, and next actions",
  },
  {
    href: "/client/work",
    label: "Work",
    title: "Work",
    subtitle: "Website progress, open tasks, and completed work",
  },
  {
    href: "/client/approvals",
    label: "Approvals",
    title: "Approvals",
    subtitle: "Review items waiting for approval or changes",
  },
  {
    href: "/client/messages",
    label: "Messages",
    title: "Messages",
    subtitle: "Conversations tied to requests and updates",
  },
  {
    href: "/client/reports",
    label: "Reports",
    title: "Reports",
    subtitle: "Monthly performance, leads, reviews, and visibility",
  },
  {
    href: "/client/resources",
    label: "Resources",
    title: "Resources",
    subtitle: "Files, assets, reports, and shared links",
  },
  {
    href: "/client/account",
    label: "Account",
    title: "Account",
    subtitle: "Plan, team, access, and account status",
  },
  {
    href: "/client/calendar",
    label: "Calendar",
    title: "Calendar",
    subtitle: "Campaign and content schedule",
  },
];

export function getClientPortalRouteTitle(pathname: string): Pick<ClientPortalNavItem, "title" | "subtitle"> | null {
  const route = [...CLIENT_PORTAL_NAV_ITEMS]
    .sort((first, second) => second.href.length - first.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!route) return null;

  return {
    title: route.title,
    subtitle: route.subtitle,
  };
}
