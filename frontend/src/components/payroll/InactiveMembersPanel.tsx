"use client";

import React from "react";
import { AlertCircle, RefreshCw, RotateCcw, Trash2, UserX } from "lucide-react";
import Button from "@/components/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MemberStatusTarget } from "./MemberStatusModal";

interface InactiveMembersPanelProps {
  members: MemberStatusTarget[];
  loading: boolean;
  error: string | null;
  canHardDelete: boolean;
  onRetry: () => void;
  onReactivate: (member: MemberStatusTarget) => void;
  onHardDelete: (member: MemberStatusTarget) => void;
}

export default function InactiveMembersPanel({
  members,
  loading,
  error,
  canHardDelete,
  onRetry,
  onReactivate,
  onHardDelete,
}: InactiveMembersPanelProps) {
  if (loading) {
    return (
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading inactive members">
        {[0, 1, 2].map((row) => (
          <li key={row} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4" aria-hidden="true">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-3 w-48 max-w-full" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <div className="min-w-0">
            <div className="font-semibold">Could not load inactive members.</div>
            <div className="mt-1 break-words text-[var(--muted)]">{error}</div>
            <Button size="sm" variant="outline" className="mt-3" icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />} onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] py-12 text-center">
        <UserX className="mx-auto mb-3 h-10 w-10 text-[var(--muted)]" aria-hidden="true" />
        <h3 className="text-base font-semibold text-[var(--foreground)]">No inactive members</h3>
        <p className="mt-1 px-4 text-sm text-[var(--muted)]">
          Members you deactivate appear here so you can reactivate them later.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <li key={member.id} className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[var(--foreground)]">{member.name}</h3>
              {member.email && <p className="truncate text-sm text-[var(--muted)]">{member.email}</p>}
            </div>
            <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
              Inactive
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onReactivate(member)}
            >
              Reactivate
            </Button>
            {canHardDelete && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                onClick={() => onHardDelete(member)}
                className="text-red-600 dark:text-red-400"
              >
                Delete permanently
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
