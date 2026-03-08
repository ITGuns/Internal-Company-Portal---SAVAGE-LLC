/**
 * Modal for manually adding time entries
 */

import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { fetchUsers, type TaskUser } from "@/lib/tasks";
import { useUser } from "@/contexts/UserContext";

interface AddTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (startIso: string, endIso?: string, notes?: string, userId?: string) => Promise<boolean>;
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
  const { user } = useUser();
  const formattedRole = (user?.role?.toLowerCase() || "").trim().replace(/ /g, '_');
  const allowedEmails = ['genroujoshcatacutan25@gmail.com', 'daryldave018@gmail.com'];
  const isAdmin = formattedRole === 'admin' || allowedEmails.includes(user?.email?.toLowerCase() || '');

  const [manualDate, setManualDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
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
    if (isOpen && user && !selectedUserId) {
      setSelectedUserId(user.id.toString());
    }
  }, [isOpen, user, selectedUserId]);

  const validateTimeEntry = () => {
    const errors: Record<string, string> = {};
    if (isAdmin && !selectedUserId) {
      errors.userId = "Employee is required";
    }

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

    if (!manualOut) {
      errors.timeOut = "Time Out is required";
    } else if (manualIn) {
      const timeInDate = new Date(`${manualDate}T${manualIn}`);
      const timeOutDate = new Date(`${manualDate}T${manualOut}`);
      if (timeOutDate <= timeInDate) {
        errors.timeOut = "Time Out must be after Time In";
      }
    }

    if (!manualNotes.trim()) {
      errors.notes = "Notes are required";
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

      const success = await onSubmit(startIso, endIso, manualNotes, selectedUserId || undefined);

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
    setSelectedUserId(user?.id.toString() || "");
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
            disabled={!manualDate || !manualIn || !manualOut || !manualNotes.trim() || (isAdmin && !selectedUserId)}
          >
            Add Entry
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
            max={new Date().toISOString().slice(0, 10)}
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
            Notes <span className="text-red-500">*</span>
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
            placeholder="e.g. Overtime, client meeting..."
            className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${validationErrors.notes ? "border-red-500" : "border-[var(--border)]"}`}
            required
          />
          {validationErrors.notes && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.notes}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
