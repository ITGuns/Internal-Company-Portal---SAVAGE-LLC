import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHelper(relativePath) {
  const helperPath = path.resolve(__dirname, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, console }, { filename: helperPath });
  return compiledModule.exports;
}

const tax = () => loadHelper('../src/lib/payroll-tax.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const rules = [
  { id: 't1', key: 'withholding_5', name: 'Withholding 5%', rate: 5, isDefault: true, sortOrder: 0, archived: false, inUseCount: 0 },
  { id: 't2', key: 'contractor_10', name: 'Contractor 10%', rate: 10, isDefault: false, sortOrder: 1, archived: false, inUseCount: 2 },
  { id: 't3', key: 'old_2_5', name: 'Old 2.5%', rate: 2.5, isDefault: false, sortOrder: 2, archived: true, inUseCount: 1 },
];
const noDefault = rules.map((rule) => ({ ...rule, isDefault: false }));

test('a profile value resolves like the server: none, the default, a rule, an unknown key', () => {
  const { resolveTaxRule, NO_TAX } = tax();
  assert.equal(resolveTaxRule(rules, NO_TAX), null);
  assert.equal(resolveTaxRule(rules, null).key, 'withholding_5');
  assert.equal(resolveTaxRule(rules, '').key, 'withholding_5');
  assert.equal(resolveTaxRule(rules, 'contractor_10').key, 'contractor_10');
  assert.equal(resolveTaxRule(rules, 'old_2_5').key, 'old_2_5', 'archived rules still apply to the people on them');
  assert.equal(resolveTaxRule(rules, 'gone').key, 'withholding_5', 'an unknown key falls back to the default');
  assert.equal(resolveTaxRule(noDefault, null), null, 'no default rule means no tax');
  assert.equal(resolveTaxRule(undefined, null), null);
});

test('tax amounts round to cents like the server', () => {
  const { computeTaxAmount } = tax();
  assert.equal(computeTaxAmount(30000, 5), 1500);
  assert.equal(computeTaxAmount(10000.55, 5), 500.03);
  assert.equal(computeTaxAmount(33333.33, 7.5), 2500);
  assert.equal(computeTaxAmount(0, 5), 0);
  assert.equal(computeTaxAmount(1000, 0), 0);
  assert.equal(computeTaxAmount(-50, 5), 0);
});

test('Set Up Payroll tax choices name the default and keep an archived saved rule', () => {
  const { taxSelectOptions } = tax();
  assert.deepEqual(plain(taxSelectOptions(rules, '')), [
    { value: '', label: 'Workspace default (Withholding 5%, 5%)' },
    { value: 'none', label: 'No tax' },
    { value: 'withholding_5', label: 'Withholding 5%, 5%' },
    { value: 'contractor_10', label: 'Contractor 10%, 10%' },
  ]);
  assert.equal(taxSelectOptions(noDefault, '')[0].label, 'Workspace default (none)');
  const withArchived = plain(taxSelectOptions(rules, 'old_2_5'));
  assert.deepEqual(withArchived.at(-1), { value: 'old_2_5', label: 'Old 2.5%, 2.5% (archived)' });
  const missing = plain(taxSelectOptions(rules, 'deleted_rule'));
  assert.equal(missing.at(-1).value, 'deleted_rule', 'saving never drops a stored value silently');
  assert.equal(plain(taxSelectOptions(undefined, '')).length, 2, 'default and no tax before the list loads');
});

test('labels for the setup line and the Employee Overview pay summary', () => {
  const { describeTaxChoice, taxChoiceLabel } = tax();
  assert.equal(describeTaxChoice(rules, null), 'Workspace default: Withholding 5%, 5%');
  assert.equal(describeTaxChoice(noDefault, null), 'Workspace default: no tax');
  assert.equal(describeTaxChoice(rules, 'none'), 'No tax');
  assert.equal(describeTaxChoice(rules, 'contractor_10'), 'Contractor 10%, 10%');
  assert.equal(taxChoiceLabel(rules, null), '', 'the default choice adds nothing to the pay summary');
  assert.equal(taxChoiceLabel(rules, 'none'), 'No tax');
  assert.equal(taxChoiceLabel(rules, 'contractor_10'), 'Tax: Contractor 10%, 10%');
});

test('full month estimate: salary on fixed monthly, credited days otherwise', () => {
  const { estimateFullMonthGross, estimateTax } = tax();
  assert.equal(estimateFullMonthGross({ payBasis: 'fixed_monthly', baseSalary: 30000, hourlyRate: 0, capHours: 8, weekdays: 23 }), 30000);
  // 22 credited days in a 23-weekday month at 8 h and 125 an hour.
  assert.equal(estimateFullMonthGross({ payBasis: 'hourly_from_monthly', baseSalary: 22000, hourlyRate: 125, capHours: 8, weekdays: 23, maxCreditedDays: 22 }), 22000);
  // No cap: every weekday counts.
  assert.equal(estimateFullMonthGross({ payBasis: 'hourly_rate', baseSalary: 0, hourlyRate: 500, capHours: 8, weekdays: 21, maxCreditedDays: null }), 84000);
  assert.equal(estimateFullMonthGross({ payBasis: 'hourly_rate', baseSalary: 0, hourlyRate: 0, capHours: 8, weekdays: 21 }), null);
  assert.equal(estimateFullMonthGross({ payBasis: 'fixed_monthly', baseSalary: 0, hourlyRate: 0, capHours: 8, weekdays: 21 }), null);
  assert.deepEqual(plain(estimateTax(30000, { name: 'Withholding 5%', rate: 5 })), { gross: 30000, tax: 1500, net: 28500 });
  assert.equal(estimateTax(30000, null), null);
  assert.equal(estimateTax(null, { name: 'Withholding 5%', rate: 5 }), null);
});

test('payslip tax total reads the tax lines only', () => {
  const { payslipTaxTotal, isTaxItem } = tax();
  const items = [
    { type: 'fixed_salary', amount: 30000 },
    { type: 'tax', amount: -1500 },
    { type: 'deduction', amount: -300 },
  ];
  assert.equal(payslipTaxTotal(items), 1500);
  assert.equal(payslipTaxTotal([]), 0);
  assert.equal(payslipTaxTotal(undefined), 0);
  assert.equal(isTaxItem({ type: 'tax' }), true);
  assert.equal(isTaxItem({ type: 'deduction' }), false);
});

test('rule drafts validate like the server and build the request body', () => {
  const { validateTaxRuleDraft, toTaxRulePayload, taxRuleToDraft, TAX_RATE_MESSAGE, TAX_NAME_MESSAGE } = tax();
  assert.equal(validateTaxRuleDraft({ name: 'Withholding 5%', rate: '5' }).valid, true);
  assert.equal(validateTaxRuleDraft({ name: 'Exempt', rate: '0' }).valid, true, '0% is allowed');
  assert.equal(validateTaxRuleDraft({ name: 'Too much', rate: '100.5' }).errors.rate, TAX_RATE_MESSAGE);
  assert.equal(validateTaxRuleDraft({ name: 'Blank', rate: '' }).errors.rate, TAX_RATE_MESSAGE);
  assert.equal(validateTaxRuleDraft({ name: 'X', rate: '5' }).errors.name, TAX_NAME_MESSAGE);
  assert.deepEqual(plain(toTaxRulePayload({ name: '  Withholding   5% ', rate: '5' })), { name: 'Withholding 5%', rate: 5 });
  assert.deepEqual(plain(taxRuleToDraft(rules[2])), { name: 'Old 2.5%', rate: '2.5' });
});
