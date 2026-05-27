"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { CalendarDays, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToast } from "@/components/ToastProvider";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useUser } from "@/contexts/UserContext";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import type { ClientCalendarItem, ClientPortalOverview } from "@/lib/client-portal";
import {
  createClientCalendarItem,
  deleteClientCalendarItem,
  updateClientCalendarItem,
} from "@/lib/client-portal";
import {
  buildClientCalendarEvents,
  createCalendarDateDraft,
  sortCalendarItemsByStart,
} from "@/lib/client-planning-records";
import {
  CLIENT_CALENDAR_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

const LazyFullCalendar = dynamic(
  () => import("@/components/ui/LazyFullCalendar"),
  { ssr: false },
);

interface ClientCalendarFormState {
  title: string;
  description: string;
  channel: string;
  startAt: string;
  endAt: string;
}

const emptyCalendarForm: ClientCalendarFormState = {
  title: "",
  description: "",
  channel: "general",
  startAt: "",
  endAt: "",
};

const textareaClass = "min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function formatCalendarDay(value?: string | null): string {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function createFormForDate(dateStr?: string): ClientCalendarFormState {
  if (!dateStr) return emptyCalendarForm;
  return {
    ...emptyCalendarForm,
    ...createCalendarDateDraft(dateStr),
  };
}

function toCalendarForm(item: ClientCalendarItem): ClientCalendarFormState {
  return {
    title: item.title || "",
    description: item.description || "",
    channel: item.channel || "general",
    startAt: toDateInputValue(item.startAt),
    endAt: toDateInputValue(item.endAt),
  };
}

function buildCreatePayload(form: ClientCalendarFormState) {
  const description = form.description.trim();
  const channel = form.channel.trim();
  return {
    title: form.title.trim(),
    ...(description ? { description } : {}),
    ...(channel ? { channel } : {}),
    status: "planned",
    startAt: form.startAt,
    ...(form.endAt ? { endAt: form.endAt } : {}),
    visibleToClient: true,
  };
}

function buildUpdatePayload(form: ClientCalendarFormState): Partial<ClientCalendarItem> {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    channel: form.channel.trim() || null,
    status: "planned",
    startAt: form.startAt,
    endAt: form.endAt || null,
    visibleToClient: true,
  };
}

function isClientOwnedCalendarItem(item: ClientCalendarItem, userId?: string): boolean {
  return Boolean(userId && item.createdById && item.createdById === userId);
}

