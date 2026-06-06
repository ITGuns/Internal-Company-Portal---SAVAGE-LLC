"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Archive, RefreshCw } from "lucide-react";
import Button from "@/components/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ClientOrganization } from "@/lib/client-portal";
import { CLIENT_ORGANIZATION_STATUSES, getClientPortalOptionLabel } from "@/lib/client-portal-options";

interface AdminClientArchivePanelProps {
  organization: ClientOrganization;
  saving: boolean;
  onStatusChange: (status: "active" | "archived") => Promise<void>;
}

export default function AdminClientArchivePanel({
  organization,
  saving,
  onStatusChange,
}: AdminClientArchivePanelProps) {
  const [confirmation, setConfirmation] = useState("");
  const isArchived = organization.status === "archived";
  const statusLabel = getClientPortalOptionLabel(CLIENT_ORGANIZATION_STATUSES, organization.status);
  const canArchive = confirmation.trim() === organization.name;

  useEffect(() => {
    setConfirmation("");
  }, [organization.id, organization.status]);

  if (isArchived) {
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <div className="text-sm font-semibold text-amber-700">Client account archived</div>
            <StatusBadge label={statusLabel} size="sm" />
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Client users cannot open this organization. Internal teams can still review records, reports, files, billing, and conversation history.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon={<RefreshCw className="h-4 w-4" />}
          loading={saving}
          onClick={() => onStatusChange("active")}
          fullWidth
        >
          Restore Client Access
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
          <div className="text-sm font-semibold text-red-700">Archive this client</div>
          <StatusBadge label={statusLabel} size="sm" />
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Archiving removes the client from client-facing portal access while keeping all operational records available to admins and web developers.
        </p>
      </div>

      <div>
        <label htmlFor="client-archive-confirmation" className="mb-2 block text-sm font-medium">
          Type &quot;{organization.name}&quot; to confirm
        </label>
        <input
          id="client-archive-confirmation"
          className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={organization.name}
          disabled={saving}
        />
      </div>

      <Button
        type="button"
        variant="danger"
        icon={<Archive className="h-4 w-4" />}
        loading={saving}
        disabled={!canArchive || saving}
        onClick={() => onStatusChange("archived")}
        fullWidth
      >
        Archive Client
      </Button>
    </div>
  );
}
