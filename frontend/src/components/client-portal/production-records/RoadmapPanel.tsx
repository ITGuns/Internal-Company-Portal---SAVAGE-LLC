"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Eye, EyeOff, Map, Pencil, Plus, RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import FormField from "@/components/forms/FormField";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ClientRoadmapRecommendation } from "@/lib/client-portal";
import {
  createClientRoadmapRecommendation,
  updateClientRoadmapRecommendation,
} from "@/lib/client-portal";
import { splitRoadmapItemsByStatus } from "@/lib/client-planning-records";
import {
  buildRoadmapUpdatePayload,
  type RoadmapEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_ROADMAP_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  MiniPanel,
  selectClass,
  TextareaField,
  VisibilityCheckbox,
} from "./shared";

const roadmapPriorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const emptyRoadmap: RoadmapEditForm = {
  title: "",
  body: "",
  priority: "normal",
  status: "recommended",
  impact: "",
  effort: "",
  visibleToClient: true,
};

function toRoadmapForm(roadmap: ClientRoadmapRecommendation): RoadmapEditForm {
  return {
    title: roadmap.title || "",
    body: roadmap.body || "",
    priority: roadmap.priority || "normal",
    status: roadmap.status || "recommended",
    impact: roadmap.impact || "",
    effort: roadmap.effort || "",
    visibleToClient: roadmap.visibleToClient !== false,
  };
}

