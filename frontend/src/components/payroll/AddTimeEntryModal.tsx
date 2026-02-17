/**
 * Modal for manually adding time entries
 */

import React, { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";

interface AddTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startIso: string, endIso?: string, notes?: string) => Promise<boolean>;
  onSuccess?: () => void;
  onError?: () => void;
}

export default function AddTimeEntryModal({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
  onError,
}: AddTimeEntryModalProps) {
  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [manualIn, setManualIn] = useState<string>("09:00");
  const [manualOut, setManualOut] = useState<string>("17:00");
  const [manualNotes, setManualNotes] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateTimeEntry = () => {
    const errors: Record<string, string> = {};

    if (!manualDate) {
      errors.date = "Date is required";
    } else {
      const entryDate = new Date(manualDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (entryDate > today) {
        errors.date = "Date cannot be in the future";
      }
    }

    if (!manualIn) {
      errors.timeIn = "Time In is required";
    }

    if (manualOut && manualIn) {
      const timeInDate = new Date(`${manualDate}T${manualIn}`);
      const timeOutDate = new Date(`${manualDate}T${manualOut}`);
      if (timeOutDate <= timeInDate) {
        errors.timeOut = "Time Out must be after Time In";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateTimeEntry()) {
      return;
    }

    try {
      const startIso = new Date(`${manualDate}T${manualIn}`).toISOString();
      const endIso = manualOut
        ? new Date(`${manualDate}T${manualOut}`).toISOString()
        : undefined;

      const success = await onSubmit(startIso, endIso, manualNotes);

      if (success) {
        handleClose();
        onSuccess?.();
      } else {
        onError?.();
      }
    } catch {
      setValidationErrors({ submit: "Invalid date or time format" });
      onError?.();
    }
  };

  const handleClose = () => {
    setManualDate(new Date().toISOString().slice(0, 10));
    setManualIn("09:00");
    setManualOut("17:00");
    setManualNotes("");
    setValidationErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Time Entry"
      subtitle="Manually add a time entry for a specific date"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={!manualDate || !manualIn}
          >
            Add Entry
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="manual-date"
            className="block text-sm font-medium text-[var(--foreground)] mb-1"
          >
            Date
          </label>
          <input
            id="manual-date"
            type="date"
            value={manualDate}
            onChange={(e) => {
              setManualDate(e.target.value);
              if (validationErrors.date) {
                setValidationErrors((prev) => ({ ...prev, date: "" }));
              }
            }}
            max={new Date().toISOString().slice(0, 10)}
            className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert-[1] dark:[&::-webkit-calendar-picker-indicator]:brightness-[1.5] ${
              validationErrors.date
                ? "border-red-500"
                : "border-[var(--border)]"
            }`}
          />
          {validationErrors.date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="manual-in"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Time In
            </label>
            <input
              id="manual-in"
              type="time"
              value={manualIn}
              onChange={(e) => {
                setManualIn(e.target.value);
                if (validationErrors.timeIn) {
                  setValidationErrors((prev) => ({ ...prev, timeIn: "" }));
                }
              }}
              className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                validationErrors.timeIn
                  ? "border-red-500"
                  : "border-[var(--border)]"
              }`}
            />
            {validationErrors.timeIn && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.timeIn}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="manual-out"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Time Out
            </label>
            <input
              id="manual-out"
              type="time"
              value={manualOut}
              onChange={(e) => {
                setManualOut(e.target.value);
                if (validationErrors.timeOut) {
                  setValidationErrors((prev) => ({ ...prev, timeOut: "" }));
                }
              }}
              className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                validationErrors.timeOut
                  ? "border-red-500"
                  : "border-[var(--border)]"
              }`}
            />
            {validationErrors.timeOut && (
              <p className="text-red-500 text-xs mt-1">
                {validationErrors.timeOut}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="manual-notes"
            className="block text-sm font-medium text-[var(--foreground)] mb-1"
          >
            Notes{" "}
            <span className="text-[var(--muted)] font-normal">(optional)</span>
          </label>
          <input
            id="manual-notes"
            type="text"
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="e.g. Overtime, client meeting..."
            className="w-full border border-[var(--border)] rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>
    </Modal>
  );
}
