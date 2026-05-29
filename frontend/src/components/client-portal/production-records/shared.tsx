"use client";

import React, { useEffect, useState } from "react";
import { Archive, Pencil, Save, X } from "lucide-react";
import Button from "@/components/Button";
import { ProductionPanel } from "@/components/workspace/ProductionWorkspace";
import type { ClientPortalOption } from "@/lib/client-portal-options";

export const selectClass = "w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
export const textareaClass = "min-h-20 w-full rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export function MiniPanel({
  title,
  icon: Icon,
  children,
  count,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <ProductionPanel title={title} icon={Icon} count={count} bodyClassName="p-4">
      {children}
    </ProductionPanel>
  );
}

export function VisibilityCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Visible to client
    </label>
  );
}

export function TextareaField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  required?: boolean;
}) {
  return (
    <textarea
      className={textareaClass}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      required={required}
    />
  );
}

export function InlineRecordControls({
  status,
  statusOptions,
  visibleToClient,
  saving,
  onSave,
  onArchive,
  archiveDisabled,
}: {
  status: string;
  statusOptions: ClientPortalOption[];
  visibleToClient: boolean;
  saving: boolean;
  onSave: (data: { status: string; visibleToClient: boolean }) => void;
  onArchive?: () => void;
  archiveDisabled?: boolean;
}) {
  const [nextStatus, setNextStatus] = useState(status);
  const [nextVisible, setNextVisible] = useState(visibleToClient);

  useEffect(() => {
    setNextStatus(status);
    setNextVisible(visibleToClient);
  }, [status, visibleToClient]);

  const isDirty = nextStatus !== status || nextVisible !== visibleToClient;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select
        className="min-h-9 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value)}
        aria-label="Record status"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <label className="flex min-h-9 items-center gap-2 rounded-md border border-[var(--border)] px-2 text-xs">
        <input
          type="checkbox"
          checked={nextVisible}
          onChange={(event) => setNextVisible(event.target.checked)}
        />
        Client-visible
      </label>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={<Save className="h-4 w-4" />}
        disabled={saving || !isDirty}
        onClick={() => onSave({ status: nextStatus, visibleToClient: nextVisible })}
      >
        Save
      </Button>
      {onArchive ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          icon={<Archive className="h-4 w-4" />}
          disabled={saving || archiveDisabled}
          onClick={onArchive}
        >
          Archive
        </Button>
      ) : null}
    </div>
  );
}

export function RecordHeader({
  title,
  subtitle,
  isEditing,
  onToggleEdit,
  saving,
}: {
  title: string;
  subtitle?: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate font-medium">{title}</div>
        {subtitle ? <div className="text-xs text-[var(--muted)]">{subtitle}</div> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        disabled={saving}
        onClick={onToggleEdit}
      >
        {isEditing ? "Close" : "Edit"}
      </Button>
    </div>
  );
}

export function EditFormActions({
  saving,
  onCancel,
}: {
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" loading={saving} icon={<Save className="h-4 w-4" />}>
        Save Details
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