function ClientCalendarFormModal({
  isOpen,
  mode,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  form: ClientCalendarFormState;
  saving: boolean;
  onClose: () => void;
  onChange: (form: ClientCalendarFormState) => void;
  onSubmit: () => void;
}) {
  const canSave = Boolean(form.title.trim() && form.startAt);
  const title = mode === "create" ? "Add Calendar Item" : "Edit Calendar Item";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Client-added items are visible in this workspace and to the SAVAGE team."
      size="lg"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSubmit();
        }}
      >
        <FormField
          id="client-calendar-title"
          label="Title"
          value={form.title}
          onChange={(titleValue) => onChange({ ...form, title: titleValue })}
          placeholder="Content idea, meeting, launch note"
          required
        />
        <div>
          <label htmlFor="client-calendar-description" className="mb-2 block text-sm font-medium">
            Details
          </label>
          <textarea
            id="client-calendar-description"
            className={textareaClass}
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
            placeholder="Add context, links, or what the team should know."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            id="client-calendar-channel"
            label="Channel"
            value={form.channel}
            onChange={(channel) => onChange({ ...form, channel })}
            placeholder="Website, social, ads, review"
          />
          <FormField
            id="client-calendar-start"
            label="Date"
            type="date"
            value={form.startAt}
            onChange={(startAt) => onChange({ ...form, startAt })}
            required
          />
          <FormField
            id="client-calendar-end"
            label="End date"
            type="date"
            value={form.endAt}
            onChange={(endAt) => onChange({ ...form, endAt })}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" icon={<X className="h-4 w-4" />} disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={<Save className="h-4 w-4" />} loading={saving} disabled={!canSave}>
            {mode === "create" ? "Add Item" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientCalendarRecordCard({
  item,
  selected,
  onSelect,
}: {
  item: ClientCalendarItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`w-full rounded-[var(--radius-md)] border p-4 text-left transition-colors ${
        selected
          ? "border-[var(--accent)] bg-[var(--card-surface)]"
          : "border-[var(--border)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
            {item.description || "No details provided."}
          </p>
        </div>
        <StatusBadge label={getClientPortalOptionLabel(CLIENT_CALENDAR_STATUSES, item.status)} size="sm" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>{item.channel || "General"}</span>
        <time dateTime={item.startAt || undefined}>{formatCalendarDay(item.startAt)}</time>
      </div>
    </button>
  );
}

function ClientCalendarDetail({
  item,
  canManage,
  saving,
  onEdit,
  onDelete,
}: {
  item: ClientCalendarItem | null;
  canManage: boolean;
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!item) {
    return (
      <EmptyState
        variant="compact"
        icon={CalendarDays}
        title="Select a calendar item"
        description="Scheduled work details will appear here."
      />
    );
  }

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-[var(--muted)]">{item.channel || "General"}</div>
          <h3 className="mt-2 text-base font-semibold leading-snug">{item.title}</h3>
        </div>
        <StatusBadge label={getClientPortalOptionLabel(CLIENT_CALENDAR_STATUSES, item.status)} size="sm" />
      </div>
      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} disabled={saving} onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} loading={saving} onClick={onDelete}>
            Delete
          </Button>
        </div>
      ) : null}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-[var(--muted)]">Date</dt>
          <dd className="mt-1">{formatCalendarDay(item.startAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-[var(--muted)]">End</dt>
          <dd className="mt-1">{item.endAt ? formatCalendarDay(item.endAt) : "Same day"}</dd>
        </div>
      </dl>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
        {item.description || "No additional details have been published for this item."}
      </p>
    </article>
  );
}

function ClientCalendarContent({
  overview,
  organizationId,
  refreshOverview,
}: {
  overview: ClientPortalOverview;
  organizationId: string;
  refreshOverview: () => Promise<void>;
}) {
  const toast = useToast();
  const { user } = useUser();
  const [selectedId, setSelectedId] = useState("");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<ClientCalendarItem | null>(null);
  const [form, setForm] = useState<ClientCalendarFormState>(emptyCalendarForm);
  const [saving, setSaving] = useState(false);
  const currentUserId = user?.id != null ? String(user.id) : undefined;
  const items = useMemo(() => overview.calendarItems || [], [overview.calendarItems]);
  const sortedItems = useMemo(() => sortCalendarItemsByStart(items), [items]);
  const calendarEvents = useMemo(() => buildClientCalendarEvents(sortedItems), [sortedItems]);
  const selectedItem = useMemo(
    () => sortedItems.find((item) => item.id === selectedId) || sortedItems[0] || null,
    [selectedId, sortedItems],
  );
  const canManageSelectedItem = selectedItem ? isClientOwnedCalendarItem(selectedItem, currentUserId) : false;

  function closeModal() {
    setModalMode(null);
    setEditingItem(null);
    setForm(emptyCalendarForm);
  }

  function openCreate(dateStr?: string) {
    setEditingItem(null);
    setForm(createFormForDate(dateStr));
    setModalMode("create");
  }

  function openEdit(item: ClientCalendarItem) {
    if (!isClientOwnedCalendarItem(item, currentUserId)) return;
    setSelectedId(item.id);
    setEditingItem(item);
    setForm(toCalendarForm(item));
    setModalMode("edit");
  }

  async function submitForm() {
    if (!form.title.trim() || !form.startAt) {
      toast.error("Calendar title and date are required");
      return;
    }
    if (form.endAt && form.endAt < form.startAt) {
      toast.error("End date must be after the start date");
      return;
    }

    setSaving(true);
    try {
      const savedItem = modalMode === "edit" && editingItem
        ? await updateClientCalendarItem(editingItem.id, buildUpdatePayload(form))
        : await createClientCalendarItem(organizationId, buildCreatePayload(form));
      setSelectedId(savedItem.id);
      await refreshOverview();
      closeModal();
      toast.success(modalMode === "edit" ? "Calendar item updated" : "Calendar item added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save calendar item");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCalendarItem(item: ClientCalendarItem) {
    if (!isClientOwnedCalendarItem(item, currentUserId)) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete "${item.title}" from your calendar?`)) {
      return;
    }

    setSaving(true);
    try {
      await deleteClientCalendarItem(item.id);
      setSelectedId("");
      await refreshOverview();
      toast.success("Calendar item deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete calendar item");
    } finally {
      setSaving(false);
    }
  }

  function handleEventClick(info: EventClickArg) {
    setSelectedId(info.event.id);
  }

  function handleDateClick(info: DateClickArg) {
    openCreate(info.dateStr);
  }

  return (
    <ClientPortalPanel
      title="Campaign Calendar"
      icon={CalendarDays}
      count={items.length}
      action={(
        <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} disabled={saving} onClick={() => openCreate()}>
          Add Item
        </Button>
      )}
    >
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
          <LazyFullCalendar
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek,dayGridDay",
            }}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={(arg) => (
              <div className="flex min-w-0 items-center gap-1 px-1 py-0.5 text-[10px] font-semibold leading-tight text-[var(--foreground)]">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arg.event.backgroundColor || "var(--accent)" }}
                  aria-hidden="true"
                />
                <span className="truncate">{arg.event.title}</span>
              </div>
            )}
            dayMaxEvents={3}
            height={650}
          />
        </div>

        <aside className="space-y-4" aria-label="Published calendar items">
          <ClientCalendarDetail
            item={selectedItem}
            canManage={canManageSelectedItem}
            saving={saving}
            onEdit={() => selectedItem && openEdit(selectedItem)}
            onDelete={() => selectedItem && void deleteCalendarItem(selectedItem)}
          />
          {sortedItems.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={CalendarDays}
              title="No scheduled campaign items"
              description="Campaign and content schedule records will appear here."
            />
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <ClientCalendarRecordCard
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
      <ClientCalendarFormModal
        isOpen={modalMode !== null}
        mode={modalMode || "create"}
        form={form}
        saving={saving}
        onClose={closeModal}
        onChange={setForm}
        onSubmit={submitForm}
      />
    </ClientPortalPanel>
  );
}

export default function ClientCalendarPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Calendar"
      subtitle="Campaign and content schedule."
    >
      {({ overview, selectedId, refreshOverview }) => {
        if (!overview) return null;
        return <ClientCalendarContent overview={overview} organizationId={selectedId} refreshOverview={refreshOverview} />;
      }}
    </ClientPortalWorkspaceFrame>
  );
}
