"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Plus, Ticket } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import {
  ClientOrganization,
  ClientTicket,
  createClientTicket,
  fetchClientOrganizations,
  fetchClientTickets,
} from "@/lib/client-portal";

const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export default function ClientTicketsPage() {
  const toast = useToast();
  const [organizations, setOrganizations] = useState<ClientOrganization[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tickets, setTickets] = useState<ClientTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general", priority: "normal" });

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

  async function handleCreateTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !form.title.trim()) {
      toast.error("Ticket title is required");
      return;
    }

    setSaving(true);
    try {
      await createClientTicket(selectedId, form);
      setForm({ title: "", description: "", category: "general", priority: "normal" });
      await loadTickets(selectedId);
      toast.success("Ticket submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title="Client Tickets" subtitle="Submit requests and review ticket status." />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/client" className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            <ArrowLeft className="h-4 w-4" />
            Back to portal
          </Link>
          {organizations.length > 1 ? (
            <select className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="Client organization">
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-[var(--muted)]">Loading tickets...</div>
        ) : organizations.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Ticket} title="No client workspace assigned" description="Your account is not connected to a client organization yet." />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 xl:grid-cols-[380px_1fr]">
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold">New Ticket</h2>
              </div>
              <form onSubmit={handleCreateTicket} className="space-y-3">
                <FormField id="ticket-title" label="Title" value={form.title} onChange={(title) => setForm((current) => ({ ...current, title }))} required />
                <textarea className={textareaClass} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe what needs attention." aria-label="Ticket description" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <FormField id="ticket-category" label="Category" value={form.category} onChange={(category) => setForm((current) => ({ ...current, category }))} />
                  <FormField id="ticket-priority" label="Priority" value={form.priority} onChange={(priority) => setForm((current) => ({ ...current, priority }))} />
                </div>
                <Button type="submit" loading={saving} fullWidth>Submit Ticket</Button>
              </form>
            </section>

            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-[var(--accent)]" />
                  <h2 className="text-sm font-semibold">Tickets</h2>
                </div>
                <span className="text-xs text-[var(--muted)]">{tickets.length}</span>
              </div>
              <div className="p-4">
                {tickets.length === 0 ? (
                  <EmptyState variant="compact" icon={Ticket} title="No tickets yet" description="Submitted requests will appear here." />
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <article key={ticket.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-medium">{ticket.title}</h3>
                            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{ticket.description || "No description provided."}</p>
                          </div>
                          <StatusBadge label={ticket.status} size="sm" />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                          <span>{ticket.category}</span>
                          <span>{ticket.priority}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{ticket.comments?.length || 0}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
