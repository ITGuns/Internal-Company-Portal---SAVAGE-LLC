import { manilaDayKey, manilaInstant, manilaTimeInput, manilaTodayKey } from "../payroll-dates";

/**
 * The manual entry form works in Manila wall-clock time (the payroll zone):
 * the date and times a payroll user types are Manila day and time whatever
 * the browser zone is, and an edited entry shows its Manila times.
 */

interface TimeEntryFormEntry {
  id: string;
  userId?: string;
  start: string;
  end?: string;
  notes?: string;
}

interface GetTimeEntryFormDefaultsParams {
  entry?: TimeEntryFormEntry | null;
  initialDate?: string;
  initialUserId?: string;
  fallbackUserId?: string;
}

export interface TimeEntryFormValues {
  manualDate: string;
  manualIn: string;
  manualOut: string;
  manualNotes: string;
  selectedUserId: string;
}

interface ValidateTimeEntryFormParams extends TimeEntryFormValues {
  isPrivilegedUser: boolean;
  todayDate?: string;
}

function toDateInput(value?: string): string {
  return manilaDayKey(value) ?? manilaTodayKey();
}

function toTimeInput(value?: string, fallback = "09:00"): string {
  return manilaTimeInput(value) ?? fallback;
}

export function getTodayDateInput(now: Date = new Date()): string {
  return manilaTodayKey(now);
}

export function getTimeEntryFormDefaults({
  entry,
  initialDate,
  initialUserId,
  fallbackUserId,
}: GetTimeEntryFormDefaultsParams): TimeEntryFormValues {
  return {
    manualDate: entry ? toDateInput(entry.start) : toDateInput(initialDate),
    manualIn: entry ? toTimeInput(entry.start) : "09:00",
    manualOut: entry ? toTimeInput(entry.end, "") : "17:00",
    manualNotes: entry?.notes || "",
    selectedUserId: entry?.userId || initialUserId || fallbackUserId || "",
  };
}

export function validateTimeEntryForm({
  manualDate,
  manualIn,
  manualOut,
  manualNotes,
  selectedUserId,
  isPrivilegedUser,
  todayDate = getTodayDateInput(),
}: ValidateTimeEntryFormParams): Record<string, string> {
  const errors: Record<string, string> = {};

  if (isPrivilegedUser && !selectedUserId) {
    errors.userId = "Employee is required";
  }

  if (!manualDate) {
    errors.date = "Date is required";
  } else if (manualDate > todayDate) {
    errors.date = "Date cannot be in the future";
  }

  if (!manualIn) {
    errors.timeIn = "Time In is required";
  }

  if (!manualOut) {
    errors.timeOut = "Time Out is required";
  } else if (manualIn && manualOut <= manualIn) {
    // Zero-padded 24 hour "HH:mm" values (input type="time") sort as text.
    errors.timeOut = "Time Out must be after Time In";
  }

  if (!manualNotes.trim()) {
    errors.notes = "Notes are required";
  }

  return errors;
}

/** Throws on an invalid date or time; the modal shows that as a form error. */
export function buildTimeEntryPayload(values: TimeEntryFormValues): {
  startIso: string;
  endIso?: string;
  notes: string;
  userId?: string;
} {
  const startIso = manilaInstant(values.manualDate, values.manualIn);
  const endIso = values.manualOut ? manilaInstant(values.manualDate, values.manualOut) : undefined;
  if (!startIso || endIso === null) throw new Error("Invalid date or time");
  return {
    startIso,
    endIso,
    notes: values.manualNotes.trim(),
    userId: values.selectedUserId || undefined,
  };
}
