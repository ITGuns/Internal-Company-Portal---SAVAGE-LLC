/**
 * Maps a GET /payroll/my-payslips row to the Payslip shape the payroll
 * screens and the PDF use. Shared by Payslips Management and My Payslips
 * (2026-10-28) so both show the same deductions, tax and sign-off.
 * Deductions are the negative lines plus every tax line (a tax line can be 0).
 */

import { payrollPeriodDayKey } from "./payroll-dates";
import { getPayrollDayKey } from "./time-requests";
import type { Payslip } from "./payroll-calendar/types";
import type { ApiPayslip } from "./types/api";

export interface PayslipViewContext {
  employeeName?: string;
  payBasis?: string;
  /** Text for a missing date ("N/A" in Payslips Management). */
  missing?: string;
}

export function toPayslipView(raw: ApiPayslip, context: PayslipViewContext = {}): Payslip {
  const missing = context.missing ?? "";
  const items = raw.items ?? [];
  return {
    id: raw.id,
    employeeId: raw.userId,
    employeeName: context.employeeName ?? (raw.user?.name || "Me"),
    // Manila calendar days (period rows may be stored at UTC or Manila midnight).
    payPeriodStart: payrollPeriodDayKey(raw.period?.startDate, "start") ?? missing,
    payPeriodEnd: payrollPeriodDayKey(raw.period?.endDate, "end") ?? missing,
    issueDate: (raw.generatedAt && getPayrollDayKey(raw.generatedAt)) || missing,
    status: (raw.status as Payslip["status"]) || "issued",
    hoursWorked: 0, // not stored on the payslip; the line items carry the hours
    payBasis: context.payBasis,
    grossPay: raw.grossPay ?? 0,
    netPay: raw.netPay ?? 0,
    deductions: items
      .filter((item) => item.amount < 0 || item.type === "tax")
      .map((item) => ({
        id: item.id,
        type: item.type === "tax" ? ("tax" as const) : ("other" as const),
        name: item.description,
        amount: Math.abs(item.amount),
      })),
    items,
    periodId: raw.period?.id ?? raw.periodId,
    periodStatus: raw.period?.status,
    editedAt: raw.editedAt,
    editNote: raw.editNote,
    approvalStatus: raw.approvalStatus ?? null,
    approvedAt: raw.approvedAt ?? null,
    approvalSignerName: raw.approvalSignerName ?? null,
    approvalSignature: raw.approvalSignature ?? null,
    approvalNote: raw.approvalNote ?? null,
  };
}
