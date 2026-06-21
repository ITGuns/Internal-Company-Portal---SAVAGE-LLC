"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { Archive, CalendarDays, Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ClientCalendarItem, ClientProject } from "@/lib/client-portal";
import {
  createClientCalendarItem,
  deleteClientCalendarItem,
  updateClientCalendarItem,
} from "@/lib/client-portal";
import {
  buildClientCalendarEvents,
  createCalendarDateDraft,
  getProjectProgressForCalendarItem,
  sortCalendarItemsByStart,
} from "@/lib/client-planning-records";
import {
  buildCalendarUpdatePayload,
  toDateInputValue,
  type CalendarEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_CALENDAR_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  MiniPanel,
  selectClass,
  TextareaField,
  VisibilityCheckbox,
} from "./shared";

const LazyFullCalendar = dynamic(
  () => import("@/components/ui/LazyFullCalendar"),
  { ssr: false },
);

const emptyCalendar: CalendarEditForm = {
  title: "",
  description: "",
  channel: "general",
  status: "planned",
  startAt: "",
  endAt: "",
  projectId: "",
  visibleToClient: true,
};

function toCalendarForm(item: ClientCalendarItem): CalendarEditForm {
  return {
    title: item.title || "",
    description: item.description || "",
    channel: item.channel || "general",
    status: item.status || "planned",
    startAt: toDateInputValue(item.startAt),
    endAt: toDateInputValue(item.endAt),
    projectId: item.projectId || "",
    visibleToClient: item.visibleToClient !== false,
  };
}

function createCalendarFormForDate(dateStr?: string): CalendarEditForm {
  if (!dateStr) return emptyCalendar;
  return {
    ...emptyCalendar,
    ...createCalendarDateDraft(dateStr),
  };
}

function formatCalendarDate(value?: string | null): string {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
  });
}

function CalendarFormModal({
  isOpen,
  mode,
  form,
  saving,
  projects,
  onClose,
  onChange,
  onSubmit,
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  form: CalendarEditForm;
  saving: boolean;
  projects: ClientProject[];
  onClose: () => void;
  onChange: (form: CalendarEditForm) => void;
  onSubmit: () => void;
}) {
  const title = mode === "create" ? "Add Calendar Item" : "Edit Calendar Item";
  const canSave = Boolean(form.title.trim() && form.startAt);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle="Calendar items appear on the planning calendar and can be shown to clients." size="lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSubmit();
        }}
      >
        <FormField id="calendar-modal-title" label="Title" value={form.title} onChange={(titleValue) => onChange({ ...form, title: titleValue })} required />
        <TextareaField value={form.description || ""} onChange={(description) => onChange({ ...form, description })} placeholder="Campaign, content, or delivery note" ariaLabel="Calendar details" />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="calendar-modal-channel" label="Channel" value={form.channel || ""} onChange={(channel) => onChange({ ...form, channel })} />
          <div>
            <label htmlFor="calendar-modal-project" className="mb-2 block text-sm font-medium">Linked project</label>
            <select id="calendar-modal-project" className={selectClass} value={form.projectId || ""} onChange={(event) => onChange({ ...form, projectId: event.target.value })}>
              <option value="">No linked project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="calendar-modal-status" className="mb-2 block text-sm font-medium">Status</label>
            <select id="calendar-modal-status" className={selectClass} value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value })}>
              {CLIENT_CALENDAR_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <FormField id="calendar-modal-start" label="Date" type="date" value={form.startAt || ""} onChange={(startAt) => onChange({ ...form, startAt })} required />
          <FormField id="calendar-modal-end" label="End date" type="date" value={form.endAt || ""} onChange={(endAt) => onChange({ ...form, endAt })} />
        </div>

        <VisibilityCheckbox checked={form.visibleToClient} onChange={(visibleToClient) => onChange({ ...form, visibleToClient })} />

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving} disabled={!canSave}>{mode === "create" ? "Add Item" : "Save Changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CalendarRecordCard({
  item,
  project,
  saving,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  item: ClientCalendarItem;
  project: ClientProject | null;
  saving: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const isArchived = item.status === "archived";
  const projectProgress = project ? Math.min(100, Math.max(0, Math.round(project.progress))) : 0;

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold leading-5">{item.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge label={getClientPortalOptionLabel(CLIENT_CALENDAR_STATUSES, item.status)} size="sm" />
            <span className="text-xs text-[var(--muted)]">{formatCalendarDate(item.startAt)}</span>
          </div>
        </div>
        {item.visibleToClient === false ? (
          <EyeOff className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-label="Hidden from client" />
        ) : (
          <Eye className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-label="Visible to client" />
        )}
      </div>

      {item.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.channel ? <span className="rounded-full bg-[var(--card-surface)] px-2 py-1 text-xs capitalize text-[var(--muted)]">{item.channel}</span> : null}
        {item.endAt ? <span className="text-xs text-[var(--muted)]">Ends {formatCalendarDate(item.endAt)}</span> : null}
      </div>

      {project ? (
        <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--card-surface)] p-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-medium">{project.name}</span>
            <span className="shrink-0 text-[var(--muted)]">{projectProgress}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-hover)]">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${projectProgress}%` }} aria-hidden="true" />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} disabled={saving} onClick={onEdit}>
          Edit
        </Button>
        {isArchived ? (
          <Button type="button" size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} disabled={saving} onClick={onRestore}>
            Restore
          </Button>
        ) : (
          <Button type="button" size="sm" variant="ghost" icon={<Archive className="h-4 w-4" />} disabled={saving} onClick={onArchive}>
            Archive
          </Button>
        )}
        <Button type="button" size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} disabled={saving} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </article>
  );
}

