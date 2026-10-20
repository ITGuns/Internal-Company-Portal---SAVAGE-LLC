"use client";

import React from "react";
import { DEFAULT_OVERTIME_MULTIPLIER, getEffectiveHourlyRate } from "@/lib/pay-basis";
import { computeSchemeRates, formatSchemeNumber, type PayrollSchemeRow } from "@/lib/payroll-options";
import { DEFAULT_CAP_HOURS, formatPayAmount, type PayrollSetupForm } from "@/lib/payroll-setup";

interface PayrollRatePreviewProps {
  form: PayrollSetupForm;
  scheme?: PayrollSchemeRow;
  /** Month used for the weekdays scheme (today's month). */
  referenceDate: Date;
}

function Figure({ label, value, detail, wide }: { label: string; value: string; detail?: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-bg)] p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--foreground)]">{value}</dd>
      {detail && <dd className="mt-0.5 text-[11px] text-[var(--muted)]">{detail}</dd>}
    </div>
  );
}

/**
 * Live rates for the values on the form, worked out the way the server does
 * (computeSchemeRates mirrors getPayrollRateContext). Payslips use the saved setup.
 */
export default function PayrollRatePreview({ form, scheme, referenceDate }: PayrollRatePreviewProps) {
  const capHours = Number(form.maxBillableHoursPerDay) > 0 ? Number(form.maxBillableHoursPerDay) : DEFAULT_CAP_HOURS;
  const multiplier = Number(form.overtimeMultiplier) > 0 ? Number(form.overtimeMultiplier) : DEFAULT_OVERTIME_MULTIPLIER;
  const rates = scheme ? computeSchemeRates({ baseSalary: Number(form.baseSalary), scheme, capHours, referenceDate }) : null;
  const isHourlyRate = form.payBasis === "hourly_rate";
  const hourly = getEffectiveHourlyRate(form.payBasis, Number(form.hourlyRate), rates?.hourlyRate ?? 0);
  const money = (amount: number) => formatPayAmount(amount, form.currency);
  const creditedDays = scheme?.maxCreditedDays ?? null;
  const showsCreditedCap = Boolean(creditedDays) && form.payBasis !== "fixed_monthly";

  return (
    <section aria-labelledby="payroll-rate-preview-heading" className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card-surface)] p-4">
      <h3 id="payroll-rate-preview-heading" className="text-sm font-semibold text-[var(--foreground)]">Rate preview</h3>
      <p className="mt-0.5 text-xs text-[var(--muted)]">From the values on this form. Payslips use the setup once it is saved.</p>

      {isHourlyRate ? (
        hourly > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Figure label="Hourly rate" value={money(hourly)} detail="as entered" />
            <Figure label="Overtime, when approved" value={money(hourly * multiplier)} detail={`${multiplier}x the hourly rate`} />
          </dl>
        ) : (
          <p className="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
            Enter an hourly rate to see the pay.
          </p>
        )
      ) : rates ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <Figure label="Daily rate" value={money(rates.dailyRate)} detail={`salary divided by ${rates.divisorLabel}`} />
          <Figure label="Hourly rate" value={money(rates.hourlyRate)} detail={`daily rate over ${formatSchemeNumber(capHours)} h`} />
          <Figure wide label="Overtime, when approved" value={money(rates.hourlyRate * multiplier)} detail={`${multiplier}x the hourly rate`} />
        </dl>
      ) : (
        <p className="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
          {scheme ? "Enter a monthly salary to see the daily and hourly rate." : "Choose a salary divisor scheme to see the rates."}
        </p>
      )}

      {showsCreditedCap && creditedDays && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          At most {formatSchemeNumber(creditedDays * capHours)} h credited in a whole month ({formatSchemeNumber(creditedDays)} days of{" "}
          {formatSchemeNumber(capHours)} h). Hours above that show on the payslip as not paid.
        </p>
      )}
      {form.payBasis === "fixed_monthly" && (
        <p className="mt-3 text-xs text-[var(--muted)]">Pays the monthly salary whatever the hours. The hourly rate prices approved overtime.</p>
      )}
    </section>
  );
}
