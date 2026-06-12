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
  readOnly?: boolean;
  helperText?: string;
}

const inputBaseClass = "w-full rounded-md border bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2";

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
  readOnly = false,
  helperText,
}: ProfileFormInputProps) {
  const errorId = `${id}-error`;
  const helperTextId = `${id}-helper`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[var(--foreground)]">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
        className={`${inputBaseClass} ${readOnly ? "cursor-not-allowed opacity-80" : ""} ${error ? "border-red-500 focus:ring-red-500" : "border-[var(--border)] focus:ring-[var(--accent)]"}`}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        spellCheck={type === "email" ? false : undefined}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : helperText ? helperTextId : undefined}
        required={required}
      />
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
