/**
 * Withholding tax rules (2026-10-28), read from GET /payroll/tax-rules.
 * EmployeeProfile.taxRule: null follows the workspace default rule, "none"
 * means no tax, anything else is a rule key. Without a default rule a profile
 * that follows the default pays no tax. Rules, rounding and messages mirror
 * backend/src/payroll/payroll-tax.ts.
 * No runtime imports so node --test can load this file directly.
 */

export const NO_TAX = "none";
export const MIN_TAX_RATE = 0;
export const MAX_TAX_RATE = 100;
export const TAX_NAME_MIN_LENGTH = 2;
export const TAX_NAME_MAX_LENGTH = 60;
export const TAX_RATE_MESSAGE = `Enter a tax rate from ${MIN_TAX_RATE} to ${MAX_TAX_RATE} percent.`;
export const TAX_NAME_MESSAGE = `Use ${TAX_NAME_MIN_LENGTH} to ${TAX_NAME_MAX_LENGTH} characters.`;

export interface PayrollTaxRuleRow {
  id: string;
  key: string;
  name: string;
  rate: number;
  isDefault: boolean;
  sortOrder: number;
  archived: boolean;
  /** Profiles that chose this rule; payroll roles only. */
  inUseCount?: number;
}

type RuleLike = Pick<PayrollTaxRuleRow, "name" | "rate">;

/** Rounds to cents, half away from zero (same as the server). */
function roundMoney(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100 || 0;
}

/** 5 -> "5", 2.5 -> "2.5". */
export function formatTaxRate(rate: number): string {
  return String(Math.round(rate * 100) / 100);
}

/** "Withholding 5%, 5%". */
export function describeTaxRule(rule: RuleLike): string {
  return `${rule.name}, ${formatTaxRate(rule.rate)}%`;
}

export function getDefaultTaxRule(rules: readonly PayrollTaxRuleRow[] | undefined): PayrollTaxRuleRow | undefined {
  return rules?.find((rule) => rule.isDefault);
}

/** The rule stored under `key`, archived ones included. */
export function findTaxRule(rules: readonly PayrollTaxRuleRow[] | undefined, key?: string | null): PayrollTaxRuleRow | undefined {
  if (!key) return undefined;
  return rules?.find((rule) => rule.key === key);
}

/**
 * The rule that applies for a profile value, as the server resolves it:
 * "none" is no tax, empty is the default rule, a key is its rule (an unknown
 * key falls back to the default).
 */
export function resolveTaxRule(rules: readonly PayrollTaxRuleRow[] | undefined, value?: string | null): PayrollTaxRuleRow | null {
  if (value === NO_TAX) return null;
  return findTaxRule(rules, value) ?? getDefaultTaxRule(rules) ?? null;
}

/** Withholding on a gross amount: gross x rate / 100, to cents, never below 0. */
export function computeTaxAmount(grossPay: number, rate: number): number {
  if (!Number.isFinite(grossPay) || grossPay <= 0 || !Number.isFinite(rate) || rate <= 0) return 0;
  return roundMoney((grossPay * rate) / 100);
}

/**
 * Choices for the Set Up Payroll "Tax" select: the workspace default (named),
 * no tax, every active rule, and the saved rule when it is archived or gone,
 * so saving never changes it by accident.
 */
export function taxSelectOptions(
  rules: readonly PayrollTaxRuleRow[] | undefined,
  currentValue?: string | null,
): Array<{ value: string; label: string }> {
  const fallback = getDefaultTaxRule(rules);
  const options = [
    { value: "", label: fallback ? `Workspace default (${describeTaxRule(fallback)})` : "Workspace default (none)" },
    { value: NO_TAX, label: "No tax" },
    ...[...(rules ?? [])]
      .filter((rule) => !rule.archived || rule.key === currentValue)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((rule) => ({ value: rule.key, label: `${describeTaxRule(rule)}${rule.archived ? " (archived)" : ""}` })),
  ];
  if (currentValue && currentValue !== NO_TAX && !options.some((option) => option.value === currentValue)) {
    return [...options, { value: currentValue, label: "Saved rule no longer in the list (the default applies)" }];
  }
  return options;
}

