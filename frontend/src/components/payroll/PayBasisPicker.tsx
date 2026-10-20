"use client";

import React from "react";
import { PAY_BASIS_OPTIONS } from "@/lib/pay-basis";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

interface PayBasisPickerProps {
  payBasis: string;
  hourlyRate: string;
  currency: string;
  hourlyRateError?: string;
  disabled?: boolean;
  onChange: (field: "payBasis" | "hourlyRate", value: string) => void;
}

/** Left column of Set Up Payroll: the three pay basis cards and, for hourly rate, the rate. */
export default function PayBasisPicker({ payBasis, hourlyRate, currency, hourlyRateError, disabled, onChange }: PayBasisPickerProps) {
  return (
    <div className="space-y-4">
      <fieldset disabled={disabled}>
        <legend className={fieldLabelClass}>
          Pay basis <span className="text-red-500" aria-hidden="true">*</span>
        </legend>
        <div className="space-y-2">
          {PAY_BASIS_OPTIONS.map((option) => {
            const selected = payBasis === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors duration-150 ${selected
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--accent)]/60"
                  }`}
              >
                <input
                  type="radio"
                  name="payroll-pay-basis"
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange("payBasis", option.value)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--foreground)]">{option.label}</span>
                  <span className="block text-xs text-[var(--muted)]">{option.help}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {payBasis === "hourly_rate" && (
        <div>
          <label htmlFor="payroll-hourly-rate" className={fieldLabelClass}>
            Hourly rate <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="payroll-hourly-rate"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0.00"
            value={hourlyRate}
            disabled={disabled}
            onChange={(event) => onChange("hourlyRate", event.target.value)}
            className={`${fieldInputClass} font-mono tabular-nums`}
            aria-invalid={Boolean(hourlyRateError)}
            aria-describedby="payroll-hourly-rate-help"
          />
          <p id="payroll-hourly-rate-help" className={hourlyRateError ? fieldErrorClass : fieldHelpClass} aria-live="polite">
            {hourlyRateError ?? `Paid per credited hour in ${currency}.`}
          </p>
        </div>
      )}
    </div>
  );
}
