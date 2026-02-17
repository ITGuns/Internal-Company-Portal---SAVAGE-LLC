"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface FormFieldProps {
  /** Unique identifier for the input */
  id: string;
  /** Field label text */
  label: string;
  /** Input type (text, email, password, date, number, etc.) */
  type?: string;
  /** Current value */
  value: string | number;
  /** Change handler */
  onChange: (value: string) => void;
  /** Optional error message */
  error?: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional icon to display with label */
  icon?: LucideIcon;
  /** Optional helper text */
  helperText?: string;
  /** Additional CSS classes for the input */
  className?: string;
  /** Minimum value (for number/date inputs) */
  min?: string | number;
  /** Maximum value (for number/date inputs) */
  max?: string | number;
  /** Step value (for number inputs) */
  step?: string | number;
  /** Autocomplete attribute */
  autoComplete?: string;
  /** Input mode for mobile keyboards */
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url';
}

/**
 * Reusable form field component with consistent styling
 * Replaces repeated label + input + error patterns across the app
 */
export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  icon: Icon,
  helperText,
  className = '',
  min,
  max,
  step,
  autoComplete,
  inputMode,
}: FormFieldProps) {
  return (
    <div className="w-full">
      {/* Label */}
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[var(--foreground)] mb-2"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>
      </label>

      {/* Input */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`
          w-full px-3 py-2 rounded-md border
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-[var(--border)] focus:ring-[var(--accent)]'
          }
          bg-[var(--card-bg)] text-[var(--foreground)]
          focus:outline-none focus:ring-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
      />

      {/* Helper Text */}
      {helperText && !error && (
        <p id={`${id}-helper`} className="mt-1 text-sm text-[var(--muted)]">
          {helperText}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
