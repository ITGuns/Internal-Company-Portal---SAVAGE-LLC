"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import Button from "@/components/Button";
import FormField from "@/components/forms/FormField";
import {
  ClientProject,
  ClientUpdate,
  createClientUpdate,
} from "@/lib/client-portal";
import { CLIENT_UPDATE_PRESETS } from "@/lib/client-portal-options";
import ClientOperationsPanel, {
  clientOperationsTextareaClass,
  ProjectPillSelector,
} from "./ClientOperationsPanel";

const emptyUpdate = { title: "", body: "", status: "published", visibleToClient: true, projectId: "" };

interface AdminClientUpdatesPanelProps {
  organizationId: string;
  projects: ClientProject[];
  updates: ClientUpdate[];
  saving: boolean;
  submitScoped: (
    action: () => Promise<unknown>,
    successMessage: string,
    reset: () => void,
  ) => Promise<void>;
}

export default function AdminClientUpdatesPanel({
  organizationId,
  projects,
  updates,
  saving,
  submitScoped,
}: AdminClientUpdatesPanelProps) {
  const [updateForm, setUpdateForm] = useState(emptyUpdate);

  return (
    <ClientOperationsPanel icon={FileText} title="Published Updates" count={updates.length}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitScoped(
            () => createClientUpdate(organizationId, updateForm),
            "Client update published",
            () => setUpdateForm(emptyUpdate),
          );
        }}
        className="space-y-3"
      >
        <FormField id="update-title" label="Title" value={updateForm.title} onChange={(title) => setUpdateForm((form) => ({ ...form, title }))} required />
        <div className="flex flex-wrap gap-2">
          {CLIENT_UPDATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setUpdateForm((form) => ({
                ...form,
                title: preset.title,
                body: preset.body,
                visibleToClient: true,
              }))}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          className={clientOperationsTextareaClass}
          value={updateForm.body}
          onChange={(event) => setUpdateForm((form) => ({ ...form, body: event.target.value }))}
          placeholder="What changed for the client?"
          aria-label="Update body"
          required
        />
        <ProjectPillSelector
          projects={projects}
          value={updateForm.projectId}
          onChange={(projectId) => setUpdateForm((form) => ({ ...form, projectId }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={updateForm.visibleToClient} onChange={(event) => setUpdateForm((form) => ({ ...form, visibleToClient: event.target.checked }))} />
          Visible to client
        </label>
        <Button type="submit" loading={saving}>Publish Update</Button>
      </form>
    </ClientOperationsPanel>
  );
}
