import type {
  ClientApproval,
  ClientAsset,
  ClientBillingStatus,
  ClientCalendarItem,
  ClientMetricSnapshot,
  ClientPortalOverview,
  ClientReport,
  ClientRoadmapRecommendation,
  ClientTicket,
  ClientTicketComment,
  ClientUpdate,
  ClientWorkItem,
} from "./client-portal";

interface ClientMessageSummary {
  ticket: ClientTicket;
  comment: ClientTicketComment;
}

interface ClientReportMetric {
  id: string;
  label: string;
  value: string;
  unit?: string | null;
}

const CLOSED_TICKET_STATUSES = new Set(["closed", "completed", "resolved", "done"]);
const CLOSED_WORK_STATUSES = new Set(["completed", "done", "archived"]);
const CLOSED_APPROVAL_STATUSES = new Set(["approved", "changes_requested", "rejected", "archived"]);

function compareNewestDate(a?: string | null, b?: string | null): number {
  return new Date(b || 0).getTime() - new Date(a || 0).getTime();
}

function getOpenRequests(tickets: ClientTicket[]): ClientTicket[] {
  return tickets.filter((ticket) => !CLOSED_TICKET_STATUSES.has(ticket.status));
}

function getReviewRequests(tickets: ClientTicket[]): ClientTicket[] {
  return tickets.filter((ticket) => ticket.status === "review");
}

function getOpenWorkItems(workItems: ClientWorkItem[]): ClientWorkItem[] {
  return workItems.filter((item) => !CLOSED_WORK_STATUSES.has(item.status));
}

function getCompletedWorkItems(workItems: ClientWorkItem[]): ClientWorkItem[] {
  return workItems
    .filter((item) => CLOSED_WORK_STATUSES.has(item.status))
    .sort((a, b) => compareNewestDate(a.completedAt || a.updatedAt, b.completedAt || b.updatedAt));
}

function getOpenApprovals(approvals: ClientApproval[]): ClientApproval[] {
  return approvals.filter((approval) => !CLOSED_APPROVAL_STATUSES.has(approval.status));
}

function getLatestMessage(tickets: ClientTicket[]): ClientMessageSummary | null {
  const messages = tickets.flatMap((ticket) => (
    (ticket.comments || [])
      .filter((comment) => comment.visibility !== "internal")
      .map((comment) => ({ ticket, comment }))
  ));

  return messages.sort((a, b) => compareNewestDate(a.comment.createdAt, b.comment.createdAt))[0] || null;
}

function getAverageProgress(overview: ClientPortalOverview | null): number {
  const projects = overview?.projects || [];
  if (projects.length === 0) return 0;

  return Math.round(projects.reduce((total, project) => total + (project.progress || 0), 0) / projects.length);
}

function buildReportMetrics(report: ClientReport | null, fallbackMetrics: ClientMetricSnapshot[]): Array<ClientReportMetric | ClientMetricSnapshot> {
  if (!report) return fallbackMetrics.slice(0, 6);

  const metrics: ClientReportMetric[] = [];
  if (typeof report.leadsCaptured === "number") {
    metrics.push({ id: "leadsCaptured", label: "Leads captured", value: String(report.leadsCaptured), unit: "leads" });
  }
  if (typeof report.missedOpportunities === "number") {
    metrics.push({ id: "missedOpportunities", label: "Missed opportunities", value: String(report.missedOpportunities) });
  }
  if (report.followUpStatus) {
    metrics.push({ id: "followUpStatus", label: "Follow-up status", value: report.followUpStatus });
  }

  return metrics.length > 0 ? metrics : fallbackMetrics.slice(0, 6);
}

export function buildClientCommandCenter(overview: ClientPortalOverview | null) {
  const tickets = overview?.tickets || [];
  const updates = overview?.updates || [];
  const metrics = overview?.metrics || [];
  const workItems = overview?.workItems || [];
  const approvals = overview?.approvals || [];
  const reports = overview?.reports || [];
  const latestReport = reports[0] || null;
  const completedWorkItems = getCompletedWorkItems(workItems);

  return {
    averageProgress: getAverageProgress(overview),
    reviewRequests: approvals.length > 0 ? getOpenApprovals(approvals) : getReviewRequests(tickets),
    openRequests: getOpenRequests(tickets),
    latestUpdate: updates[0] || null,
    latestMessage: getLatestMessage(tickets),
    openWorkItems: getOpenWorkItems(workItems),
    recentCompletedWork: (completedWorkItems.length > 0 ? completedWorkItems : updates.slice(0, 5)) as Array<ClientWorkItem | ClientUpdate>,
    latestReport,
    reportMetrics: buildReportMetrics(latestReport, metrics),
    roadmapRecommendations: (overview?.roadmapRecommendations || []) as ClientRoadmapRecommendation[],
    assets: (overview?.assets || []) as ClientAsset[],
    billingStatus: (overview?.billingStatus || null) as ClientBillingStatus | null,
    calendarItems: (overview?.calendarItems || []) as ClientCalendarItem[],
  };
}
