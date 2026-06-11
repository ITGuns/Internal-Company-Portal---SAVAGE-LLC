"use client";

import React from "react";
import { ChevronDown, Phone } from "lucide-react";
import { useEscapeToClose } from "@/hooks/useEscapeToClose";
import { COUNTRY_CALLING_CODES } from "@/lib/country-calling-codes";
import {
  formatPhoneWithCountryCode,
  getPhoneCountryCallingCode,
  getPhoneLocalNumber,
  sanitizeCountryCallingCode,
} from "@/lib/phone-number";

interface ProfilePhoneInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export default function ProfilePhoneInput({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
}: ProfilePhoneInputProps) {
  const [isPickerOpen, setIsPickerOpen] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const errorId = `${id}-error`;
  const countryCodeId = `${id}-country-code`;
  const localNumberId = `${id}-local-number`;
  const countryCallingCode = getPhoneCountryCallingCode(value);
  const localNumber = getPhoneLocalNumber(value, countryCallingCode);
  const normalizedQuery = countryCallingCode.toLowerCase();
  const matchingPresets = COUNTRY_CALLING_CODES.filter((option) =>
    option.callingCode.includes(normalizedQuery) ||
    option.country.toLowerCase().includes(normalizedQuery) ||
    option.iso2.toLowerCase().includes(normalizedQuery),
  );
  const closePicker = React.useCallback(() => setIsPickerOpen(false), []);

  useEscapeToClose({ isOpen: isPickerOpen, onClose: closePicker });

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleCountryCodeChange(nextValue: string) {
    const nextCountryCode = sanitizeCountryCallingCode(nextValue);
    onChange(formatPhoneWithCountryCode(nextCountryCode, localNumber));
    setIsPickerOpen(true);
  }

  function handleLocalNumberChange(nextValue: string) {
    onChange(formatPhoneWithCountryCode(countryCallingCode, nextValue));
  }

  function selectCountryCode(nextCountryCode: string) {
    onChange(formatPhoneWithCountryCode(nextCountryCode, localNumber));
    setIsPickerOpen(false);
  }

  return (
    <div>
      <label htmlFor={localNumberId} className="mb-2 block text-sm font-medium text-[var(--foreground)]">
        <span className="flex items-center gap-2">
          <Phone className="h-4 w-4" aria-hidden="true" />
          {label} {required ? <span className="text-red-500">*</span> : null}
        </span>
      </label>

      <div className="grid grid-cols-[minmax(7.5rem,0.75fr)_minmax(0,1.25fr)] gap-2">
        <div ref={pickerRef} className="relative">
          <label htmlFor={countryCodeId} className="sr-only">
            Country calling code
          </label>
          <div
            className={`flex min-h-10 items-center rounded-md border bg-[var(--card-bg)] text-sm text-[var(--foreground)] focus-within:ring-2 ${
              error ? "border-red-500 focus-within:ring-red-500" : "border-[var(--border)] focus-within:ring-[var(--accent)]"
            }`}
          >
            <input
              id={countryCodeId}
              value={countryCallingCode}
              onFocus={() => setIsPickerOpen(true)}
              onChange={(event) => handleCountryCodeChange(event.target.value)}
              className="min-h-10 min-w-0 flex-1 rounded-l-md bg-transparent px-3 py-2 outline-none"
              inputMode="tel"
              autoComplete="tel-country-code"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? errorId : undefined}
              placeholder="+1"
            />
            <button
              type="button"
              onClick={() => setIsPickerOpen((current) => !current)}
              className="flex h-10 w-9 shrink-0 items-center justify-center rounded-r-md text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
              aria-label="Show country code presets"
              aria-expanded={isPickerOpen}
              aria-controls={`${id}-country-code-menu`}
            >
              <ChevronDown className={`h-4 w-4 transition ${isPickerOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          </div>

          {isPickerOpen ? (
            <div
              id={`${id}-country-code-menu`}
              className="absolute left-0 top-full z-40 mt-2 max-h-52 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-1 shadow-xl"
            >
              {(matchingPresets.length > 0 ? matchingPresets : COUNTRY_CALLING_CODES).map((option) => (
                <button
                  key={`${option.iso2}-${option.callingCode}`}
                  type="button"
                  onClick={() => selectCountryCode(option.callingCode)}
                  className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
                >
                  <span className="font-semibold">{option.callingCode}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--muted)]">
                    {option.country} ({option.iso2})
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <input
          id={localNumberId}
          name={id}
          type="tel"
          value={localNumber}
          onChange={(event) => handleLocalNumberChange(event.target.value)}
          className={`min-h-10 min-w-0 rounded-md border bg-[var(--card-bg)] px-3 py-2 text-[var(--foreground)] outline-none focus:ring-2 ${
            error ? "border-red-500 focus:ring-red-500" : "border-[var(--border)] focus:ring-[var(--accent)]"
          }`}
          placeholder="Phone number"
          autoComplete="tel-national"
          inputMode="tel"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          required={required}
        />
      </div>

      <p className="mt-1 text-xs text-[var(--muted)]">Preset or custom country code.</p>

      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-500" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
