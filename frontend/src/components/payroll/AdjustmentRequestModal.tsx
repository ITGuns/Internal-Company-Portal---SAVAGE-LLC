"use client";

import React, { useEffect, useId, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { createAdjustmentRequest } from "@/lib/adjustment-requests";
import {
  ADJUSTMENT_ACTION_LABELS,
  isoToLocalInput,
  localInputToIso,
  validateAdjustmentRequestForm,
  type AdjustmentAction,
  type AdjustmentRequestForm,
} from "@/lib/time-requests";
import type { PayrollAuditEntry } from "@/lib/payroll-calendar/day-audit";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "./form-styles";

interface AdjustmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Entry to correct. Null means the person is reporting a missing entry. */
  entry: PayrollAuditEntry | null;
  /** YYYY-MM-DD used to prefill a missing-entry request. */
  defaultDate?: string | null;
  onSubmitted?: () => void;
}

type FormErrors = Partial<Record<keyof AdjustmentRequestForm, string>>;

function buildInitialForm(entry: PayrollAuditEntry | null, defaultDate?: string | null): AdjustmentRequestForm {
  if (entry) {
    return {
      action: "update",
      timeEntryId: entry.id,
      proposedStart: isoToLocalInput(entry.start),
      proposedEnd: isoToLocalInput(entry.end),
      reason: "",
    };
  }
  const day = defaultDate || "";
  return {
    action: "create",
    proposedStart: day ? `${day}T09:00` : "",
    proposedEnd: day ? `${day}T17:00` : "",
    reason: "",
  };
}

function formatEntry(entry: PayrollAuditEntry): string {
  const start = new Date(entry.start);
  const date = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const from = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const to = entry.end
    ? new Date(entry.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "still open";
  return `${date}, ${from} to ${to}`;
}

export default function AdjustmentRequestModal({
  isOpen,
  onClose,
  entry,
  defaultDate,
  onSubmitted,
}: AdjustmentRequestModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [form, setForm] = useState<AdjustmentRequestForm>(() => buildInitialForm(entry, defaultDate));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialForm(entry, defaultDate));
      setErrors({});
    }
  }, [isOpen, entry, defaultDate]);

  const actions: AdjustmentAction[] = entry ? ["update", "delete"] : ["create"];
  const showTimes = form.action !== "delete";

  const update = (patch: Partial<AdjustmentRequestForm>) => {
    setForm((previous) => ({ ...previous, ...patch }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateAdjustmentRequestForm(form);
    setErrors(result.errors);
    if (!result.valid) return;

    setSubmitting(true);
    try {
      await createAdjustmentRequest({
        action: form.action,
        timeEntryId: form.timeEntryId,
        proposedStart: localInputToIso(form.proposedStart),
        proposedEnd: localInputToIso(form.proposedEnd),
        reason: form.reason,
      });
      toast.success("Correction request sent for review.");
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the correction request.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request a correction"
      subtitle="A manager or payroll reviewer approves the change before it reaches your hours."
      size="md"
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        {entry && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm">
            <div className="text-xs text-[var(--muted)]">Entry</div>
            <div className="font-medium">{formatEntry(entry)}</div>
          </div>
        )}

        {actions.length > 1 && (
          <fieldset>
            <legend className={fieldLabelClass}>What needs to change</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {actions.map((action) => (
                <label
                  key={action}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
                    form.action === action
                      ? "border-[var(--accent)] bg-[var(--card-bg)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <input
                    type="radio"
                    name={fieldId("action")}
                    value={action}
                    checked={form.action === action}
                    onChange={() => update({ action })}
                    className="accent-[var(--accent)]"
                  />
                  {ADJUSTMENT_ACTION_LABELS[action]}
                </label>
              ))}
            </div>
            {errors.timeEntryId && <p className={fieldErrorClass}>{errors.timeEntryId}</p>}
          </fieldset>
        )}

        {!entry && (
          <p className="text-sm text-[var(--muted)]">
            Use this when you forgot to clock in or out and an entry is missing.
          </p>
        )}

        {showTimes && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor={fieldId("start")} className={fieldLabelClass}>Correct start</label>
              <input
                id={fieldId("start")}
                type="datetime-local"
                className={fieldInputClass}
                value={form.proposedStart}
                onChange={(event) => update({ proposedStart: event.target.value })}
                aria-invalid={Boolean(errors.proposedStart)}
                aria-describedby={errors.proposedStart ? fieldId("start-error") : undefined}
                disabled={submitting}
                required
              />
              {errors.proposedStart && (
                <p id={fieldId("start-error")} className={fieldErrorClass}>{errors.proposedStart}</p>
              )}
            </div>
            <div className="min-w-0">
              <label htmlFor={fieldId("end")} className={fieldLabelClass}>Correct end</label>
              <input
                id={fieldId("end")}
                type="datetime-local"
                className={fieldInputClass}
                value={form.proposedEnd}
                onChange={(event) => update({ proposedEnd: event.target.value })}
                aria-invalid={Boolean(errors.proposedEnd)}
                aria-describedby={errors.proposedEnd ? fieldId("end-error") : undefined}
                disabled={submitting}
                required={form.action === "create"}
              />
              {errors.proposedEnd && (
                <p id={fieldId("end-error")} className={fieldErrorClass}>{errors.proposedEnd}</p>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor={fieldId("reason")} className={fieldLabelClass}>Reason</label>
          <textarea
            id={fieldId("reason")}
            rows={3}
            className={fieldTextareaClass}
            value={form.reason}
            onChange={(event) => update({ reason: event.target.value })}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? fieldId("reason-error") : fieldId("reason-help")}
            disabled={submitting}
            required
          />
          {errors.reason ? (
            <p id={fieldId("reason-error")} className={fieldErrorClass}>{errors.reason}</p>
          ) : (
            <p id={fieldId("reason-help")} className={fieldHelpClass}>
              For example: forgot to clock out after the client call.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Send request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
