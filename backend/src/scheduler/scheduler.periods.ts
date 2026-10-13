export interface PayrollPeriodWindow {
    start: Date
    end: Date
    payDate: Date
}

/**
 * Compute the semi-monthly payroll period window that contains `now`.
 *
 * - First half of the month: 1st 00:00:00 → 15th 23:59:59.
 * - Second half: 16th 00:00:00 → last day of month 23:59:59.
 * - Pay date is 5 days after the period end.
 *
 * Pure: depends only on the provided clock value, so it can be unit-tested
 * without a database or a live system clock. The scheduler passes `new Date()`.
 */
export function computeExpectedPeriodWindow(now: Date): PayrollPeriodWindow {
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()

    let start: Date
    let end: Date
    if (day <= 15) {
        start = new Date(year, month, 1)
        end = new Date(year, month, 15, 23, 59, 59)
    } else {
        start = new Date(year, month, 16)
        end = new Date(year, month + 1, 0, 23, 59, 59)
    }

    const payDate = new Date(end)
    payDate.setDate(payDate.getDate() + 5)

    return { start, end, payDate }
}
