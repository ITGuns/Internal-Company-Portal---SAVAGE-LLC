"use client";

import React from "react";

interface ProfileFormInputProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
}

const inputBaseClass = "w-full rounded-md border bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 transition-colors";

export default function ProfileFormInput({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  required = false,
}: ProfileFormInputProps) {
  const errorId = `${id}-error`;
  const isDate = type === "date";

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[var(--foreground)]">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
      </label>

      {isDate ? (
        <div className="relative">
          <input
            id={id}
            name={id}
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className={`${inputBaseClass} pr-10 [color-scheme:light] dark:[color-scheme:dark] ${
              error ? "border-red-500 focus:ring-red-500" : "border-[var(--border)] focus:ring-[var(--accent)]"
            }`}
            autoComplete={autoComplete}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : undefined}
            required={required}
          />
          {value && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--accent)] bg-[var(--card-bg)] px-1 rounded">
              {new Date(value + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputBaseClass} ${error ? "border-red-500 focus:ring-red-500" : "border-[var(--border)] focus:ring-[var(--accent)]"}`}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          spellCheck={type === "email" ? false : undefined}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          required={required}
        />
      )}

      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-500" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
