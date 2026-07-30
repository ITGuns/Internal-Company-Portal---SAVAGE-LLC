import { getClientOperationsRouteTitle } from '@/lib/client-operations-navigation';
import { getClientPortalRouteTitle } from '@/lib/client-portal-navigation';

// Single source of truth for per-route titles — used by the Header <h1> AND the
// browser tab title (DocumentTitle). Keep new routes here so both stay in sync.
export const routeTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Today, tasks, logs, and approvals' },
  '/client/tickets': { title: 'Client Tickets', subtitle: 'Submit requests and review status' },
  '/task-tracking': { title: 'Task Tracking', subtitle: 'Plan, assign, and close work' },
  '/task-calendar': { title: 'Task Calendar', subtitle: 'Task schedule and due dates' },
  '/payroll-calendar': { title: 'Payroll Calendar', subtitle: 'Time entries, events, and day review' },
  '/payroll-dashboard': { title: 'Payroll Dashboard', subtitle: 'Payroll review and reporting' },
  '/my-payslips': { title: 'My Payslips', subtitle: 'Payslip history and details' },
  '/announcements': { title: 'Announcements', subtitle: 'Company updates and shoutouts' },
  '/daily-logs': { title: 'Daily Logs', subtitle: 'Daily work reports and reviews' },
  '/chat': { title: 'Messages & Chat', subtitle: 'Team communication' },
  '/company-chat': { title: 'Company Chat', subtitle: 'Public team channels' },
  '/private-messages': { title: 'Private Messages', subtitle: 'Direct conversations' },
  '/file-directory': { title: 'File Directory', subtitle: 'Shared documents and folders' },
  '/operations': { title: 'Operations', subtitle: 'Departments, roles, and approvals' },
  '/operations/onboarding': { title: 'Onboarding', subtitle: 'Generate setup links for approved users' },
  '/profile': { title: 'Profile', subtitle: 'Account settings' },
  '/whiteboard': { title: 'Whiteboard', subtitle: 'Collaborative workspace' },
  '/discord': { title: 'Discord', subtitle: 'External team channel' },
  '/upgrade': { title: 'Upgrade', subtitle: 'Plans and pricing' },
  '/developer/bugs': { title: 'Developer Command Center', subtitle: 'QA tools and bug reporting' },
};

export function getRouteTitle(pathname: string) {
  if (routeTitles[pathname]) return routeTitles[pathname];

  if (pathname === '/operations/clients' || pathname.startsWith('/operations/clients/')) {
    return getClientOperationsRouteTitle(pathname);
  }

  const clientRoute = getClientPortalRouteTitle(pathname);
  if (clientRoute) return clientRoute;

  return Object.entries(routeTitles).find(([key]) => pathname.startsWith(`${key}/`))?.[1];
}
