import {
    payrollDayKey,
    periodEndDayKey,
    periodStartDayKey,
    semiMonthlyPeriodForDay,
} from '../payroll/payroll.calculations'

export interface PayrollPeriodWindow {
    start: Date
    end: Date
    payDate: Date
}

/**
 * Compute the semi-monthly payroll period window that contains `now`, in
 * calendar days of `timeZone` (PAYROLL_TIMEZONE, Asia/Manila by default).
 *
 * - First half of the month: 1st 00:00:00 to 15th 23:59:59.
 * - Second half: 16th 00:00:00 to last day of month 23:59:59.
 * - Pay date is 5 days after the period end.
 *
 * Pure: depends only on the provided clock value and zone, never the server
 * timezone. The scheduler passes `new Date()`.
 */
export function computeExpectedPeriodWindow(now: Date, timeZone: string): PayrollPeriodWindow {
    return semiMonthlyPeriodForDay(payrollDayKey(now, timeZone), timeZone)
}

/**
 * True when a stored period shares a calendar day with the window. Compares
 * calendar days, not instants, so a period stored at UTC midnight and one
 * stored at Manila midnight for the same days are treated as the same period.
 */
export function periodOverlapsWindow(
    period: { startDate: Date; endDate: Date },
    window: { start: Date; end: Date },
): boolean {
    return periodStartDayKey(period.startDate) <= periodEndDayKey(window.end)
        && periodEndDayKey(period.endDate) >= periodStartDayKey(window.start)
}

/**
 * Whether auto-payslip may run for a period now. A period that has ended is
 * generated immediately (the pay-date gate would skip it until the next
 * period ends). A period still open keeps the gate: from 2 days before the
 * pay date, or from its end when it has no pay date.
 */
export function isAutoPayslipDue(
    period: { endDate: Date; payDate?: Date | null },
    now: Date,
): boolean {
    if (period.endDate.getTime() < now.getTime()) return true
    const generateFrom = period.payDate
        ? period.payDate.getTime() - 2 * 24 * 60 * 60 * 1000
        : period.endDate.getTime()
    return now.getTime() >= generateFrom
}

export interface SelectablePayrollPeriod {
    id: string
    status: string
    endDate: Date
}

/**
 * Auto-payslip target (payroll v2, Rule 8): the draft period that most
 * recently ended (endDate < now). Never the newest or still-open period.
 */
export function selectAutoPayslipPeriod<T extends SelectablePayrollPeriod>(
    periods: readonly T[],
    now: Date,
): T | null {
    return periods
        .filter((period) => period.status === 'draft' && period.endDate.getTime() < now.getTime())
        .reduce<T | null>(
            (latest, period) => (!latest || period.endDate > latest.endDate ? period : latest),
            null,
        )
}
