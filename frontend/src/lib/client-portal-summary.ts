import type { ClientPortalOverview, ClientTicket } from './client-portal';

export function getOpenClientTickets(tickets: ClientTicket[]): ClientTicket[] {
  return tickets.filter((ticket) => !['closed', 'completed', 'resolved', 'done'].includes(ticket.status));
}

export function buildClientPortalSummary(overview: ClientPortalOverview | null) {
  const projects = overview?.projects || [];
  const tickets = overview?.tickets || [];
  const updates = overview?.updates || [];
  const metrics = overview?.metrics || [];
  const resources = overview?.resources || [];
  const openTickets = getOpenClientTickets(tickets);

  const averageProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + (project.progress || 0), 0) / projects.length)
    : 0;

  return {
    projectCount: projects.length,
    openTicketCount: openTickets.length,
    updateCount: updates.length,
    metricCount: metrics.length,
    resourceCount: resources.length,
    averageProgress,
  };
}
