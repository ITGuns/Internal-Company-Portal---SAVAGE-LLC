"use client";

import React from "react";
import {
  describeScheme,
  findScheme,
  selectableOptions,
  selectableSchemes,
  type PayrollOptionRow,
  type PayrollSchemeRow,
} from "@/lib/payroll-options";
import { MAX_CAP_HOURS, MIN_CAP_HOURS, type PayrollSetupForm } from "@/lib/payroll-setup";
import { NO_TAX, taxSelectOptions, type PayrollTaxRuleRow } from "@/lib/payroll-tax";
import { cn } from "@/lib/utils";
import { fieldErrorClass, fieldHelpClass, fieldInputClass, fieldLabelClass } from "./form-styles";

// Currency stays a fixed list (a world list is not something to manage).
const CURRENCIES = [
  { value: "PHP", label: "PHP, Philippine Peso" },
  { value: "USD", label: "USD, US Dollar" },
  { value: "EUR", label: "EUR, Euro" },
  { value: "SGD", label: "SGD, Singapore Dollar" },
  { value: "AUD", label: "AUD, Australian Dollar" },
  { value: "GBP", label: "GBP, British Pound" },
];

export interface PayrollSetupErrors {
  baseSalary?: string;
  maxBillableHoursPerDay?: string;
  overtimeMultiplier?: string;
}

interface PayrollSetupDetailsProps {
  form: PayrollSetupForm;
  schemeKey: string;
  schemes?: PayrollSchemeRow[];
  employmentTypes?: PayrollOptionRow[];
  paymentFrequencies?: PayrollOptionRow[];
  taxRules?: PayrollTaxRuleRow[];
  listsLoading: boolean;
  errors: PayrollSetupErrors;
  disabled?: boolean;
  onChange: (field: keyof PayrollSetupForm, value: string) => void;
}

const sectionTitleClass = "text-xs font-semibold uppercase tracking-wide text-[var(--muted)]";

function OptionSelect({ id, label, value, options, loading, disabled, help, onChange }: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string; archived: boolean }>;
  loading: boolean;
  disabled?: boolean;
  help?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelClass}>{label}</label>
      <select id={id} value={loading ? "" : value} disabled={disabled || loading} onChange={(event) => onChange(event.target.value)} className={fieldInputClass}>
        {loading && <option value="">Loading the list</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{option.archived ? " (archived)" : ""}
          </option>
        ))}
      </select>
      {help && <p className={fieldHelpClass}>{help}</p>}
    </div>
  );
}