export default function CalendarPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  recordLimit,
  layout = "compact",
}: ProductionRecordPanelProps) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedItem, setSelectedItem] = useState<ClientCalendarItem | null>(null);
  const [calendarForm, setCalendarForm] = useState<CalendarEditForm>(emptyCalendar);
  const allCalendarItems = overview.calendarItems || [];
  const projects = useMemo(() => overview.projects || [], [overview.projects]);
  const calendarItems = typeof recordLimit === "number" ? allCalendarItems.slice(0, recordLimit) : allCalendarItems;
  const sortedItems = useMemo(() => sortCalendarItemsByStart(calendarItems), [calendarItems]);
  const calendarEvents = useMemo(() => buildClientCalendarEvents(sortedItems, projects), [projects, sortedItems]);

  useEffect(() => {
    if (!selectedItem || modalMode !== "edit") return;
    setCalendarForm(toCalendarForm(selectedItem));
  }, [modalMode, selectedItem]);

  function openCreate(dateStr?: string) {
    setSelectedItem(null);
    setCalendarForm(createCalendarFormForDate(dateStr));
    setModalMode("create");
  }

  function openEdit(item: ClientCalendarItem) {
    setSelectedItem(item);
    setCalendarForm(toCalendarForm(item));
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedItem(null);
    setCalendarForm(emptyCalendar);
  }

  function saveCalendarItem() {
    const payload = {
      ...buildCalendarUpdatePayload(calendarForm),
      startAt: calendarForm.startAt,
    };

    if (modalMode === "create") {
      void submitScoped(
        () => createClientCalendarItem(organizationId, payload),
        "Calendar item added",
        closeModal,
      );
      return;
    }

    if (!selectedItem) return;
    void submitScoped(
      () => updateClientCalendarItem(selectedItem.id, payload),
      "Calendar details saved",
      closeModal,
    );
  }

  function handleDateClick(info: DateClickArg) {
    openCreate(info.dateStr);
  }

  function handleEventClick(info: EventClickArg) {
    const item = sortedItems.find((calendarItem) => calendarItem.id === info.event.id);
    if (item) openEdit(item);
  }

  function deleteCalendarItem(item: ClientCalendarItem) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Permanently delete "${item.title}" from the calendar? This cannot be restored from history.`);
      if (!confirmed) return;
    }

    void submitScoped(
      () => deleteClientCalendarItem(item.id),
      "Calendar item deleted",
      () => undefined,
    );
  }

  const listContent = sortedItems.length === 0 ? (
    <EmptyState variant="compact" icon={CalendarDays} title="No calendar items yet" description="Click a calendar day or add an item to start scheduling work." />
  ) : (
    <div className="space-y-3">
      {sortedItems.map((item) => (
        <CalendarRecordCard
          key={item.id}
          item={item}
          project={getProjectProgressForCalendarItem(item, projects)}
          saving={saving}
          onEdit={() => openEdit(item)}
          onArchive={() => submitScoped(() => updateClientCalendarItem(item.id, { status: "archived" }), "Calendar item archived", () => undefined)}
          onRestore={() => submitScoped(() => updateClientCalendarItem(item.id, { status: "planned" }), "Calendar item restored", () => undefined)}
          onDelete={() => deleteCalendarItem(item)}
        />
      ))}
    </div>
  );

  const modal = (
    <CalendarFormModal
      isOpen={modalMode !== null}
      mode={modalMode || "create"}
      form={calendarForm}
      saving={saving}
      onClose={closeModal}
      onChange={setCalendarForm}
      projects={projects}
      onSubmit={saveCalendarItem}
    />
  );

  if (layout === "full") {
    return (
      <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold">Planning Calendar</h2>
              <p className="text-sm text-[var(--muted)]">Click a date to schedule work, or select an event to edit it.</p>
            </div>
          </div>
          <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} disabled={saving} onClick={() => openCreate()}>
            Add Calendar Item
          </Button>
        </div>

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

          <aside className="space-y-3" aria-label="Calendar item list">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Scheduled Work</h3>
              <span className="rounded-full bg-[var(--card-surface)] px-2 py-0.5 text-xs text-[var(--muted)]">{sortedItems.length}</span>
            </div>
            {listContent}
          </aside>
        </div>
        {modal}
      </section>
    );
  }

  return (
    <MiniPanel title="Calendar" icon={CalendarDays} count={allCalendarItems.length}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">Use the dedicated Calendar page for the month view. Quick edits open in a modal here.</div>
        <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} disabled={saving} onClick={() => openCreate()}>
          Add Item
        </Button>
      </div>
      {listContent}
      {modal}
    </MiniPanel>
  );
}
