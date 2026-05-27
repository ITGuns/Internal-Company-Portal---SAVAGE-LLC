"use client";

import { ExternalLink, FolderOpen, LinkIcon } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import ClientPortalPanel from "@/components/client-portal/ClientPortalPanel";
import ClientPortalWorkspaceFrame from "@/components/client-portal/ClientPortalWorkspaceFrame";
import {
  CLIENT_ASSET_STATUSES,
  getClientPortalOptionLabel,
} from "@/lib/client-portal-options";

export default function ClientResourcesPage() {
  return (
    <ClientPortalWorkspaceFrame
      title="Resources"
      subtitle="Files, assets, reports, previews, and shared links."
    >
      {({ overview }) => {
        if (!overview) return null;
        const resources = overview.resources || [];
        const assets = overview.assets || [];
        const totalCount = resources.length + assets.length;

        return (
          <ClientPortalPanel title="Resource Library" icon={FolderOpen} count={totalCount}>
            {totalCount === 0 ? (
              <EmptyState
                variant="compact"
                icon={LinkIcon}
                title="No resources shared yet"
                description="Preview links, report exports, and files will appear here."
              />
            ) : (
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
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">{resource.label}</h3>
                        <p className="mt-1 text-xs uppercase text-[var(--muted)]">{resource.type}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)]" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </ClientPortalPanel>
        );
      }}
    </ClientPortalWorkspaceFrame>
  );
}
