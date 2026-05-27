"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, Send, Ticket } from "lucide-react";
import Button from "@/components/Button";
import ClientTicketFilterControls from "@/components/client-portal/ClientTicketFilterControls";
import ChoiceGroup from "@/components/client-portal/ChoiceGroup";
import TicketDetailPresets from "@/components/client-portal/TicketDetailPresets";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import {
  ClientOrganization,
  ClientTicket,
  createClientTicket,
  createClientTicketComment,
  fetchClientOrganizations,
  fetchClientTickets,
} from "@/lib/client-portal";
import { getClientTicketNextAction } from "@/lib/client-communication";
import {
  DEFAULT_CLIENT_TICKET_FILTERS,
  filterClientTickets,
  getClientTicketFilterSummary,
} from "@/lib/client-ticket-filters";
import {
  buildClientTicketTitle,
  CLIENT_TICKET_CATEGORIES,
  CLIENT_TICKET_PRIORITIES,
  CLIENT_TICKET_QUICK_REPLIES,
  CLIENT_TICKET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import { formatClientPortalDate, getClientCommentAuthorLabel } from "@/lib/client-portal-display";

const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export default function ClientTicketsPage() {
  const toast = useToast();
  const { user } = useUser();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [form, setForm] = useState({ description: "", category: "website", priority: "normal" });
  const [commentBody, setCommentBody] = useState("");
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
  const selectedNextAction = useMemo(
    () => selectedTicket ? getClientTicketNextAction(selectedTicket, user?.id) : null,
    [selectedTicket, user?.id],
  );

  const loadOrganizations = useCallback(async () => {
    const nextOrganizations = await fetchClientOrganizations();
    setOrganizations(nextOrganizations);
    setSelectedId((current) => current || nextOrganizations[0]?.id || "");
  }, []);

  const loadTickets = useCallback(async (organizationId: string) => {
    setTickets(organizationId ? await fetchClientTickets(organizationId) : []);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        setLoading(true);
        await loadOrganizations();
      } catch (error) {
        console.error(error);
        toast.error("Failed to load ticket center");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadInitial();
    return () => {
      isMounted = false;
    };
  }, [loadOrganizations, toast]);

  useEffect(() => {
    loadTickets(selectedId).catch((error) => {
      console.error(error);
      toast.error("Failed to load tickets");
    });
  }, [loadTickets, selectedId, toast]);

  useEffect(() => {
    setSelectedTicketId((current) => {
      if (filteredTickets.length === 0) return "";
      return filteredTickets.some((ticket) => ticket.id === current) ? current : filteredTickets[0].id;
    });
  }, [filteredTickets]);

  async function handleCreateTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !form.description.trim()) {
      toast.error("Request details are required");
      return;
    }

    setSaving(true);
    try {
      const ticket = await createClientTicket(selectedId, {
        ...form,
        title: buildClientTicketTitle(form.category, form.description),
      });
      setForm({ description: "", category: "website", priority: "normal" });
      setSelectedTicketId(ticket.id);
      await loadTickets(selectedId);
      toast.success("Ticket submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit ticket");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicket || !commentBody.trim()) {
      toast.error("Comment is required");
      return;
    }

    setCommentSaving(true);
    try {
      const updatedTicket = await createClientTicketComment(selectedTicket.id, { body: commentBody.trim() });
      setTickets((current) => (
        current.some((ticket) => ticket.id === updatedTicket.id)
          ? current.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket))
          : [updatedTicket, ...current]
      ));
      setSelectedTicketId(updatedTicket.id);
      setCommentBody("");
      toast.success("Comment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    } finally {
      setCommentSaving(false);
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Client Tickets" subtitle="Submit requests and review ticket status." />

        {organizations.length > 1 ? (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <select className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="Client organization">
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 text-sm text-[var(--muted)]">Loading tickets...</div>
        ) : organizations.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Ticket} title="No client workspace assigned" description="Your account is not connected to a client organization yet." />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold">New Ticket</h2>
              </div>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <ChoiceGroup
                  label="Request Type"
                  options={CLIENT_TICKET_CATEGORIES}
                  value={form.category}
                  onChange={(category) => setForm((current) => ({ ...current, category }))}
                  variant="pills"
                />
                <ChoiceGroup
                  label="Priority"
                  options={CLIENT_TICKET_PRIORITIES}
                  value={form.priority}
                  onChange={(priority) => setForm((current) => ({ ...current, priority }))}
                  variant="pills"
                />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="ticket-details" className="text-sm font-medium">Request Details</label>
                    <span className="text-xs text-[var(--muted)]">Pick a starter or type your own</span>
                  </div>
                  <TicketDetailPresets
                    category={form.category}
                    onSelect={(description) => setForm((current) => ({ ...current, description }))}
                  />
                  <textarea
                    id="ticket-details"
                    className={textareaClass}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder={`${getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, form.category)} details`}
                    required
                  />
                </div>
                <Button type="submit" loading={saving} fullWidth>Send Request</Button>
              </form>
            </section>

            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold">Tickets</h2>
                  </div>
                  <span className="text-xs text-[var(--muted)]">{ticketFilterSummary}</span>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <ClientTicketFilterControls
                      filters={ticketFilters}
                      resultSummary={ticketFilterSummary}
                      onChange={setTicketFilters}
                    />
                    {tickets.length === 0 ? (
                      <EmptyState variant="compact" icon={Ticket} title="No tickets yet" description="Submitted requests will appear here." />
                    ) : filteredTickets.length === 0 ? (
                      <EmptyState variant="compact" icon={Ticket} title="No matching tickets" description="Adjust the filters to see more requests." />
                    ) : (
                      filteredTickets.map((ticket) => {
                        const isSelected = selectedTicket?.id === ticket.id;
                        const nextAction = getClientTicketNextAction(ticket, user?.id);

                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => setSelectedTicketId(ticket.id)}
                            aria-pressed={isSelected}
                            className={`w-full rounded-[var(--radius-md)] border p-4 text-left transition-colors ${isSelected ? "border-[var(--accent)] bg-[var(--card-surface)]" : "border-[var(--border)] hover:bg-[var(--surface-hover)]"}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate font-medium">{ticket.title}</h3>
                                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{ticket.description || "No description provided."}</p>
                                <p className="mt-2 text-xs font-medium text-[var(--foreground)]">{nextAction.label}</p>
                              </div>
                              <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, ticket.status)} size="sm" />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                              <span>{getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, ticket.category)}</span>
                              <span>{getClientPortalOptionLabel(CLIENT_TICKET_PRIORITIES, ticket.priority)}</span>
                              <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{ticket.comments?.length || 0}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold">Ticket Detail</h2>
                  </div>
                  {selectedTicket ? <StatusBadge label={getClientPortalOptionLabel(CLIENT_TICKET_STATUSES, selectedTicket.status)} size="sm" /> : null}
                </div>
                <div className="space-y-5 p-4">
                  {!selectedTicket ? (
                    <EmptyState variant="compact" icon={Ticket} title="Select a ticket" description="Ticket notes and replies will appear here." />
                  ) : (
                    <>
                      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-medium uppercase text-[var(--muted)]">Next action</div>
                            <div className="mt-1 text-sm font-semibold">{selectedNextAction?.label}</div>
                          </div>
                          <StatusBadge label={selectedNextAction?.status === "client" ? "Client" : selectedNextAction?.status === "complete" ? "Done" : "Team"} size="sm" />
                        </div>
                        <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{selectedNextAction?.description}</p>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                          <span>{getClientPortalOptionLabel(CLIENT_TICKET_CATEGORIES, selectedTicket.category)}</span>
                          <span>{getClientPortalOptionLabel(CLIENT_TICKET_PRIORITIES, selectedTicket.priority)}</span>
                          <span>{selectedTicket.comments?.length || 0} comments</span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold leading-snug">{selectedTicket.title}</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                          {selectedTicket.description || "No description provided."}
                        </p>
                      </div>

                      <div>
                        <div className="mb-3 text-sm font-semibold">Conversation</div>
                        {selectedTicket.comments?.length ? (
                          <div className="space-y-3">
                            {selectedTicket.comments.map((comment) => (
                              <article key={comment.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                                  <span>{getClientCommentAuthorLabel(comment, user?.id)}</span>
                                  <time dateTime={comment.createdAt || undefined}>{formatClientPortalDate(comment.createdAt)}</time>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <EmptyState variant="compact" icon={MessageSquare} title="No comments yet" description="Use the reply box to add the next update." />
                        )}
                      </div>

                      <form onSubmit={handleAddComment} className="space-y-3">
                        <label htmlFor="ticket-comment" className="text-sm font-medium">Add Comment</label>
                        <div className="flex flex-wrap gap-2">
                          {CLIENT_TICKET_QUICK_REPLIES.map((reply) => (
                            <button
                              key={reply}
                              type="button"
                              onClick={() => setCommentBody(reply)}
                              className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                        <textarea
                          id="ticket-comment"
                          className={textareaClass}
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                          placeholder="Add an update or clarification."
                        />
                        <Button
                          type="submit"
                          icon={<Send className="h-4 w-4" />}
                          loading={commentSaving}
                          disabled={!commentBody.trim()}
                        >
                          Add Comment
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
