/**
 * Modal for manually adding time entries
 */

import React, { useState, useEffect } from "react";
import { Plus, Save } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { fetchUsers, type TaskUser } from "@/lib/tasks";
import type { TimeEntry } from "@/lib/time-entries";
import {
  buildTimeEntryPayload,
  getTimeEntryFormDefaults,
  getTodayDateInput,
  validateTimeEntryForm,
} from "@/lib/payroll-calendar/time-entry-form";
import { useUser } from "@/contexts/UserContext";
import { hasManagementAccess } from "@/lib/role-access";

interface AddTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startIso: string, endIso?: string, notes?: string, userId?: string) => Promise<boolean>;
  onSuccess?: () => void;
  onError?: () => void;
  initialUserId?: string;
  initialDate?: string;
  mode?: "create" | "edit";
  editingEntry?: TimeEntry | null;
  auditContextLabel?: string;
}

export default function AddTimeEntryModal({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
  onError,
  initialUserId,
  initialDate,
  mode = "create",
  editingEntry,
  auditContextLabel,
}: AddTimeEntryModalProps) {
  const { user } = useUser();
  const isAdmin = hasManagementAccess(user);
  const fallbackUserId = user?.id != null ? user.id.toString() : undefined;
  const isEditMode = mode === "edit" && Boolean(editingEntry);

  const [manualDate, setManualDate] = useState<string>(getTodayDateInput());
  const [manualIn, setManualIn] = useState<string>("09:00");
  const [manualOut, setManualOut] = useState<string>("17:00");
  const [manualNotes, setManualNotes] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (isOpen && isAdmin && users.length === 0) {
      setIsLoadingUsers(true);
      fetchUsers().then(data => {
        setUsers(data as TaskUser[]);
        setIsLoadingUsers(false);
      });
    }
  }, [isOpen, isAdmin, users.length]);

  useEffect(() => {
    if (isOpen) {
      const defaults = getTimeEntryFormDefaults({
        entry: isEditMode ? editingEntry : null,
        initialDate,
        initialUserId,
        fallbackUserId,
      });

      setManualDate(defaults.manualDate);
      setManualIn(defaults.manualIn);
      setManualOut(defaults.manualOut);
      setManualNotes(defaults.manualNotes);
      setSelectedUserId(defaults.selectedUserId);
      setValidationErrors({});
    }
  }, [isOpen, isEditMode, editingEntry, initialDate, initialUserId, fallbackUserId]);

  const validateTimeEntry = () => {
    const errors = validateTimeEntryForm({
      manualDate,
      manualIn,
      manualOut,
      manualNotes,
      selectedUserId,
      isPrivilegedUser: isAdmin,
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateTimeEntry()) {
      return;
    }

    try {
      const { startIso, endIso, notes, userId } = buildTimeEntryPayload({
        manualDate,
        manualIn,
        manualOut,
        manualNotes,
        selectedUserId,
      });

      const success = await onSubmit(startIso, endIso, notes, userId);

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
    const defaults = getTimeEntryFormDefaults({
      initialDate,
      initialUserId,
      fallbackUserId,
    });
    setManualDate(defaults.manualDate);
    setManualIn(defaults.manualIn);
    setManualOut(defaults.manualOut);
    setManualNotes(defaults.manualNotes);
    setSelectedUserId(defaults.selectedUserId);
    setValidationErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Edit Time Entry" : "Add Time Entry"}
      subtitle={isEditMode ? "Update the selected work period and notes" : "Manually add a time entry for a specific date"}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            icon={isEditMode ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={!manualDate || !manualIn || !manualOut || !manualNotes.trim() || (isAdmin && !selectedUserId)}
          >
            {isEditMode ? "Save Changes" : "Add Entry"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isAdmin && (
          <div>
            <label
              htmlFor="user-select"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                if (validationErrors.userId) {
                  setValidationErrors((prev) => ({ ...prev, userId: "" }));
                }
              }}
              className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${validationErrors.userId ? "border-red-500" : "border-[var(--border)]"}`}
              disabled={isLoadingUsers}
              required
            >
              <option value="">Select an employee</option>
              {users.map((u: TaskUser) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
            {validationErrors.userId && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.userId}</p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="manual-date"
            className="block text-sm font-medium text-[var(--foreground)] mb-1"
          >
            Date <span className="text-red-500">*</span>
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
            max={getTodayDateInput()}
            className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer dark:[&::-webkit-calendar-picker-indicator]:filter dark:[&::-webkit-calendar-picker-indicator]:invert-[1] dark:[&::-webkit-calendar-picker-indicator]:brightness-[1.5] ${validationErrors.date
              ? "border-red-500"
              : "border-[var(--border)]"
              }`}
            required
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
              Time In <span className="text-red-500">*</span>
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
              className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${validationErrors.timeIn
                ? "border-red-500"
                : "border-[var(--border)]"
                }`}
              required
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
              Time Out <span className="text-red-500">*</span>
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
              className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${validationErrors.timeOut
                ? "border-red-500"
                : "border-[var(--border)]"
                }`}
              required
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
            {auditContextLabel ? "Correction reason / notes" : "Notes"} <span className="text-red-500">*</span>
          </label>
          <input
            id="manual-notes"
            type="text"
            value={manualNotes}
            onChange={(e) => {
              setManualNotes(e.target.value);
              if (validationErrors.notes) {
                setValidationErrors((prev) => ({ ...prev, notes: "" }));
              }
            }}
            placeholder={auditContextLabel ? "Reason for manager correction..." : "e.g. Overtime, client meeting..."}
            className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${validationErrors.notes ? "border-red-500" : "border-[var(--border)]"}`}
            required
          />
          {auditContextLabel && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Manager edit for {auditContextLabel}. Include the correction reason for payroll review.
            </p>
          )}
          {validationErrors.notes && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.notes}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
