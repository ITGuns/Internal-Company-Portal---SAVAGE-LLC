"use client";

import React from "react";
import { BriefcaseBusiness } from "lucide-react";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import {
  ClientPortalWorkspaceState,
  useClientPortalWorkspace,
} from "@/hooks/useClientPortalWorkspace";

interface ClientPortalWorkspaceFrameProps {
  title: string;
  subtitle: string;
  children: (workspace: ClientPortalWorkspaceState) => React.ReactNode;
}

export default function ClientPortalWorkspaceFrame({
  title,
  subtitle,
  children,
}: ClientPortalWorkspaceFrameProps) {
  const workspace = useClientPortalWorkspace();
  const { organizations, selectedId, setSelectedId, loading, overviewLoading } = workspace;

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title={title} subtitle={subtitle} />

        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {organizations.length > 1 ? (
              <select
                className="min-h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                aria-label="Client organization"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            ) : <div />}
            {overviewLoading ? <span className="text-xs text-[var(--muted)]">Refreshing workspace...</span> : null}
          </div>

          {loading ? (
            <div className="text-sm text-[var(--muted)]">Loading client workspace...</div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No client workspace assigned"
              description="Your account is not connected to a client organization yet."
            />
          ) : (
            children(workspace)
          )}
        </div>
      </div>
    </main>
  );
}
