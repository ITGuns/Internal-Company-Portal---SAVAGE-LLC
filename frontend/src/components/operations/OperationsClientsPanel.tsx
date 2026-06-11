"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Search, ShieldCheck, UsersRound } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getMemberAuthorizationLabels,
  getMemberDisplayName,
  getMemberRoleLabel,
  type OperationsMember,
} from "@/lib/member-role-management";

const inputClass = "w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-10 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

interface OperationsClientsPanelProps {
  clients: OperationsMember[];
}

function formatStatus(status?: string | null, isApproved?: boolean | null) {
  if (!isApproved) return "Not approved";
  return status ? status.replace(/[_-]+/g, " ") : "Active";
}

export default function OperationsClientsPanel({ clients }: OperationsClientsPanelProps) {
  const [query, setQuery] = useState("");

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return clients;

    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.email,
        client.status,
        ...(client.roles || []).map((role) => `${role.role} ${role.department?.name || ""}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [clients, query]);

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="No client accounts found"
        description="Client portal users will appear here after they are invited or assigned to client accounts."
        actionLabel="Open client accounts"
        onAction={() => {
          window.location.href = "/operations/clients/accounts";
        }}
      />
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="operations-clients-heading">
      <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 id="operations-clients-heading" className="text-base font-semibold">Client Accounts</h2>
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {filteredClients.length} of {clients.length} shown
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:min-w-[36rem]">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search clients</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search client accounts"
            />
          </label>
          <Link
            href="/operations/clients/accounts"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-[0_12px_32px_-22px_var(--accent)] transition-[filter,transform] duration-150 ease-[var(--ease-out)] hover:brightness-105 active:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            Client Accounts
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={Search}
          title="No matching clients"
          description="Try a different client name, email, or role."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredClients.map((client) => {
            const displayName = getMemberDisplayName(client);
            const roleLabels = (client.roles || []).map(getMemberRoleLabel);

            return (
              <article key={client.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">{displayName}</h3>
                      <StatusBadge label={formatStatus(client.status, client.isApproved)} size="sm" />
                    </div>
                    <div className="mt-1 truncate text-xs text-[var(--muted)]">{client.email}</div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                    Client portal
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(roleLabels.length ? roleLabels : ["No role assigned"]).map((label) => (
                    <span key={label} className="rounded-full border border-[var(--border)] bg-[var(--card-surface)] px-2 py-1 text-xs text-[var(--foreground)]">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {getMemberAuthorizationLabels(client).map((label) => (
                    <span key={label} className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] text-[var(--muted)]">
                      {label}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
