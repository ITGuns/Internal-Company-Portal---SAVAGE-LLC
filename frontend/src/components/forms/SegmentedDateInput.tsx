"use client";

import React from "react";

interface SegmentedDateInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function getDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return {
    day: match?.[3] || "",
    month: match?.[2] || "",
    year: match?.[1] || "",
  };
}

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function isValidDateParts(day: string, month: string, year: string) {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return false;
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  return (
    date.getUTCFullYear() === yearNumber &&
    date.getUTCMonth() === monthNumber - 1 &&
    date.getUTCDate() === dayNumber
  );
}

export default function SegmentedDateInput({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  helperText,
  icon: Icon,
}: SegmentedDateInputProps) {
  const [parts, setParts] = React.useState(() => getDateParts(value));
  const dayRef = React.useRef<HTMLInputElement>(null);
  const monthRef = React.useRef<HTMLInputElement>(null);
  const yearRef = React.useRef<HTMLInputElement>(null);
  const errorId = `${id}-error`;
  const helperTextId = `${id}-helper`;

  React.useEffect(() => {
    setParts(getDateParts(value));
  }, [value]);

  function commit(nextParts: typeof parts) {
    if (!nextParts.day && !nextParts.month && !nextParts.year) {
      onChange("");
      return;
    }

    if (isValidDateParts(nextParts.day, nextParts.month, nextParts.year)) {
      onChange(`${nextParts.year}-${nextParts.month}-${nextParts.day}`);
    }
  }

  function updatePart(part: keyof typeof parts, rawValue: string) {
    const maxLength = part === "year" ? 4 : 2;
    const nextValue = normalizeDigits(rawValue, maxLength);
    const nextParts = { ...parts, [part]: nextValue };
    setParts(nextParts);
    commit(nextParts);

    if (part === "day" && nextValue.length === 2) {
      monthRef.current?.focus();
    }
    if (part === "month" && nextValue.length === 2) {
      yearRef.current?.focus();
    }
  }

  function handleBackspace(part: keyof typeof parts, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") return;
    if (part === "month" && !parts.month) dayRef.current?.focus();
    if (part === "year" && !parts.year) monthRef.current?.focus();
  }

  return (
    <div>
      <label htmlFor={`${id}-day`} className="mb-2 block text-sm font-medium text-[var(--foreground)]">
        <span className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
      </label>
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.4fr)] items-center rounded-md border bg-[var(--card-bg)] px-2 py-1 text-[var(--foreground)] focus-within:ring-2 ${
          error
            ? "border-red-500 focus-within:ring-red-500"
            : "border-[var(--border)] focus-within:ring-[var(--accent)]"
        }`}
      >
        <input
          ref={dayRef}
          id={`${id}-day`}
          value={parts.day}
          onChange={(event) => updatePart("day", event.target.value)}
          onKeyDown={(event) => handleBackspace("day", event)}
          placeholder="DD"
          inputMode="numeric"
          autoComplete="bday-day"
          aria-label={`${label} day`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : helperText ? helperTextId : undefined}
          className="min-h-8 min-w-0 w-full bg-transparent px-1 text-center text-sm outline-none"
        />
        <span className="text-[var(--muted)]">/</span>
        <input
          ref={monthRef}
          value={parts.month}
          onChange={(event) => updatePart("month", event.target.value)}
          onKeyDown={(event) => handleBackspace("month", event)}
          placeholder="MM"
          inputMode="numeric"
          autoComplete="bday-month"
          aria-label={`${label} month`}
          aria-invalid={error ? "true" : "false"}
          className="min-h-8 min-w-0 w-full bg-transparent px-1 text-center text-sm outline-none"
        />
        <span className="text-[var(--muted)]">/</span>
        <input
          ref={yearRef}
          value={parts.year}
          onChange={(event) => updatePart("year", event.target.value)}
          onKeyDown={(event) => handleBackspace("year", event)}
          placeholder="YYYY"
          inputMode="numeric"
          autoComplete="bday-year"
          aria-label={`${label} year`}
          aria-invalid={error ? "true" : "false"}
          className="min-h-8 min-w-0 w-full bg-transparent px-1 text-center text-sm outline-none"
        />
      </div>
      {helperText && !error ? (
        <p id={helperTextId} className="mt-1 text-xs text-[var(--muted)]">
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-500" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
