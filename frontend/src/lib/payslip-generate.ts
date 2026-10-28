/**
 * Pure helpers for GeneratePayslipModal (fix 2026-10-09: generated payslips
 * dropped approved overtime). By default the modal sends no hours, so the
 * server builds the payslip from the pay basis and approved overtime, the same
 * numbers GET /payroll/preview-calculation returns. "Override hours" replaces
 * the regular-hours line only; overtime is still added by the server.
 * No runtime imports so node --test can load this file directly.
 */

/** The fields of GET /payroll/preview-calculation the modal shows. */
export interface PayslipPreview {
  payBasis?: string;
  payBasisLabel?: string;
  totalHours?: number;
  billableHours?: number;
  hourlyRate?: number;
  basePay?: number;
  overtimeApprovedHours?: number;
  overtimePendingHours?: number;
  overtimeRate?: number;
  overtimeMultiplier?: number;
  overtimePay?: number;
  grossPay?: number;
  maxBillableHoursPerDay?: number;
  payrollSchemeLabel?: string;
  /** Name of the scheme row (2026-10-20); same value as payrollSchemeLabel. */
  payrollSchemeName?: string;
  /** Paid regular hours: billable hours up to the scheme's credited-days cap. */
  creditedHours?: number;
  /** Billable hours above that cap: shown on the payslip, not paid. */
  uncreditedHours?: number;
  maxCreditedDays?: number | null;
  /** The withholding tax line the payslip gets (2026-10-28), or null without a rule. */
  tax?: { ruleKey: string; ruleName: string; rate: number; amount: number } | null;
}

/** Hours "Override hours" starts from: the credited (paid) hours, else the billable hours. */
export function previewPaidHours(preview: PayslipPreview): number {
  return preview.creditedHours ?? preview.billableHours ?? 0;
}

export interface GenerateDeductionInput {
  type: string;
  name: string;
  amount: number;
}

export interface GeneratePayslipFormState {
  overrideHours: boolean;
  hoursWorked: number;
  deductions: GenerateDeductionInput[];
}

export interface GeneratePayslipBody {
  hoursWorked?: number;
  deductions?: GenerateDeductionInput[];
  force?: boolean;
}

/** Same rounding as the server (half away from zero, to cents). */
export function roundMoney(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100 || 0;
}

function positiveDeductions(deductions: GenerateDeductionInput[]): GenerateDeductionInput[] {
  return deductions
    .filter((deduction) => Number.isFinite(deduction.amount) && deduction.amount > 0)
    .map(({ type, name, amount }) => ({ type, name: name.trim(), amount }));
}

/**
 * Request body for POST /payroll/periods/:id/generate/:userId. hoursWorked is
 * sent only when the admin turned on "Override hours"; grossPay is never sent.
 */
export function buildGeneratePayslipBody(state: GeneratePayslipFormState): GeneratePayslipBody {
  const deductions = positiveDeductions(state.deductions);
  return {
    ...(state.overrideHours ? { hoursWorked: state.hoursWorked } : {}),
    ...(deductions.length > 0 ? { deductions } : {}),
  };
}

/** Base pay line the server will write: the preview's, or hours x rate when overridden. */
export function previewBasePay(preview: PayslipPreview, state: Pick<GeneratePayslipFormState, "overrideHours" | "hoursWorked">): number {
  const base = preview.basePay ?? 0;
  if (!state.overrideHours || preview.payBasis === "fixed_monthly") return roundMoney(base);
  return roundMoney(state.hoursWorked * (preview.hourlyRate ?? 0));
}

/**
 * Gross pay shown in the modal. Without an override it is exactly the
 * preview's grossPay.
 */
export function previewGrossPay(preview: PayslipPreview, state: Pick<GeneratePayslipFormState, "overrideHours" | "hoursWorked">): number {
  if (!state.overrideHours) return preview.grossPay ?? 0;
  return roundMoney(previewBasePay(preview, state) + roundMoney(preview.overtimePay ?? 0));
}

/**
 * Withholding for the gross shown in the modal: the preview's own amount, or
 * gross x rate when the hours are overridden (same rounding as the server).
 */
export function previewTaxAmount(preview: PayslipPreview, grossPay: number): number {
  const tax = preview.tax;
  if (!tax) return 0;
  if (grossPay === preview.grossPay) return tax.amount;
  if (!(grossPay > 0) || !(tax.rate > 0)) return 0;
  return roundMoney((grossPay * tax.rate) / 100);
}

export function totalDeductions(deductions: GenerateDeductionInput[]): number {
  return roundMoney(positiveDeductions(deductions).reduce((sum, deduction) => sum + deduction.amount, 0));
}

/** Server message on 409 when regenerating a payslip that was edited by hand. */
export const EDITED_PAYSLIP_MESSAGE = "This payslip was edited by hand. Regenerating replaces those edits.";

export function isEditedPayslipConflict(message: string | null | undefined): boolean {
  return typeof message === "string" && message.startsWith("This payslip was edited by hand");
}
