"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Lock, Paperclip, Phone, Wrench } from "lucide-react";
import {
  assignGemfieldTicket,
  classifyGemfieldTicket,
  fetchGemfieldPipeline,
  fetchGemfieldTicketDetail,
  moveGemfieldTicket,
  openGemfieldAttachment,
  replyToTicket,
  type GemfieldPipelineItem,
  type GemfieldTicketDetail,
  type SlaState,
} from "@/lib/gemfield-admin";
import { fetchUsers, type User } from "@/lib/users";

const STATUS_ORDER = ["new", "triaged", "in_progress", "waiting_on_client", "resolved", "closed"] as const;
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  in_progress: "In Progress",
  waiting_on_client: "Waiting on Client",
  resolved: "Resolved",
  closed: "Closed",
};

function slaChipClass(state: SlaState): string {
  switch (state) {
    case "breached":
      return "bg-red-500/10 text-red-600";
    case "due_soon":
      return "bg-amber-500/10 text-amber-600";
    case "met":
      return "bg-emerald-500/10 text-emerald-600";
    default:
      return "bg-[var(--card-surface)] text-[var(--muted)]";
  }
}

function TicketCard({
  ticket,
  onOpen,
  onMove,
}: {
  ticket: GemfieldPipelineItem;
  onOpen: () => void;
  onMove: (status: string) => void;
}) {
  const index = STATUS_ORDER.indexOf(ticket.status as (typeof STATUS_ORDER)[number]);
  const prev = index > 0 ? STATUS_ORDER[index - 1] : null;
  const next = index >= 0 && index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null;

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold leading-snug">{ticket.title}</h4>
          {ticket.priority === "high" ? (
            <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600">High</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {ticket.organization.name}
          {ticket.gfId ? ` · ${ticket.gfId}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ticket.ticketKind === "dev_assist" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
              <Wrench className="h-3 w-3" aria-hidden /> Dev assist
            </span>
          ) : null}
          {ticket.ticketKind === "callback" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--card-surface)] px-2 py-0.5 text-xs font-medium">
              <Phone className="h-3 w-3" aria-hidden /> Callback
            </span>
          ) : null}
          {ticket.changeClass ? (
            <span className="rounded-full bg-[var(--card-surface)] px-2 py-0.5 text-xs font-medium">
              {ticket.changeClass === "quoted" ? "Quoted" : "In scope"}
            </span>
          ) : null}
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${slaChipClass(ticket.sla.firstResponse)}`}>
            FR: {ticket.sla.firstResponse.replace("_", " ")}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${slaChipClass(ticket.sla.resolution)}`}>
            Res: {ticket.sla.resolution.replace("_", " ")}
          </span>
        </div>
      </button>
      <div className="mt-2 flex items-center justify-between">
        <button
          disabled={!prev}
          onClick={() => prev && onMove(prev)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back
        </button>
        <button
          disabled={!next}
          onClick={() => next && onMove(next)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent)] disabled:opacity-40"
        >
          Advance <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </article>
  );
}

function TicketDetail({ ticket, onClose, onChanged }: { ticket: GemfieldPipelineItem; onClose: () => void; onChanged: () => void }) {
  const [reply, setReply] = useState("");
  // Default to INTERNAL - leaking an internal note to a client is the worst bug in this feature.
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<GemfieldTicketDetail | null>(null);

  const [staff, setStaff] = useState<User[]>([]);

  useEffect(() => {
    let active = true;
    fetchGemfieldTicketDetail(ticket.id)
      .then((data) => { if (active) setDetail(data); })
      .catch(() => { if (active) setDetail(null); });
    return () => { active = false; };
  }, [ticket.id]);

  useEffect(() => {
    fetchUsers()
      .then((users) => setStaff(users.filter((user) => (user.status ?? "active") === "active")))
      .catch(() => setStaff([]));
  }, []);

  async function assign(userId: string | null) {
    setBusy(true);
    try {
      await assignGemfieldTicket(ticket.id, userId);
      onChanged();
      fetchGemfieldTicketDetail(ticket.id).then(setDetail).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await replyToTicket(ticket.id, reply.trim(), visibility);
      setReply("");
      onChanged();
      fetchGemfieldTicketDetail(ticket.id).then(setDetail).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function classify(changeClass: string) {
    setBusy(true);
    try {
      await classifyGemfieldTicket(ticket.id, changeClass);
      onChanged();
      fetchGemfieldTicketDetail(ticket.id).then(setDetail).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  const isClientReply = visibility === "client";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-[var(--card-bg)] p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">{ticket.title}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {ticket.organization.name}
              {ticket.gfId ? ` · ${ticket.gfId}` : ""} · {STATUS_LABEL[ticket.status] ?? ticket.status}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm hover:bg-[var(--card-surface)]">Close</button>
        </div>

        {detail?.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">{detail.description}</p>
        ) : null}

        {detail?.wizardAnswers && Object.keys(detail.wizardAnswers).length ? (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Request details</p>
            <dl className="space-y-1 text-sm">
              {Object.entries(detail.wizardAnswers).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">{key}</dt>
                  <dd className="text-right font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {detail?.attachments.length ? (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Attachments</p>
            <ul className="space-y-1">
              {detail.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <button
                    onClick={() => openGemfieldAttachment(attachment.uploadId)}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" aria-hidden /> {attachment.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Assigned to</p>
          <select
            value={detail?.assignee?.id ?? ""}
            onChange={(event) => assign(event.target.value || null)}
            disabled={busy}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">Unassigned</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name ?? member.email}</option>
            ))}
          </select>
        </div>

        {ticket.category === "website_change" ? (
          <div className="mt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Change classification</p>
            <div className="flex gap-2">
              <button onClick={() => classify("in_scope")} className={`rounded-md border px-3 py-1.5 text-sm ${ticket.changeClass === "in_scope" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}>In scope</button>
              <button onClick={() => classify("quoted")} className={`rounded-md border px-3 py-1.5 text-sm ${ticket.changeClass === "quoted" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}>Quoted work</button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex-1">
          {detail && detail.comments.length ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Thread</p>
              {detail.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-md border p-2 text-sm ${
                    comment.visibility === "internal" ? "border-amber-500/40 bg-amber-500/5" : "border-[var(--border)]"
                  }`}
                >
                  <div className="mb-0.5 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{comment.author?.name ?? comment.author?.email ?? "Someone"}</span>
                    <span className={comment.visibility === "internal" ? "font-semibold text-amber-600" : ""}>
                      {comment.visibility === "internal" ? "Internal" : "Client-visible"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mb-2 flex items-center gap-2">
            <button
              onClick={() => setVisibility((value) => (value === "internal" ? "client" : "internal"))}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
                isClientReply ? "border-amber-500 bg-amber-500/10 text-amber-700" : "border-[var(--border)]"
              }`}
            >
              {isClientReply ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
              {isClientReply ? "Client-visible reply" : "Internal note"}
            </button>
            {isClientReply ? <span className="text-xs text-amber-600">The client will see this.</span> : null}
          </div>
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={isClientReply ? "Write a reply the client will see…" : "Write an internal note (not shown to the client)…"}
            className="min-h-32 w-full rounded-md border border-[var(--border)] bg-[var(--card-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            disabled={busy || !reply.trim()}
            onClick={send}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {isClientReply ? "Send to client" : "Add internal note"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GemfieldControlPanelPage() {
  const [items, setItems] = useState<GemfieldPipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchGemfieldPipeline());
    } catch {
      setError("Could not load the pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABEL[status],
      tickets: items.filter((ticket) => ticket.status === status),
    }));
  }, [items]);

  const selected = items.find((ticket) => ticket.id === selectedId) ?? null;

  async function move(ticketId: string, status: string) {
    await moveGemfieldTicket(ticketId, status);
    await load();
  }

  return (
    <main className="main-content-height overflow-x-auto p-5">
      <header className="mb-4">
        <h1 className="text-lg font-semibold">Gemfield Developer Control Panel</h1>
        <p className="text-sm text-[var(--muted)]">Every client request lands here for triage and resolution.</p>
      </header>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading pipeline…
        </p>
      ) : (
        <div className="flex gap-4">
          {columns.map((column) => (
            <section key={column.status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{column.label}</h2>
                <span className="rounded-full bg-[var(--card-surface)] px-2 py-0.5 text-xs text-[var(--muted)]">
                  {column.tickets.length}
                </span>
              </div>
              <div className="space-y-2">
                {column.tickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onOpen={() => setSelectedId(ticket.id)}
                    onMove={(status) => move(ticket.id, status)}
                  />
                ))}
                {column.tickets.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--muted)]">
                    Empty
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected ? (
        <TicketDetail ticket={selected} onClose={() => setSelectedId(null)} onChanged={load} />
      ) : null}
    </main>
  );
}
