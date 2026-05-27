import type { ClientTicket } from "./client-portal";

export interface ClientTicketFilters {
  query: string;
  status: string;
  priority: string;
  category: string;
}

export const DEFAULT_CLIENT_TICKET_FILTERS: ClientTicketFilters = {
  query: "",
  status: "all",
  priority: "all",
  category: "all",
};

function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function matchesStatus(ticket: ClientTicket, status: string): boolean {
  if (status === "all") return true;
  if (status === "open") return ticket.status !== "done";
  return ticket.status === status;
}

function matchesQuery(ticket: ClientTicket, query: string): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const searchable = [
    ticket.title,
    ticket.description,
    ticket.category,
    ticket.priority,
    ticket.status,
    ...(ticket.comments || []).map((comment) => comment.body),
  ].map(normalize).join(" ");

  return searchable.includes(normalizedQuery);
}

export function filterClientTickets(
  tickets: ClientTicket[],
  filters: ClientTicketFilters = DEFAULT_CLIENT_TICKET_FILTERS,
): ClientTicket[] {
  return tickets.filter((ticket) => (
    matchesQuery(ticket, filters.query)
    && matchesStatus(ticket, filters.status)
    && (filters.priority === "all" || ticket.priority === filters.priority)
    && (filters.category === "all" || ticket.category === filters.category)
  ));
}

export function getClientTicketFilterSummary(
  filteredTickets: ClientTicket[],
  allTickets: ClientTicket[],
  filters: ClientTicketFilters = DEFAULT_CLIENT_TICKET_FILTERS,
): string {
  const hasActiveFilters = Boolean(filters.query.trim())
    || filters.status !== "all"
    || filters.priority !== "all"
    || filters.category !== "all";

  if (!hasActiveFilters) {
    return `${allTickets.length} ${allTickets.length === 1 ? "ticket" : "tickets"}`;
  }

  return `${filteredTickets.length} of ${allTickets.length} tickets`;
}
