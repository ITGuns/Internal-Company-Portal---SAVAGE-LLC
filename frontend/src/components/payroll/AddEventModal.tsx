/**
 * Modal for adding or editing payroll events
 */

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit2 } from "lucide-react";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import type { PayrollEventType } from "@/lib/payroll-events";

interface EditingEvent {
  id: string;
  title: string;
  date: string;
  type: PayrollEventType;
  description?: string;
}

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEvent?: EditingEvent | null;
  onSubmit: (
    title: string,
    date: string,
    type: PayrollEventType,
    description?: string
  ) => Promise<boolean>;
  onSuccess?: () => void;
  onError?: () => void;
}

export default function AddEventModal({
  isOpen,
  onClose,
  editingEvent,
  onSubmit,
  onSuccess,
  onError,
}: AddEventModalProps) {
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [eventType, setEventType] = useState<PayrollEventType>("payday");
  const [eventDescription, setEventDescription] = useState("");
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setEventTitle("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setEventType("payday");
    setEventDescription("");
    setEventErrors({});
  }, []);

  // Update form when editingEvent changes
  useEffect(() => {
    if (editingEvent) {
      setEventTitle(editingEvent.title || "");
      setEventDate(editingEvent.date || new Date().toISOString().slice(0, 10));
      setEventType(editingEvent.type || "payday");
      setEventDescription(editingEvent.description || "");
      setEventErrors({});
    } else {
      resetForm();
    }
  }, [editingEvent, resetForm]);

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!eventTitle.trim()) errors.title = "Title is required";
    if (!eventDate) errors.date = "Date is required";
    if (!eventDescription.trim()) errors.description = "Description is required";
    setEventErrors(errors);
    if (Object.keys(errors).length) return;

    const success = await onSubmit(
      eventTitle.trim(),
      eventDate,
      eventType,
      eventDescription.trim()
    );

    if (success) {
      handleClose();
      onSuccess?.();
    } else {
      onError?.();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingEvent ? "Edit Event" : "Add Event"}
      subtitle={
        editingEvent
          ? "Update event details"
          : "Add a custom event to the payroll calendar"
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="success"
            icon={
              editingEvent ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )
            }
            onClick={handleSubmit}
            disabled={!eventTitle.trim() || !eventDate || !eventDescription.trim()}
          >
            {editingEvent ? "Save Changes" : "Add Event"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="event-title"
            className="block text-sm font-medium text-[var(--foreground)] mb-1"
          >
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            id="event-title"
            type="text"
            value={eventTitle}
            onChange={(e) => {
              setEventTitle(e.target.value);
              if (eventErrors.title)
                setEventErrors((prev) => ({ ...prev, title: "" }));
            }}
            placeholder="e.g. Team Meeting, Bonus Payout..."
            className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${eventErrors.title ? "border-red-500" : "border-[var(--border)]"
              }`}
            required
          />
          {eventErrors.title && (
            <p className="text-red-500 text-xs mt-1">{eventErrors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="event-date"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                if (eventErrors.date)
                  setEventErrors((prev) => ({ ...prev, date: "" }));
              }}
              className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] [color-scheme:light] dark:[color-scheme:dark] ${eventErrors.date ? "border-red-500" : "border-[var(--border)]"
                }`}
              required
            />
            {eventErrors.date && (
              <p className="text-red-500 text-xs mt-1">{eventErrors.date}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="event-type"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value as PayrollEventType)}
              className="w-full border border-[var(--border)] rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] [color-scheme:light] dark:[color-scheme:dark]"
              required
            >
              <option value="payday">Pay Day</option>
              <option value="holiday">Holiday</option>
              <option value="deadline">Deadline</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="event-desc"
            className="block text-sm font-medium text-[var(--foreground)] mb-1"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="event-desc"
            value={eventDescription}
            onChange={(e) => {
              setEventDescription(e.target.value);
              if (eventErrors.description)
                setEventErrors((prev) => ({ ...prev, description: "" }));
            }}
            placeholder="Add event details..."
            rows={3}
            className={`w-full border rounded px-3 py-2 bg-[var(--card-bg)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none ${eventErrors.description ? "border-red-500" : "border-[var(--border)]"
              }`}
            required
          />
          {eventErrors.description && (
            <p className="text-red-500 text-xs mt-1">{eventErrors.description}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
