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
  if (!value) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function toTimeInput(value?: string, fallback = "09:00"): string {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

export function getTodayDateInput(): string {
  return toDateInput(new Date().toISOString());
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

  return errors;
}

export function buildTimeEntryPayload(values: TimeEntryFormValues): {
  startIso: string;
  endIso?: string;
  notes: string;
  userId?: string;
} {
  return {
    startIso: new Date(`${values.manualDate}T${values.manualIn}`).toISOString(),
    endIso: values.manualOut
      ? new Date(`${values.manualDate}T${values.manualOut}`).toISOString()
      : undefined,
    notes: values.manualNotes.trim(),
    userId: values.selectedUserId || undefined,
  };
}
