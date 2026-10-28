"use client";

import React, { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Star, StarOff, Trash2 } from "lucide-react";
import Button from "@/components/Button";
import { inUseLabel } from "@/lib/payroll-options";

interface OptionListRowProps {
  title: string;
  detail?: string;
  isDefault: boolean;
  archived: boolean;
  inUseCount?: number;
  /** This row's change is running. */
  busy: boolean;
  /** Another change or an edit form is open. */
  locked: boolean;
  error?: string;
  onEdit: () => void;
  onSetDefault: () => void;
  /** Lists that may have no default (tax rules) offer "Remove as default". */
  onClearDefault?: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "accent" | "muted" }) {
  const toneClass = tone === "accent"
    ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
    : "border-[var(--border)] bg-[var(--card-surface)] text-[var(--muted)]";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>{children}</span>;
}

/**
 * One row of a Payroll options list with its actions. The default row cannot
 * be archived or deleted; delete asks first, and the server refuses (409) a
 * row still in use, which is shown here with an "Archive instead" shortcut.
 */
export default function OptionListRow({
  title,
  detail,
  isDefault,
  archived,
  inUseCount,
  busy,
  locked,
  error,
  onEdit,
  onSetDefault,
  onClearDefault,
  onArchive,
  onRestore,
  onDelete,
}: OptionListRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const disabled = busy || locked;
  const canArchiveInstead = Boolean(error && !archived && !isDefault && /archive it instead/i.test(error));

  return (
    <li className={`py-3 ${archived ? "opacity-75" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words text-sm font-medium text-[var(--foreground)]">{title}</span>
            {isDefault && <Badge tone="accent">Default</Badge>}
            {archived && <Badge tone="muted">Archived</Badge>}
          </div>
          {detail && <p className="mt-0.5 text-xs text-[var(--muted)]">{detail}</p>}
          {inUseCount !== undefined && <p className="mt-0.5 text-xs text-[var(--muted)]">{inUseLabel(inUseCount)}</p>}
        </div>

        {confirmingDelete ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground)] sm:justify-end" role="group" aria-label={`Delete ${title}`}>
            <span>Delete for good?</span>
            <Button
              size="sm"
              variant="danger"
              loading={busy}
              onClick={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>Keep</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 sm:shrink-0 sm:justify-end">
            {!archived && (
              <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onEdit} disabled={disabled} aria-label={`Edit ${title}`}>
                Edit
              </Button>
            )}
            {!archived && !isDefault && (
              <Button size="sm" variant="ghost" icon={<Star className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onSetDefault} disabled={disabled} aria-label={`Set ${title} as default`}>
                Set as default
              </Button>
            )}
            {isDefault && onClearDefault && (
              <Button size="sm" variant="ghost" icon={<StarOff className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onClearDefault} disabled={disabled} aria-label={`Remove ${title} as default`}>
                Remove as default
              </Button>
            )}
            {!archived && !isDefault && (
              <Button size="sm" variant="ghost" icon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onArchive} disabled={disabled} aria-label={`Archive ${title}`}>
                Archive
              </Button>
            )}
            {archived && (
              <Button size="sm" variant="ghost" icon={<ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onRestore} disabled={disabled} aria-label={`Restore ${title}`}>
                Restore
              </Button>
            )}
            {!isDefault && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => setConfirmingDelete(true)}
                disabled={disabled}
                aria-label={`Delete ${title}`}
                className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-[var(--foreground)]">
          <span className="min-w-0 flex-1">{error}</span>
          {canArchiveInstead && (
            <Button size="sm" variant="outline" onClick={onArchive} disabled={disabled}>Archive instead</Button>
          )}
        </div>
      )}
    </li>
  );
}
