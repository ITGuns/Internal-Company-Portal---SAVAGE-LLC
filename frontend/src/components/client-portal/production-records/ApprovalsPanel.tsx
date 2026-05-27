"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import type { ClientApproval } from "@/lib/client-portal";
import {
  createClientApproval,
  updateClientApproval,
} from "@/lib/client-portal";
import {
  buildApprovalUpdatePayload,
  toDateInputValue,
  type ApprovalEditForm,
} from "@/lib/client-production-record-forms";
import {
  CLIENT_APPROVAL_STATUSES,
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

const emptyApproval = { title: "", description: "", status: "pending", dueAt: "", visibleToClient: true };

function toApprovalForm(approval: ClientApproval): ApprovalEditForm {
  return {
    title: approval.title || "",
    description: approval.description || "",
    status: approval.status || "pending",
    dueAt: toDateInputValue(approval.dueAt),
    visibleToClient: approval.visibleToClient !== false,
  };
}

function ApprovalRecord({
  approval,
  saving,
  submitScoped,
}: {
  approval: ClientApproval;
  saving: boolean;
  submitScoped: ProductionRecordPanelProps["submitScoped"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ApprovalEditForm>(() => toApprovalForm(approval));

  useEffect(() => {
    if (!isEditing) setForm(toApprovalForm(approval));
  }, [approval, isEditing]);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
      <RecordHeader
        title={approval.title}
        subtitle={getClientPortalOptionLabel(CLIENT_APPROVAL_STATUSES, approval.status)}
        isEditing={isEditing}
        saving={saving}
        onToggleEdit={() => setIsEditing((current) => !current)}
      />

      {approval.responseNote ? (
        <p className="mt-2 rounded-[var(--radius-md)] bg-[var(--card-surface)] px-3 py-2 text-xs text-[var(--muted)]">
          Client response: {approval.responseNote}
        </p>
      ) : null}

      <InlineRecordControls
        status={approval.status}
        statusOptions={CLIENT_APPROVAL_STATUSES}
        visibleToClient={approval.visibleToClient !== false}
        saving={saving}
        archiveDisabled={approval.status === "archived"}
        onSave={(data) => submitScoped(() => updateClientApproval(approval.id, data), "Approval updated", () => undefined)}
        onArchive={() => submitScoped(() => updateClientApproval(approval.id, { status: "archived" }), "Approval archived", () => undefined)}
      />

      {isEditing ? (
        <form
          className="mt-3 space-y-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitScoped(
              () => updateClientApproval(approval.id, buildApprovalUpdatePayload(form)),
              "Approval details saved",
              () => setIsEditing(false),
            );
          }}
        >
          <FormField id={`approval-title-${approval.id}`} label="Title" value={form.title} onChange={(title) => setForm((current) => ({ ...current, title }))} required />
          <TextareaField value={form.description || ""} onChange={(description) => setForm((current) => ({ ...current, description }))} placeholder="What should the client approve?" ariaLabel={`Approval details for ${approval.title}`} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={selectClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} aria-label="Approval status">
              {CLIENT_APPROVAL_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <FormField id={`approval-due-${approval.id}`} label="Due Date" type="date" value={form.dueAt || ""} onChange={(dueAt) => setForm((current) => ({ ...current, dueAt }))} />
          </div>
          <VisibilityCheckbox checked={form.visibleToClient} onChange={(visibleToClient) => setForm((current) => ({ ...current, visibleToClient }))} />
          <EditFormActions saving={saving} onCancel={() => setIsEditing(false)} />
        </form>
      ) : null}
    </div>
  );
}

export default function ApprovalsPanel({
  organizationId,
  overview,
  saving,
  submitScoped,
  recordLimit,
}: ProductionRecordPanelProps) {
  const [approvalForm, setApprovalForm] = useState(emptyApproval);
  const approvals = typeof recordLimit === "number" ? (overview.approvals || []).slice(0, recordLimit) : (overview.approvals || []);

  return (
    <MiniPanel title="Approvals" icon={CheckCircle2} count={overview.approvals?.length || 0}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitScoped(
            () => createClientApproval(organizationId, {
              title: approvalForm.title,
              description: approvalForm.description || undefined,
              status: approvalForm.status,
              dueAt: approvalForm.dueAt || undefined,
              visibleToClient: approvalForm.visibleToClient,
            }),
            "Client approval created",
            () => setApprovalForm(emptyApproval),
          );
        }}
        className="space-y-3"
      >
        <FormField id="approval-title" label="Title" value={approvalForm.title} onChange={(title) => setApprovalForm((form) => ({ ...form, title }))} required />
        <TextareaField value={approvalForm.description} onChange={(description) => setApprovalForm((form) => ({ ...form, description }))} placeholder="What should the client approve?" ariaLabel="Approval description" />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className={selectClass} value={approvalForm.status} onChange={(event) => setApprovalForm((form) => ({ ...form, status: event.target.value }))} aria-label="Approval status">
            {CLIENT_APPROVAL_STATUSES.filter((status) => status.value !== "archived").map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <FormField id="approval-due" label="Due Date" type="date" value={approvalForm.dueAt} onChange={(dueAt) => setApprovalForm((form) => ({ ...form, dueAt }))} />
        </div>
        <VisibilityCheckbox checked={approvalForm.visibleToClient} onChange={(visibleToClient) => setApprovalForm((form) => ({ ...form, visibleToClient }))} />
        <Button type="submit" loading={saving}>Add Approval</Button>
      </form>

      <div className="mt-4 space-y-2">
        {approvals.map((approval) => (
          <ApprovalRecord key={approval.id} approval={approval} saving={saving} submitScoped={submitScoped} />
        ))}
      </div>
    </MiniPanel>
  );
}
