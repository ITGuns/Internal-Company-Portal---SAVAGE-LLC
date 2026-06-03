"use client";

import React, { useState } from "react";
import { ExternalLink, FolderOpen, LinkIcon, Pencil, Save, Send, Trash2, X } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { useUser } from "@/contexts/UserContext";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import {
  createClientResource,
  deleteClientResource,
  updateClientResource,
  type ClientResourceLink,
  type ClientPortalOverview,
} from "@/lib/client-portal";
import {
  CLIENT_ASSET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

const inputClass = "min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

function ClientResourceShareForm({
  organizationId,
  onSubmitted,
}: {
  organizationId: string;
  onSubmitted: () => Promise<void>;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ label: "", url: "" });
  const [saving, setSaving] = useState(false);
  const canSubmit = Boolean(form.label.trim() && form.url.trim());

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      toast.error("Add a title and link before sharing");
      return;
    }

    setSaving(true);
    try {
      await createClientResource(organizationId, {
        label: form.label.trim(),
        url: form.url.trim(),
        type: "client_link",
        visibleToClient: true,
      });
      setForm({ label: "", url: "" });
      await onSubmitted();
      toast.success("Resource shared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to share resource");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4"
    >
      <div className="mb-4 flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Share Resource</h3>
      </div>
      <div className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="client-resource-title" className="text-sm font-medium">Title</label>
          <input
            id="client-resource-title"
            className={inputClass}
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Shared brief, reference, or file"
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="client-resource-url" className="text-sm font-medium">Link</label>
          <input
            id="client-resource-url"
            className={inputClass}
            type="url"
            value={form.url}
            onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://example.com/resource"
            required
          />
          <p className="text-xs leading-5 text-[var(--muted)]">Shared links are visible to your client workspace and the operations team.</p>
        </div>
        <Button
          type="submit"
          icon={<Send className="h-4 w-4" />}
          loading={saving}
          disabled={!canSubmit}
          fullWidth
        >
          Share Resource
        </Button>
      </div>
    </form>
  );
}

function ClientResourceLinkCard({
  resource,
  onChanged,
}: {
  resource: ClientResourceLink;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const { user } = useUser();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: resource.label, url: resource.url });
  const canManage = resource.type === "client_link" && Boolean(resource.createdById) && resource.createdById === String(user?.id);

  function resetEdit() {
    setForm({ label: resource.label, url: resource.url });
    setEditing(false);
  }

  async function handleSave() {
    if (!form.label.trim() || !form.url.trim()) {
      toast.error("Resource title and link are required");
      return;
    }

    setSaving(true);
    try {
      await updateClientResource(resource.id, {
        label: form.label.trim(),
        url: form.url.trim(),
      });
      await onChanged();
      setEditing(false);
      toast.success("Resource updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update resource");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${resource.label}" from your shared resources?`)) {
      return;
    }

    setSaving(true);
    try {
      await deleteClientResource(resource.id);
      await onChanged();
      toast.success("Resource deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete resource");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <article className="rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--card-surface)] p-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <label htmlFor={`resource-label-${resource.id}`} className="text-sm font-medium">Title</label>
            <input
              id={`resource-label-${resource.id}`}
              className={inputClass}
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={`resource-url-${resource.id}`} className="text-sm font-medium">Link</label>
            <input
              id={`resource-url-${resource.id}`}
              className={inputClass}
              type="url"
              value={form.url}
              onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" icon={<Save className="h-4 w-4" />} loading={saving} onClick={handleSave}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" icon={<X className="h-4 w-4" />} disabled={saving} onClick={resetEdit}>
              Cancel
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors hover:bg-[var(--surface-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{resource.label}</h3>
          <p className="mt-1 text-xs uppercase text-[var(--muted)]">{resource.type}</p>
        </div>
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card-surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label={`Open ${resource.label}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} disabled={saving} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} loading={saving} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function ResourceLibrary({
  overview,
  onChanged,
}: {
  overview: ClientPortalOverview;
  onChanged: () => Promise<void>;
}) {
  const resources = overview.resources || [];
  const assets = overview.assets || [];
  const totalCount = resources.length + assets.length;

  if (totalCount === 0) {
    return (
      <EmptyState
        variant="compact"
        icon={LinkIcon}
        title="No resources shared yet"
        description="Preview links, report exports, and files will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => (
        <a
          key={asset.id}
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="group rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{asset.label}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase text-[var(--muted)]">{asset.type}</p>
                <StatusBadge label={getClientPortalOptionLabel(CLIENT_ASSET_STATUSES, asset.status)} size="sm" />
              </div>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)]" />
          </div>
        </a>
      ))}
      {resources.map((resource) => (
        <ClientResourceLinkCard key={resource.id} resource={resource} onChanged={onChanged} />
      ))}
    </div>
  );
}

export default function ClientResourcesPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Resources"
      subtitle="Files, assets, reports, previews, and shared links."
    >
      {({ overview, selectedId, refreshOverview }) => {
        if (!overview) return null;
        const resources = overview.resources || [];
        const assets = overview.assets || [];
        const totalCount = resources.length + assets.length;

        return (
          <ClientPortalPanel title="Resource Library" icon={FolderOpen} count={totalCount}>
            <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
              <ClientResourceShareForm organizationId={selectedId} onSubmitted={refreshOverview} />
              <ResourceLibrary overview={overview} onChanged={refreshOverview} />
            </div>
          </ClientPortalPanel>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
