"use client";

import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import {
  getEntryDurationMinutes,
  type PayrollAuditEntry,
} from "@/lib/payroll-calendar/day-audit";

interface TimeEntryDeleteModalProps {
  entry: PayrollAuditEntry | null;
  onClose: () => void;
  onConfirm: (entryId: string) => Promise<void> | void;
}

const CONFIRMATION_TEXT = "DELETE";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours > 0) return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
  return `${remainingMinutes}m`;
}

export default function TimeEntryDeleteModal({
  entry,
  onClose,
  onConfirm,
}: TimeEntryDeleteModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setConfirmation("");
    setIsSubmitting(false);
  }, [entry?.id]);

  async function handleConfirm() {
    if (!entry || confirmation !== CONFIRMATION_TEXT) return;

    setIsSubmitting(true);
    try {
      await onConfirm(entry.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={Boolean(entry)}
      onClose={onClose}
      title="Delete Time Entry"
      size="md"
    >
      {entry && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <div className="font-semibold text-red-600">
              This removes a payroll time record.
            </div>
            <p className="mt-2 text-[var(--foreground)]">
              Entry: <strong>{formatTime(entry.start)} to {entry.end ? formatTime(entry.end) : "Open"}</strong>
            </p>
            <p className="mt-1 text-[var(--muted)]">
              Duration: {formatMinutes(getEntryDurationMinutes(entry))}
            </p>
            {!entry.end && (
              <p className="mt-2 text-red-600">
                This entry is still open. Deleting it will remove the active clock record.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="time-entry-delete-confirmation" className="mb-1 block text-sm font-medium">
              Type &quot;{CONFIRMATION_TEXT}&quot; to confirm
            </label>
            <input
              id="time-entry-delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={CONFIRMATION_TEXT}
              className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={handleConfirm}
              loading={isSubmitting}
              disabled={confirmation !== CONFIRMATION_TEXT}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
