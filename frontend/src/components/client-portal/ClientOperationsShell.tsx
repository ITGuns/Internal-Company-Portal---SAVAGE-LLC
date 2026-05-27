"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import {
  Archive,
  BriefcaseBusiness,
  ShieldCheck,
} from "lucide-react";
import Header from "@/components/Header";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useClientOperationsWorkspace, type ClientOperationsWorkspace } from "@/hooks/useClientOperationsWorkspace";
import { splitClientOrganizationsByHistory } from "@/lib/client-organization-history";
import { getClientOperationsRouteTitle } from "@/lib/client-operations-navigation";
import { cn } from "@/lib/utils";

function ClientOrganizationButton({
  organization,
  isSelected,
  onSelect,
}: {
  organization: ClientOperationsWorkspace["organizations"][number];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors",
        isSelected
          ? "border-[var(--accent)] bg-[var(--card-surface)]"
          : "border-[var(--border)] hover:bg-[var(--surface-hover)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-sm font-semibold">{organization.name}</div>
        {organization.status !== "active" ? <StatusBadge label={organization.status} size="sm" /> : null}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="truncate">{organization.slug}</span>
        <span>{organization.counts?.tickets || 0} requests</span>
      </div>
    </button>
  );
}

function ClientOperationsClientPicker({ workspace }: { workspace: ClientOperationsWorkspace }) {
  const { current, history } = splitClientOrganizationsByHistory(workspace.organizations);

  return (
    <aside className="space-y-4" aria-label="Client account selector">
      <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Clients</h2>
        </div>

        {workspace.organizations.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={BriefcaseBusiness}
            title="No clients yet"
            description="Create the first client from Accounts."
          />
        ) : (
          <div className="mt-4 space-y-2">
            <select
              className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              value={workspace.selectedId}
              onChange={(event) => workspace.selectClient(event.target.value)}
              aria-label="Selected client"
            >
              {current.length > 0 ? (
                <optgroup label="Current clients">
                  {current.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.status === "active" ? organization.name : `${organization.name} (${organization.status})`}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {history.length > 0 ? (
                <optgroup label="History">
                  {history.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name} (archived)</option>
                  ))}
                </optgroup>
              ) : null}
            </select>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase text-[var(--muted)]">Current</div>
                {current.length > 0 ? (
                  current.map((organization) => (
                    <ClientOrganizationButton
                      key={organization.id}
                      organization={organization}
                      isSelected={workspace.selectedId === organization.id}
                      onSelect={() => workspace.selectClient(organization.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-3 text-xs leading-5 text-[var(--muted)]">
                    No current clients. Restored accounts will return here.
                  </div>
                )}
              </div>

              {history.length > 0 ? (
                <div className="space-y-2 border-t border-[var(--border)] pt-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-[var(--muted)]">
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>History</span>
                    <span className="ml-auto rounded-full bg-[var(--card-surface)] px-2 py-0.5">{history.length}</span>
                  </div>
                  {history.map((organization) => (
                    <ClientOrganizationButton
                      key={organization.id}
                      organization={organization}
                      isSelected={workspace.selectedId === organization.id}
                      onSelect={() => workspace.selectClient(organization.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}

function ClientOperationsClientHeader({ workspace }: { workspace: ClientOperationsWorkspace }) {
  const organization = workspace.selectedOrganization;
  if (!organization || !workspace.overview) return null;

  const summaryItems = [
    ["Projects", workspace.summary.projectCount],
    ["Open requests", workspace.summary.openTicketCount],
    ["Updates", workspace.summary.updateCount],
    ["Progress", `${workspace.summary.averageProgress}%`],
  ];

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase text-[var(--muted)]">{organization.slug}</div>
          <h1 className="mt-1 text-xl font-semibold">{organization.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <StatusBadge label={organization.status} size="sm" />
            {organization.websiteUrl ? (
              <a className="hover:text-[var(--foreground)]" href={organization.websiteUrl} target="_blank" rel="noreferrer">
                {organization.websiteUrl}
              </a>
            ) : (
              <span>No website URL</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3">
              <div className="text-lg font-semibold">{value}</div>
              <div className="text-xs text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ClientOperationsShell({
  children,
}: {
  children: (workspace: ClientOperationsWorkspace) => React.ReactNode;
}) {
  const workspace = useClientOperationsWorkspace();
  const pathname = usePathname() || "/operations/clients";
  const routeTitle = getClientOperationsRouteTitle(pathname);

  if (workspace.userLoading) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-0">
          <Header title={routeTitle.title} subtitle={routeTitle.subtitle} />
          <div className="mt-6 text-sm text-[var(--muted)]">Checking client operations access...</div>
        </div>
      </main>
    );
  }

  if (!workspace.canManageClients) {
    return (
      <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
        <div className="p-6 pt-0">
          <Header title={routeTitle.title} subtitle={routeTitle.subtitle} />
          <div className="mt-6">
            <EmptyState
              icon={ShieldCheck}
              title="Client operations access required"
              description="Client administration is available to admins, operations managers, and web developers."
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content-height bg-[var(--background)] text-[var(--foreground)]">
      <div className="p-6 pt-0">
        <Header title={routeTitle.title} subtitle={routeTitle.subtitle} />

        <div className="mt-6 space-y-5">
          {workspace.loading ? (
            <div className="text-sm text-[var(--muted)]">Loading client operations...</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
              <ClientOperationsClientPicker workspace={workspace} />
              <div className="space-y-5">
                <ClientOperationsClientHeader workspace={workspace} />
                {children(workspace)}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
