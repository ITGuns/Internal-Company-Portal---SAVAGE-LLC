"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import type { TaskUser } from "@/lib/tasks";
import { backfillHours } from "@/lib/time-entries";
import { PAYROLL_DATE_TIME_ZONE } from "@/lib/payroll-dates";
import {
  MAX_BACKFILL_SPAN_DAYS,
  backfillPreviewMessage,
  buildBackfillPayload,
  getBackfillDefaults,
  payrollTodayKey,
  validateBackfillForm,
  type BackfillForm,
  type BackfillFormErrors,
  type BackfillResult,
} from "@/lib/backfill-hours";
import {
  fieldErrorClass,
  fieldHelpClass,
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "./form-styles";

interface BackfillHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Employees the page already loaded for the audit filter. */
  people: TaskUser[];
  loadingPeople?: boolean;
  /** Preselects the employee whose calendar is open. */
  initialUserId?: string;
  /** Called after entries were created so the calendar refetches. */
  onCreated?: () => void;
}

function personLabel(person: TaskUser): string {
  return person.name || person.email;
}

/**
 * Backfill hours (payroll roles only): one entry per past day for time worked
 * before Deskii was in use. Preview runs the server in dry-run mode; nothing
 * is saved until "Create entries".
 */
export default function BackfillHoursModal({
  isOpen,
  onClose,
  people,
  loadingPeople = false,
  initialUserId,
  onCreated,
}: BackfillHoursModalProps) {
  const toast = useToast();
  const idPrefix = useId();
  const [todayKey, setTodayKey] = useState(() => payrollTodayKey(new Date(), PAYROLL_DATE_TIME_ZONE));
  const [form, setForm] = useState<BackfillForm>(() => getBackfillDefaults(todayKey));
  const [errors, setErrors] = useState<BackfillFormErrors>({});
  const [preview, setPreview] = useState<{ key: string; result: BackfillResult } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "create" | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const today = payrollTodayKey(new Date(), PAYROLL_DATE_TIME_ZONE);
    setTodayKey(today);
    setForm(getBackfillDefaults(today, initialUserId ?? ""));
    setErrors({});
    setPreview(null);
    setServerError(null);
  }, [isOpen, initialUserId]);

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => personLabel(a).localeCompare(personLabel(b))),
    [people],
  );
  const payloadKey = JSON.stringify(buildBackfillPayload(form, false));
  const currentPreview = preview?.key === payloadKey ? preview.result : null;
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  function update<K extends keyof BackfillForm>(field: K, value: BackfillForm[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setServerError(null);
  }

  function validate(): boolean {
    const result = validateBackfillForm(form, todayKey);
    setErrors(result);
    return Object.keys(result).length === 0;
  }

  async function handlePreview(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy || !validate()) return;
    setBusy("preview");
    setServerError(null);
    try {
      const result = await backfillHours(buildBackfillPayload(form, true));
      setPreview({ key: payloadKey, result });
    } catch (error) {
      setPreview(null);
      setServerError(error instanceof Error ? error.message : "Could not preview the backfill.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCreate() {
    if (busy || !currentPreview || currentPreview.days.length === 0 || !validate()) return;
    setBusy("create");
    setServerError(null);
    try {
      const result = await backfillHours(buildBackfillPayload(form, false));
      const person = sortedPeople.find((candidate) => String(candidate.id) === form.userId);
      const entries = `${result.created} ${result.created === 1 ? "entry" : "entries"}`;
      toast.success(person ? `Added ${entries} for ${personLabel(person)}.` : `Added ${entries}.`);
      onCreated?.();
      onClose();
    } catch (error) {
      setPreview(null);
      setServerError(error instanceof Error ? error.message : "Could not create the entries.");
    } finally {
      setBusy(null);
    }
  }

  const describedBy = (name: keyof BackfillForm, help?: string) =>
    errors[name] ? fieldId(`${name}-error`) : help;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Backfill hours"
      subtitle="Add the same hours to each past day, for time worked before Deskii was in use."
      size="md"
    >
      <form onSubmit={handlePreview} className="grid gap-4" noValidate>
        <div>
          <label htmlFor={fieldId("userId")} className={fieldLabelClass}>Employee</label>
          <select
            id={fieldId("userId")}
            className={fieldInputClass}
            value={form.userId}
            onChange={(event) => update("userId", event.target.value)}
            aria-invalid={Boolean(errors.userId)}
            aria-describedby={describedBy("userId")}
            disabled={loadingPeople || busy !== null}
            required
          >
            <option value="">{loadingPeople ? "Loading employees..." : "Choose an employee"}</option>
            {sortedPeople.map((person) => (
              <option key={person.id} value={String(person.id)}>{personLabel(person)}</option>
            ))}
          </select>
          {errors.userId && <p id={fieldId("userId-error")} className={fieldErrorClass}>{errors.userId}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fieldId("startDate")} className={fieldLabelClass}>From</label>
            <input
              id={fieldId("startDate")}
              type="date"
              className={fieldInputClass}
              value={form.startDate}
              max={todayKey}
              onChange={(event) => update("startDate", event.target.value)}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={describedBy("startDate")}
              disabled={busy !== null}
              required
            />
            {errors.startDate && <p id={fieldId("startDate-error")} className={fieldErrorClass}>{errors.startDate}</p>}
          </div>
          <div>
            <label htmlFor={fieldId("endDate")} className={fieldLabelClass}>To</label>
            <input
              id={fieldId("endDate")}
              type="date"
              className={fieldInputClass}
              value={form.endDate}
              max={todayKey}
              onChange={(event) => update("endDate", event.target.value)}
              aria-invalid={Boolean(errors.endDate)}
              aria-describedby={describedBy("endDate", fieldId("range-help"))}
              disabled={busy !== null}
              required
            />
            {errors.endDate && <p id={fieldId("endDate-error")} className={fieldErrorClass}>{errors.endDate}</p>}
          </div>
        </div>
        <p id={fieldId("range-help")} className={`${fieldHelpClass} -mt-2`}>
          Up to {MAX_BACKFILL_SPAN_DAYS} days after the start date. Days that already have any time entry are skipped, never merged.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fieldId("startTime")} className={fieldLabelClass}>Start time</label>
            <input
              id={fieldId("startTime")}
              type="time"
              className={fieldInputClass}
              value={form.startTime}
              onChange={(event) => update("startTime", event.target.value)}
              aria-invalid={Boolean(errors.startTime)}
              aria-describedby={describedBy("startTime", fieldId("time-help"))}
              disabled={busy !== null}
              required
            />
            {errors.startTime && <p id={fieldId("startTime-error")} className={fieldErrorClass}>{errors.startTime}</p>}
          </div>
          <div>
            <label htmlFor={fieldId("endTime")} className={fieldLabelClass}>End time</label>
            <input
              id={fieldId("endTime")}
              type="time"
              className={fieldInputClass}
              value={form.endTime}
              onChange={(event) => update("endTime", event.target.value)}
              aria-invalid={Boolean(errors.endTime)}
              aria-describedby={describedBy("endTime", fieldId("time-help"))}
              disabled={busy !== null}
              required
            />
            {errors.endTime && <p id={fieldId("endTime-error")} className={fieldErrorClass}>{errors.endTime}</p>}
          </div>
        </div>
        <p id={fieldId("time-help")} className={`${fieldHelpClass} -mt-2`}>
          Manila time, the payroll time zone. Both times are on the same day.
        </p>

        <label className="flex min-h-10 items-center gap-3 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={form.skipWeekends}
            onChange={(event) => update("skipWeekends", event.target.checked)}
            disabled={busy !== null}
          />
          Skip Saturdays and Sundays
        </label>

        <div>
          <label htmlFor={fieldId("notes")} className={fieldLabelClass}>
            Note <span className="font-normal text-[var(--muted)]">(optional)</span>
          </label>
          <textarea
            id={fieldId("notes")}
            rows={2}
            className={fieldTextareaClass}
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={describedBy("notes", fieldId("notes-help"))}
            disabled={busy !== null}
          />
          {errors.notes ? (
            <p id={fieldId("notes-error")} className={fieldErrorClass}>{errors.notes}</p>
          ) : (
            <p id={fieldId("notes-help")} className={fieldHelpClass}>
              Saved on every entry, followed by who backfilled it and when.
            </p>
          )}
        </div>

        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-2 text-sm"
        >
          {currentPreview ? (
            <span className="font-medium">{backfillPreviewMessage(currentPreview)}</span>
          ) : (
            <span className="text-[var(--muted)]">Preview first. Nothing is saved until you choose Create entries.</span>
          )}
        </div>
        {serverError && (
          <p role="alert" className={fieldErrorClass}>{serverError}</p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy !== null}>
            Cancel
          </Button>
          <Button type="submit" variant="outline" loading={busy === "preview"} disabled={busy === "create"}>
            Preview
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleCreate}
            loading={busy === "create"}
            disabled={busy === "preview" || !currentPreview || currentPreview.days.length === 0}
          >
            Create entries
          </Button>
        </div>
      </form>
    </Modal>
  );
}
