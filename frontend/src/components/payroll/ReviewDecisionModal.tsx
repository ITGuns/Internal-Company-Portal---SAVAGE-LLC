"use client";

import React, { useEffect, useId, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { MAX_REASON_LENGTH, validateApprovedHours } from "@/lib/time-requests";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "./form-styles";

export type ReviewDecision = "approve" | "reject";

interface ReviewDecisionModalProps {
  isOpen: boolean;
  decision: ReviewDecision;
  /** One-line summary of the request being reviewed. */
  summary: string;
  personLabel: string;
  /** Set for overtime approvals so the reviewer can lower the hours. */
  requestedHours?: number;
  onClose: () => void;
  onConfirm: (input: { note?: string; hours?: number }) => Promise<boolean>;
}

export default function ReviewDecisionModal({
  isOpen,
  decision,
  summary,
  personLabel,
  requestedHours,
  onClose,
  onConfirm,
}: ReviewDecisionModalProps) {
  const idPrefix = useId();
  const [note, setNote] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState<{ hours?: string; note?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const allowHoursOverride = decision === "approve" && typeof requestedHours === "number";

  useEffect(() => {
    if (isOpen) {
      setNote("");
      setHours("");
      setError({});
    }
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextError: { hours?: string; note?: string } = {};
    let approvedHours: number | undefined;

    if (allowHoursOverride) {
      const result = validateApprovedHours(hours, requestedHours as number);
      if (!result.valid) nextError.hours = result.error;
      approvedHours = result.hours;
    }
    if (note.length > MAX_REASON_LENGTH) {
      nextError.note = `Keep the note under ${MAX_REASON_LENGTH} characters.`;
    }
    setError(nextError);
    if (nextError.hours || nextError.note) return;

    setSubmitting(true);
    const ok = await onConfirm({ note: note.trim() || undefined, hours: approvedHours });
    setSubmitting(false);
    if (ok) onClose();
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const isApprove = decision === "approve";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? "Approve request" : "Reject request"}
      subtitle={`${personLabel}: ${summary}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        {allowHoursOverride && (
          <div>
            <label htmlFor={fieldId("hours")} className={fieldLabelClass}>
              Approved hours <span className="font-normal text-[var(--muted)]">(optional)</span>
            </label>
            <input
              id={fieldId("hours")}
              type="number"
              inputMode="decimal"
              min="0.25"
              max={requestedHours}
              step="0.25"
              placeholder={String(requestedHours)}
              className={fieldInputClass}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              aria-invalid={Boolean(error.hours)}
              aria-describedby={error.hours ? fieldId("hours-error") : fieldId("hours-help")}
              disabled={submitting}
            />
            {error.hours ? (
              <p id={fieldId("hours-error")} className={fieldErrorClass}>{error.hours}</p>
            ) : (
              <p id={fieldId("hours-help")} className={fieldHelpClass}>
                Leave blank to approve all {requestedHours} hours. You can only lower it.
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor={fieldId("note")} className={fieldLabelClass}>
            Note <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <textarea
            id={fieldId("note")}
            rows={3}
            className={fieldTextareaClass}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(error.note)}
            aria-describedby={error.note ? fieldId("note-error") : fieldId("note-help")}
            disabled={submitting}
          />
          {error.note ? (
            <p id={fieldId("note-error")} className={fieldErrorClass}>{error.note}</p>
          ) : (
            <p id={fieldId("note-help")} className={fieldHelpClass}>
              The employee sees this note with the decision.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant={isApprove ? "success" : "danger"} loading={submitting}>
            {isApprove ? "Approve" : "Reject"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