/** The setup line for a profile: "Workspace default: Withholding 5%, 5%", "No tax", "Contractor 10%, 10%". */
export function describeTaxChoice(rules: readonly PayrollTaxRuleRow[] | undefined, value?: string | null): string {
  if (value === NO_TAX) return "No tax";
  const own = findTaxRule(rules, value);
  if (own) return describeTaxRule(own);
  const fallback = getDefaultTaxRule(rules);
  return fallback ? `Workspace default: ${describeTaxRule(fallback)}` : "Workspace default: no tax";
}

/** Pay summary part, only when the choice is not the default: "No tax" or "Tax: Contractor 10%, 10%". */
export function taxChoiceLabel(rules: readonly PayrollTaxRuleRow[] | undefined, value?: string | null): string {
  if (!value) return "";
  if (value === NO_TAX) return "No tax";
  const own = findTaxRule(rules, value);
  return own ? `Tax: ${describeTaxRule(own)}` : "";
}

/**
 * Gross of a full month for the Set Up Payroll estimate: the salary on
 * fixed_monthly, else the hourly rate times the daily cap times the credited
 * days (the scheme's cap, at most the weekdays of the month). Null without pay.
 */
export function estimateFullMonthGross(input: {
  payBasis: string;
  baseSalary: number;
  hourlyRate: number;
  capHours: number;
  weekdays: number;
  maxCreditedDays?: number | null;
}): number | null {
  if (input.payBasis === "fixed_monthly") {
    return Number.isFinite(input.baseSalary) && input.baseSalary > 0 ? roundMoney(input.baseSalary) : null;
  }
  if (!Number.isFinite(input.hourlyRate) || input.hourlyRate <= 0) return null;
  const days = input.maxCreditedDays && input.maxCreditedDays > 0 ? Math.min(input.maxCreditedDays, input.weekdays) : input.weekdays;
  return roundMoney(input.hourlyRate * input.capHours * days);
}

/** Tax and net for a gross under a rule, or null when there is nothing to show. */
export function estimateTax(gross: number | null, rule: RuleLike | null | undefined): { gross: number; tax: number; net: number } | null {
  if (gross === null || !rule) return null;
  const tax = computeTaxAmount(gross, rule.rate);
  return { gross, tax, net: roundMoney(gross - tax) };
}

export function isTaxItem(item: { type?: string | null }): boolean {
  return item.type === "tax";
}

/** Withholding on a payslip: the sum of its tax lines, as a positive number. */
export function payslipTaxTotal(items: ReadonlyArray<{ type?: string | null; amount: number }> | undefined): number {
  return roundMoney((items ?? []).filter(isTaxItem).reduce((sum, item) => sum + Math.abs(item.amount), 0));
}

// ---------------------------------------------------------------------------
// Drafts for the options manager
// ---------------------------------------------------------------------------

export interface TaxRuleDraft {
  name: string;
  rate: string;
}

export const EMPTY_TAX_RULE_DRAFT: TaxRuleDraft = { name: "", rate: "" };

export function taxRuleToDraft(rule: RuleLike): TaxRuleDraft {
  return { name: rule.name, rate: String(rule.rate) };
}

export function validateTaxRuleDraft(draft: TaxRuleDraft): { valid: boolean; errors: Partial<Record<keyof TaxRuleDraft, string>> } {
  const errors: Partial<Record<keyof TaxRuleDraft, string>> = {};
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (name.length < TAX_NAME_MIN_LENGTH || name.length > TAX_NAME_MAX_LENGTH) errors.name = TAX_NAME_MESSAGE;
  const rate = Number(draft.rate);
  if (draft.rate.trim() === "" || !Number.isFinite(rate) || rate < MIN_TAX_RATE || rate > MAX_TAX_RATE) errors.rate = TAX_RATE_MESSAGE;
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Body for POST /payroll/tax-rules and PATCH /payroll/tax-rules/:id. */
export function toTaxRulePayload(draft: TaxRuleDraft): { name: string; rate: number } {
  return { name: draft.name.trim().replace(/\s+/g, " "), rate: Number(draft.rate) };
}
