/**
 * Pure helpers for editing payslip line items.
 * The server recomputes gross and net on save; these totals are for display only.
 * No runtime imports so node --test can load this file directly.
 */

export type PayrollItemType =
  | "regular_hours"
  | "fixed_salary"
  | "overtime_approved"
  | "overtime_pending"
  | "allowance"
  | "deduction"
  | "adjustment";

export const PAYROLL_ITEM_TYPES: Array<{ value: PayrollItemType; label: string }> = [
  { value: "regular_hours", label: "Regular hours" },
  { value: "fixed_salary", label: "Fixed salary" },
  { value: "overtime_approved", label: "Overtime (approved)" },
  { value: "overtime_pending", label: "Unapproved overtime, not paid" },
  { value: "allowance", label: "Allowance" },
  { value: "deduction", label: "Deduction" },
  { value: "adjustment", label: "Adjustment" },
];

const ITEM_TYPE_VALUES = new Set<string>(PAYROLL_ITEM_TYPES.map((type) => type.value));
// Same limit as backend/src/payroll/payslip-edit.service.ts.
export const MAX_NOTE_LENGTH = 500;

export interface EditablePayslipItem {
  key: string;
  type: PayrollItemType;
  description: string;
  amount: string;
}

export interface PayslipItemPayload {
  type: PayrollItemType;
  description: string;
  amount: number;
}

export function getPayrollItemTypeLabel(type?: string | null): string {
  return PAYROLL_ITEM_TYPES.find((item) => item.value === type)?.label ?? "Other";
}

export function isPayrollItemType(value: unknown): value is PayrollItemType {
  return typeof value === "string" && ITEM_TYPE_VALUES.has(value);
}

/**
 * Legacy items have no type, or one outside the v2 list. Infer the closest match
 * so the editor can show them: negative amounts become deductions.
 */
export function inferPayrollItemType(type: string | null | undefined, amount: number): PayrollItemType {
  if (isPayrollItemType(type)) return type;
  // Pre-v2 payslips stored work pay as "earning".
  if (type === "earning" && amount >= 0) return "regular_hours";
  return amount < 0 ? "deduction" : "adjustment";
}

/**
 * Deductions are always stored negative and pending overtime is always 0.
 * Other types keep the sign the editor typed (adjustments may be negative).
 */
/** Rounds to cents, half away from zero, so a sign flip never changes the magnitude. */
function roundMoney(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100 || 0;
}

export function normalizeItemAmount(type: PayrollItemType, amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  const rounded = roundMoney(amount);
  if (type === "overtime_pending") return 0;
  if (type === "deduction") return -Math.abs(rounded);
  return rounded;
}

/** Gross = every item except deductions. Net = sum of all items. */
export function recomputePayslipTotals(items: Array<{ type: PayrollItemType; amount: number | string }>): {
  gross: number;
  net: number;
} {
  let gross = 0;
  let net = 0;
  for (const item of items) {
    const amount = normalizeItemAmount(item.type, Number(item.amount));
    net += amount;
    if (item.type !== "deduction") gross += amount;
  }
  return {
    gross: roundMoney(gross),
    net: roundMoney(net),
  };
}

export interface PayslipEditErrors {
  items?: string;
  note?: string;
  rows: Record<string, { description?: string; amount?: string }>;
}

export function validatePayslipEdit(items: EditablePayslipItem[], note: string): {
  valid: boolean;
  errors: PayslipEditErrors;
} {
  const errors: PayslipEditErrors = { rows: {} };

  if (items.length === 0) {
    errors.items = "Add at least one line item.";
  }

  for (const item of items) {
    const rowErrors: { description?: string; amount?: string } = {};
    if (!item.description.trim()) rowErrors.description = "Add a description.";
    const amount = Number(item.amount);
    if (item.type !== "overtime_pending" && (item.amount.trim() === "" || !Number.isFinite(amount))) {
      rowErrors.amount = "Enter an amount.";
    }
    if (rowErrors.description || rowErrors.amount) errors.rows[item.key] = rowErrors;
  }

  if (!note.trim()) {
    errors.note = "Explain why this payslip was changed.";
  } else if (note.trim().length > MAX_NOTE_LENGTH) {
    errors.note = `Keep the note under ${MAX_NOTE_LENGTH} characters.`;
  }

  const valid = !errors.items && !errors.note && Object.keys(errors.rows).length === 0;
  return { valid, errors };
}

export function toPayslipItemPayload(items: EditablePayslipItem[]): PayslipItemPayload[] {
  return items.map((item) => ({
    type: item.type,
    description: item.description.trim(),
    amount: normalizeItemAmount(item.type, Number(item.amount)),
  }));
}

/** Processed (locked) periods are read-only. Anything else counts as draft. */
export function isPayrollPeriodLocked(status?: string | null): boolean {
  return status === "processed";
}
