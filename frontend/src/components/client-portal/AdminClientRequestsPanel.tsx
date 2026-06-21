"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Ticket } from "lucide-react";
import AdminTicketList from "@/components/client-portal/AdminTicketList";
import AdminTicketPanel from "@/components/client-portal/AdminTicketPanel";
import ClientTicketFilterControls from "@/components/client-portal/ClientTicketFilterControls";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ToastProvider";
import {
  ClientProject,
  ClientTicket,
  createClientTicketComment,
  updateClientTicket,
  updateClientTicketStatus,
} from "@/lib/client-portal";
import {
  DEFAULT_CLIENT_TICKET_FILTERS,
  filterClientTickets,
  getClientTicketFilterSummary,
} from "@/lib/client-ticket-filters";
import type { User } from "@/lib/users";
import ClientOperationsPanel from "./ClientOperationsPanel";

interface AdminClientRequestsPanelProps {
  organizationId: string;
  tickets: ClientTicket[];
  users?: User[];
  projects?: ClientProject[];
  currentUserId?: string | number | null;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  refreshClient: (organizationId?: string) => Promise<void>;
}

export default function AdminClientRequestsPanel({
  organizationId,
  tickets,
  users = [],
  projects = [],
  currentUserId,
  saving,
  setSaving,
  refreshClient,
}: AdminClientRequestsPanelProps) {
  const toast = useToast();
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [ticketReplyForm, setTicketReplyForm] = useState({ body: "", visibility: "client" });
  const [ticketFilters, setTicketFilters] = useState(DEFAULT_CLIENT_TICKET_FILTERS);

  const filteredTickets = useMemo(
    () => filterClientTickets(tickets, ticketFilters),
    [tickets, ticketFilters],
  );
  const ticketFilterSummary = useMemo(
    () => getClientTicketFilterSummary(filteredTickets, tickets, ticketFilters),
    [filteredTickets, tickets, ticketFilters],
  );
  const selectedTicket = useMemo(
    () => filteredTickets.find((ticket) => ticket.id === selectedTicketId) || filteredTickets[0] || null,
    [filteredTickets, selectedTicketId],
  );

  useEffect(() => {
    setSelectedTicketId((current) => {
      if (filteredTickets.length === 0) return "";
      return filteredTickets.some((ticket) => ticket.id === current) ? current : filteredTickets[0].id;
    });
  }, [filteredTickets]);

  async function handleUpdateTicketStatus(ticket: ClientTicket, status: string) {
    if (ticket.status === status) return;

    setSaving(true);
    try {
      await updateClientTicketStatus(ticket.id, status);
      await refreshClient(organizationId);
      toast.success("Ticket status updated and reflected in updates");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update ticket status");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTicket(
    ticket: ClientTicket,
    data: Pick<ClientTicket, "projectId" | "assignedToId" | "internalNotes">,
  ) {
    setSaving(true);
    try {
      await updateClientTicket(ticket.id, data);
      await refreshClient(organizationId);
      toast.success("Ticket triage saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update ticket triage");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTicketReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicket || !ticketReplyForm.body.trim()) {
      toast.error("Reply is required");
      return;
    }

    setSaving(true);
    try {
      await createClientTicketComment(selectedTicket.id, {
        body: ticketReplyForm.body.trim(),
        visibility: ticketReplyForm.visibility,
      });
      setTicketReplyForm({ body: "", visibility: "client" });
      await refreshClient(organizationId);
      toast.success(ticketReplyForm.visibility === "internal" ? "Internal note saved" : "Client reply sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add ticket reply");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClientOperationsPanel icon={Ticket} title="Requests" count={tickets.length}>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-3">
          <ClientTicketFilterControls
            filters={ticketFilters}
            resultSummary={ticketFilterSummary}
            onChange={setTicketFilters}
          />
          {tickets.length === 0 ? (
            <EmptyState variant="compact" icon={Ticket} title="No requests yet" />
          ) : (
            <AdminTicketList
              tickets={filteredTickets}
              users={users}
              projects={projects}
              selectedTicketId={selectedTicket?.id}
              saving={saving}
              onSelectTicket={setSelectedTicketId}
              onUpdateStatus={(ticket, status) => void handleUpdateTicketStatus(ticket, status)}
            />
          )}
        </div>
        <AdminTicketPanel
          ticket={selectedTicket}
          users={users}
          projects={projects}
          currentUserId={currentUserId}
          replyForm={ticketReplyForm}
          saving={saving}
          onReplyFormChange={setTicketReplyForm}
          onUpdateTicket={(ticket, data) => void handleUpdateTicket(ticket, data)}
          onSubmitReply={handleAddTicketReply}
        />
      </div>
    </ClientOperationsPanel>
  );
}
