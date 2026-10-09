"use client";

import React, { useEffect, useId, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { createOvertimeRequest } from "@/lib/overtime-requests";
import { validateOvertimeRequestForm, type OvertimeRequestForm } from "@/lib/time-requests";
import { getLocalDateString } from "@/lib/payroll-calendar/utils";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "./form-styles";

interface OvertimeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** YYYY-MM-DD */
  workDate: string | null;
  /** Hours above the daily cap for that day. */
  maxHours: number;
  capHours: number;
  onSubmitted?: () => void;
}

type FormErrors = Partial<Record<keyof OvertimeRequestForm, string>>;

export default function OvertimeRequestModal({
  isOpen,
  onClose,
  workDate,
  maxHours,
  capHours,
  onSubmitted,
}: OvertimeRequestModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [form, setForm] = useState<OvertimeRequestForm>({ workDate: "", hours: "", reason: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ workDate: workDate || "", hours: maxHours > 0 ? String(maxHours) : "", reason: "" });
      setErrors({});
    }
  }, [isOpen, workDate, maxHours]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateOvertimeRequestForm(form, {
      maxHours,
      today: getLocalDateString(new Date()),
    });
    setErrors(result.errors);
    if (!result.valid) return;

    setSubmitting(true);
    try {
      await createOvertimeRequest({
        workDate: form.workDate,
        hours: Number(form.hours),
        reason: form.reason,
      });
      toast.success("Overtime request sent for review.");
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the overtime request.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const dayLabel = workDate
    ? new Date(`${workDate}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request overtime"
      subtitle="Overtime is paid only after a manager or payroll reviewer approves it."
      size="md"
    >
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm">
          <div className="text-xs text-[var(--muted)]">Day</div>
          <div className="font-medium">{dayLabel || "No day selected"}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Your daily cap is {capHours} h. You can still claim {maxHours} h for this day.
          </div>
          {errors.workDate && <p className={fieldErrorClass}>{errors.workDate}</p>}
        </div>

        <div>
          <label htmlFor={fieldId("hours")} className={fieldLabelClass}>Overtime hours</label>
          <input
            id={fieldId("hours")}
            type="number"
            inputMode="decimal"
            min="0.25"
            max={maxHours || undefined}
            step="0.25"
            className={fieldInputClass}
            value={form.hours}
            onChange={(event) => setForm((previous) => ({ ...previous, hours: event.target.value }))}
            aria-invalid={Boolean(errors.hours)}
            aria-describedby={errors.hours ? fieldId("hours-error") : fieldId("hours-help")}
            disabled={submitting}
            required
          />
          {errors.hours ? (
            <p id={fieldId("hours-error")} className={fieldErrorClass}>{errors.hours}</p>
          ) : (
            <p id={fieldId("hours-help")} className={fieldHelpClass}>
              Up to {maxHours} h for this day.
            </p>
          )}
        </div>

        <div>
          <label htmlFor={fieldId("reason")} className={fieldLabelClass}>
            Reason <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <textarea
            id={fieldId("reason")}
            rows={3}
            className={fieldTextareaClass}
            value={form.reason}
            onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? fieldId("reason-error") : undefined}
            disabled={submitting}
          />
          {errors.reason && <p id={fieldId("reason-error")} className={fieldErrorClass}>{errors.reason}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={maxHours <= 0}>
            Send request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
