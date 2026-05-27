"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type { ClientWorkItem } from "@/lib/client-portal";
import {
  createClientWorkItem,
  updateClientWorkItem,
} from "@/lib/client-portal";
import {
  buildWorkItemUpdatePayload,
  toDateInputValue,
  type WorkItemEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_WORK_ITEM_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";
import type { ProductionRecordPanelProps } from "./types";
import {
  EditFormActions,
  InlineRecordControls,
  MiniPanel,
  RecordHeader,
  selectClass,
  TextareaField,
  VisibilityCheckbox,
} from "./shared";

const emptyWorkItem = { title: "", description: "", status: "open", progress: "0", dueAt: "", visibleToClient: true };

function toWorkItemForm(item: ClientWorkItem): WorkItemEditForm {
  return {
    title: item.title || "",
    description: item.description || "",
    status: item.status || "open",
    priority: item.priority || "normal",
    progress: String(item.progress ?? 0),
    dueAt: toDateInputValue(item.dueAt),
    visibleToClient: item.visibleToClient !== false,
  };
}

function WorkItemRecord({
  item,
  saving,
  submitScoped,
}: {
  item: ClientWorkItem;
  saving: boolean;
  submitScoped: ProductionRecordPanelProps["submitScoped"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<WorkItemEditForm>(() => toWorkItemForm(item));

  useEffect(() => {
    if (!isEditing) setForm(toWorkItemForm(item));
  }, [isEditing, item]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
      <RecordHeader
        title={item.title}
        subtitle={`${item.progress || 0}% complete - ${getClientPortalOptionLabel(CLIENT_WORK_ITEM_STATUSES, item.status)}`}
        isEditing={isEditing}
        saving={saving}
        onToggleEdit={() => setIsEditing((current) => !current)}
      />

      <InlineRecordControls
        status={item.status}
        statusOptions={CLIENT_WORK_ITEM_STATUSES}
        visibleToClient={item.visibleToClient !== false}
        saving={saving}
        archiveDisabled={item.status === "archived"}
        onSave={(data) => submitScoped(() => updateClientWorkItem(item.id, data), "Work item updated", () => undefined)}
        onArchive={() => submitScoped(() => updateClientWorkItem(item.id, { status: "archived" }), "Work item archived", () => undefined)}
      />

      {isEditing ? (
        <form
          className="mt-3 space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitScoped(
              () => updateClientWorkItem(item.id, buildWorkItemUpdatePayload(form)),
              "Work item details saved",
              () => setIsEditing(false),
            );
          }}
        >
          <FormField id={`work-title-${item.id}`} label="Title" value={form.title} onChange={(title) => setForm((current) => ({ ...current, title }))} required />
          <TextareaField value={form.description || ""} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="Client-visible task details" ariaLabel={`Work item details for ${item.title}`} />
          <div className="grid gap-3 sm:grid-cols-3">
            <select className={selectClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} aria-label="Work item status">
              {CLIENT_WORK_ITEM_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <FormField id={`work-progress-${item.id}`} label="Progress" type="number" value={form.progress || ""} min={0} max={100} onChange={(progress) => setForm((current) => ({ ...current, progress }))} />
            <FormField id={`work-due-${item.id}`} label="Due Date" type="date" value={form.dueAt || ""} onChange={(dueAt) => setForm((current) => ({ ...current, dueAt }))} />
          </div>
          <VisibilityCheckbox checked={form.visibleToClient} onChange={(visibleToClient) => setForm((current) => ({ ...current, visibleToClient }))} />
          <EditFormActions saving={saving} onCancel={() => setIsEditing(false)} />
        </form>
      ) : null}
    </div>
  );
}

export default function WorkItemsPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  recordLimit,
}: ProductionRecordPanelProps) {
  const [workItemForm, setWorkItemForm] = useState(emptyWorkItem);
  const workItems = typeof recordLimit === "number" ? (overview.workItems || []).slice(0, recordLimit) : (overview.workItems || []);

  return (
    <MiniPanel title="Work Items" icon={ClipboardList} count={overview.workItems?.length || 0}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitScoped(
            () => createClientWorkItem(organizationId, {
              title: workItemForm.title,
              description: workItemForm.description || undefined,
              status: workItemForm.status,
              progress: Number(workItemForm.progress),
              dueAt: workItemForm.dueAt || undefined,
              visibleToClient: workItemForm.visibleToClient,
            }),
            "Client work item created",
            () => setWorkItemForm(emptyWorkItem),
          );
        }}
        className="space-y-3"
      >
        <FormField id="work-title" label="Title" value={workItemForm.title} onChange={(title) => setWorkItemForm((form) => ({ ...form, title }))} required />
        <TextareaField value={workItemForm.description} onChange={(description) => setWorkItemForm((form) => ({ ...form, description }))} placeholder="Client-visible task details" ariaLabel="Work item description" />
        <div className="grid gap-3 sm:grid-cols-3">
          <select className={selectClass} value={workItemForm.status} onChange={(event) => setWorkItemForm((form) => ({ ...form, status: event.target.value }))} aria-label="Work item status">
            {CLIENT_WORK_ITEM_STATUSES.filter((status) => status.value !== "archived").map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <FormField id="work-progress" label="Progress" type="number" value={workItemForm.progress} min={0} max={100} onChange={(progress) => setWorkItemForm((form) => ({ ...form, progress }))} />
          <FormField id="work-due" label="Due Date" type="date" value={workItemForm.dueAt} onChange={(dueAt) => setWorkItemForm((form) => ({ ...form, dueAt }))} />
        </div>
        <VisibilityCheckbox checked={workItemForm.visibleToClient} onChange={(visibleToClient) => setWorkItemForm((form) => ({ ...form, visibleToClient }))} />
        <Button type="submit" loading={saving}>Add Work Item</Button>
      </form>

      <div className="mt-4 space-y-2">
        {workItems.map((item) => (
          <WorkItemRecord key={item.id} item={item} saving={saving} submitScoped={submitScoped} />
        ))}
      </div>
    </MiniPanel>
  );
}