function RoadmapFormModal({
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
  form: RoadmapEditForm;
  saving: boolean;
  onClose: () => void;
  onChange: (form: RoadmapEditForm) => void;
  onSubmit: () => void;
}) {
  const title = mode === "create" ? "Add Roadmap Item" : "Edit Roadmap Item";
  const canSave = Boolean(form.title.trim() && form.body.trim());

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle="Roadmap details stay editable and can be shown or hidden from the client." size="lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSubmit();
        }}
      >
        <FormField id="roadmap-modal-title" label="Title" value={form.title} onChange={(value) => onChange({ ...form, title: value })} required />
        <TextareaField value={form.body} onChange={(body) => onChange({ ...form, body })} placeholder="Recommended next step" ariaLabel="Roadmap details" required />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="roadmap-modal-priority" className="mb-2 block text-sm font-medium">Priority</label>
            <select id="roadmap-modal-priority" className={selectClass} value={form.priority} onChange={(event) => onChange({ ...form, priority: event.target.value })}>
              {roadmapPriorityOptions.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="roadmap-modal-status" className="mb-2 block text-sm font-medium">Status</label>
            <select id="roadmap-modal-status" className={selectClass} value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value })}>
              {CLIENT_ROADMAP_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <FormField id="roadmap-modal-impact" label="Impact" value={form.impact || ""} onChange={(impact) => onChange({ ...form, impact })} />
          <FormField id="roadmap-modal-effort" label="Effort" value={form.effort || ""} onChange={(effort) => onChange({ ...form, effort })} />
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

function RoadmapCard({
  roadmap,
  saving,
  onEdit,
  onArchive,
  onRestore,
}: {
  roadmap: ClientRoadmapRecommendation;
  saving: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const isArchived = roadmap.status === "archived";

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold leading-5">{roadmap.title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge label={getClientPortalOptionLabel(CLIENT_ROADMAP_STATUSES, roadmap.status)} size="sm" />
            <span className="text-xs capitalize text-[var(--muted)]">{roadmap.priority || "normal"} priority</span>
          </div>
        </div>
        {roadmap.visibleToClient === false ? (
          <EyeOff className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-label="Hidden from client" />
        ) : (
          <Eye className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-label="Visible to client" />
        )}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{roadmap.body}</p>

      {roadmap.impact || roadmap.effort ? (
        <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
          {roadmap.impact ? <div className="rounded-[var(--radius-md)] bg-[var(--card-surface)] px-2 py-1">Impact: {roadmap.impact}</div> : null}
          {roadmap.effort ? <div className="rounded-[var(--radius-md)] bg-[var(--card-surface)] px-2 py-1">Effort: {roadmap.effort}</div> : null}
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
      </div>
    </article>
  );
}

export default function RoadmapPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  recordLimit,
  layout = "compact",
}: ProductionRecordPanelProps) {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedRoadmap, setSelectedRoadmap] = useState<ClientRoadmapRecommendation | null>(null);
  const [roadmapForm, setRoadmapForm] = useState<RoadmapEditForm>(emptyRoadmap);
  const allRoadmapItems = overview.roadmapRecommendations || [];
  const roadmapItems = typeof recordLimit === "number" ? allRoadmapItems.slice(0, recordLimit) : allRoadmapItems;
  const columns = useMemo(() => splitRoadmapItemsByStatus(roadmapItems), [roadmapItems]);

  useEffect(() => {
    if (!selectedRoadmap || modalMode !== "edit") return;
    setRoadmapForm(toRoadmapForm(selectedRoadmap));
  }, [modalMode, selectedRoadmap]);

  function openCreate() {
    setSelectedRoadmap(null);
    setRoadmapForm(emptyRoadmap);
    setModalMode("create");
  }

  function openEdit(roadmap: ClientRoadmapRecommendation) {
    setSelectedRoadmap(roadmap);
    setRoadmapForm(toRoadmapForm(roadmap));
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedRoadmap(null);
    setRoadmapForm(emptyRoadmap);
  }

  function saveRoadmap() {
    const payload = buildRoadmapUpdatePayload(roadmapForm);
    if (modalMode === "create") {
      void submitScoped(
        () => createClientRoadmapRecommendation(organizationId, payload),
        "Roadmap recommendation added",
        closeModal,
      );
      return;
    }

    if (!selectedRoadmap) return;
    void submitScoped(
      () => updateClientRoadmapRecommendation(selectedRoadmap.id, payload),
      "Roadmap details saved",
      closeModal,
    );
  }

  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">
          {layout === "full" ? "Move recommendations through the board, keep archived items in history, and choose what clients can see." : "Roadmap recommendations are managed in a modal so this panel stays scannable."}
        </div>
        <Button type="button" size="sm" icon={<Plus className="h-4 w-4" />} disabled={saving} onClick={openCreate}>
          Add Recommendation
        </Button>
      </div>

      {roadmapItems.length === 0 ? (
        <EmptyState variant="compact" icon={Map} title="No roadmap items yet" description="Add the next recommendation for this client." />
      ) : layout === "full" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {columns.map((column) => (
            <section key={column.value} className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <span className="rounded-full bg-[var(--card-bg)] px-2 py-0.5 text-xs text-[var(--muted)]">{column.items.length}</span>
              </div>
              <div className="space-y-3">
                {column.items.length > 0 ? column.items.map((roadmap) => (
                  <RoadmapCard
                    key={roadmap.id}
                    roadmap={roadmap}
                    saving={saving}
                    onEdit={() => openEdit(roadmap)}
                    onArchive={() => submitScoped(() => updateClientRoadmapRecommendation(roadmap.id, { status: "archived" }), "Roadmap item archived", () => undefined)}
                    onRestore={() => submitScoped(() => updateClientRoadmapRecommendation(roadmap.id, { status: "recommended" }), "Roadmap item restored", () => undefined)}
                  />
                )) : (
                  <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-xs leading-5 text-[var(--muted)]">
                    No items here.
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {roadmapItems.map((roadmap) => (
            <RoadmapCard
              key={roadmap.id}
              roadmap={roadmap}
              saving={saving}
              onEdit={() => openEdit(roadmap)}
              onArchive={() => submitScoped(() => updateClientRoadmapRecommendation(roadmap.id, { status: "archived" }), "Roadmap item archived", () => undefined)}
              onRestore={() => submitScoped(() => updateClientRoadmapRecommendation(roadmap.id, { status: "recommended" }), "Roadmap item restored", () => undefined)}
            />
          ))}
        </div>
      )}

      <RoadmapFormModal
        isOpen={modalMode !== null}
        mode={modalMode || "create"}
        form={roadmapForm}
        saving={saving}
        onClose={closeModal}
        onChange={setRoadmapForm}
        onSubmit={saveRoadmap}
      />
    </>
  );

  if (layout === "full") {
    return (
      <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <div className="mb-5 flex items-center gap-2">
          <Map className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold">Roadmap Board</h2>
            <p className="text-sm text-[var(--muted)]">Plan recommendations, status, client visibility, and archived history.</p>
          </div>
        </div>
        {content}
      </section>
    );
  }

  return (
    <MiniPanel title="Roadmap" icon={Map} count={allRoadmapItems.length}>
      {content}
    </MiniPanel>
  );
}