/** Right column of Set Up Payroll: role, salary and schedule, bank and tax. */
export default function PayrollSetupDetails({
  form,
  schemeKey,
  schemes,
  employmentTypes,
  paymentFrequencies,
  taxRules,
  listsLoading,
  errors,
  disabled,
  onChange,
}: PayrollSetupDetailsProps) {
  const usesHourlyRate = form.payBasis === "hourly_rate";
  const scheme = findScheme(schemes, schemeKey);
  const storedSchemeMissing = Boolean(schemes && form.payrollScheme && !schemes.some((row) => row.key === form.payrollScheme));
  const schemeHelp = !scheme
    ? undefined
    : usesHourlyRate
      ? scheme.maxCreditedDays
        ? `${describeScheme(scheme)}. On an hourly rate only the credited-days cap applies.`
        : `${describeScheme(scheme)}. Not used for pay on an hourly rate.`
      : describeScheme(scheme);

  return (
    <div className="space-y-6">
      <section aria-labelledby="payroll-setup-role" className="space-y-4">
        <h3 id="payroll-setup-role" className={sectionTitleClass}>Role and contract</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payroll-job-title" className={fieldLabelClass}>Job title</label>
            <input
              id="payroll-job-title"
              type="text"
              value={form.jobTitle}
              disabled={disabled}
              onChange={(event) => onChange("jobTitle", event.target.value)}
              className={fieldInputClass}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <OptionSelect
            id="payroll-employment-type"
            label="Employment type"
            value={form.employmentType}
            options={selectableOptions(employmentTypes, form.employmentType)}
            loading={listsLoading}
            disabled={disabled}
            onChange={(value) => onChange("employmentType", value)}
          />
        </div>
      </section>

      <section aria-labelledby="payroll-setup-salary" className="space-y-4">
        <h3 id="payroll-setup-salary" className={sectionTitleClass}>Salary and schedule</h3>
        <div>
          <label htmlFor="payroll-base-salary" className={fieldLabelClass}>
            Monthly base salary {!usesHourlyRate && <span className="text-red-500" aria-hidden="true">*</span>}
          </label>
          <div className="flex min-w-0 gap-2">
            <select
              aria-label="Currency"
              value={form.currency}
              disabled={disabled}
              onChange={(event) => onChange("currency", event.target.value)}
              className={cn(fieldInputClass, "w-24 shrink-0")}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>{currency.value}</option>
              ))}
            </select>
            <input
              id="payroll-base-salary"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0.00"
              value={form.baseSalary}
              disabled={disabled}
              onChange={(event) => onChange("baseSalary", event.target.value)}
              className={cn(fieldInputClass, "w-auto min-w-0 flex-1 font-mono tabular-nums")}
              aria-invalid={Boolean(errors.baseSalary)}
              aria-describedby="payroll-base-salary-help"
            />
          </div>
          <p id="payroll-base-salary-help" className={errors.baseSalary ? fieldErrorClass : fieldHelpClass}>
            {errors.baseSalary ?? (usesHourlyRate
              ? "Not used for pay on an hourly rate. Kept for records."
              : CURRENCIES.find((currency) => currency.value === form.currency)?.label)}
          </p>
        </div>

        <OptionSelect
          id="payroll-payment-frequency"
          label="Pay frequency"
          value={form.paymentFrequency}
          options={selectableOptions(paymentFrequencies, form.paymentFrequency)}
          loading={listsLoading}
          disabled={disabled}
          help="A label on the profile. Pay periods follow the company payroll cycle."
          onChange={(value) => onChange("paymentFrequency", value)}
        />

        <div>
          <label htmlFor="payroll-scheme" className={fieldLabelClass}>
            Salary divisor scheme <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="payroll-scheme"
            value={listsLoading ? "" : schemeKey}
            disabled={disabled || listsLoading}
            onChange={(event) => onChange("payrollScheme", event.target.value)}
            className={fieldInputClass}
            aria-describedby="payroll-scheme-help"
          >
            {listsLoading && <option value="">Loading the list</option>}
            {selectableSchemes(schemes, schemeKey).map((row) => (
              <option key={row.key} value={row.key}>
                {row.name}{row.isDefault ? " (default)" : ""}{row.archived ? " (archived)" : ""}
              </option>
            ))}
          </select>
          <p id="payroll-scheme-help" className={fieldHelpClass}>
            {storedSchemeMissing ? "The saved scheme is no longer in the list, so the default is selected. " : ""}
            {schemeHelp}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payroll-cap-hours" className={fieldLabelClass}>
              Max billable hours a day <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="payroll-cap-hours"
              type="number"
              inputMode="decimal"
              min={MIN_CAP_HOURS}
              max={MAX_CAP_HOURS}
              step="0.25"
              value={form.maxBillableHoursPerDay}
              disabled={disabled}
              onChange={(event) => onChange("maxBillableHoursPerDay", event.target.value)}
              className={`${fieldInputClass} font-mono tabular-nums`}
              aria-invalid={Boolean(errors.maxBillableHoursPerDay)}
              aria-describedby="payroll-cap-hours-help"
            />
            <p id="payroll-cap-hours-help" className={errors.maxBillableHoursPerDay ? fieldErrorClass : fieldHelpClass}>
              {errors.maxBillableHoursPerDay ?? "Hours above this in a day are overtime, paid only when approved."}
            </p>
          </div>
          <div>
            <label htmlFor="payroll-ot-multiplier" className={fieldLabelClass}>
              Overtime multiplier <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="payroll-ot-multiplier"
              type="number"
              inputMode="decimal"
              min="1"
              max="5"
              step="0.05"
              value={form.overtimeMultiplier}
              disabled={disabled}
              onChange={(event) => onChange("overtimeMultiplier", event.target.value)}
              className={`${fieldInputClass} font-mono tabular-nums`}
              aria-invalid={Boolean(errors.overtimeMultiplier)}
              aria-describedby="payroll-ot-multiplier-help"
            />
            <p id="payroll-ot-multiplier-help" className={errors.overtimeMultiplier ? fieldErrorClass : fieldHelpClass}>
              {errors.overtimeMultiplier ?? "Approved overtime pays the hourly rate times this. 1.25 is common."}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="payroll-setup-bank" className="space-y-4">
        <h3 id="payroll-setup-bank" className={sectionTitleClass}>Bank and tax</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="payroll-bank-account" className={fieldLabelClass}>Bank account</label>
            <input
              id="payroll-bank-account"
              type="text"
              value={form.bankAccount}
              disabled={disabled}
              onChange={(event) => onChange("bankAccount", event.target.value)}
              className={fieldInputClass}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="payroll-tax-id" className={fieldLabelClass}>Tax ID</label>
            <input
              id="payroll-tax-id"
              type="text"
              value={form.taxId}
              disabled={disabled}
              onChange={(event) => onChange("taxId", event.target.value)}
              className={fieldInputClass}
              placeholder="TIN, optional"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label htmlFor="payroll-tax-rule" className={fieldLabelClass}>Tax</label>
          <select
            id="payroll-tax-rule"
            value={listsLoading ? "" : form.taxRule}
            disabled={disabled || listsLoading}
            onChange={(event) => onChange("taxRule", event.target.value)}
            className={fieldInputClass}
            aria-describedby="payroll-tax-rule-help"
          >
            {listsLoading
              ? <option value="">Loading the list</option>
              : taxSelectOptions(taxRules, form.taxRule).map((option) => (
                <option key={option.value || "workspace-default"} value={option.value}>{option.label}</option>
              ))}
          </select>
          <p id="payroll-tax-rule-help" className={fieldHelpClass}>
            {form.taxRule === NO_TAX
              ? "No withholding on this person's payslips."
              : "Withholding taken from gross pay on each payslip generated from now on. Rules are managed in Payroll options."}
          </p>
        </div>
      </section>
    </div>
  );
}
