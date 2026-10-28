import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './helpers/load-ts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loadPayslipUtils = () => loadTsModule(path.resolve(__dirname, '../src/lib/payroll-calendar/payslip-utils.ts'));

// jsPDF's built-in Helvetica has no peso sign (it printed "±"), so PDF amounts spell out PHP.
test('formatPdfMoney prints PHP with two decimals and thousands separators', () => {
  const { formatPdfMoney } = loadPayslipUtils();
  assert.equal(formatPdfMoney(1234), 'PHP 1,234.00');
  assert.equal(formatPdfMoney(1234567.891), 'PHP 1,234,567.89');
  assert.equal(formatPdfMoney(0), 'PHP 0.00');
  assert.equal(formatPdfMoney(-250.5), '-PHP 250.50');
  assert.equal(formatPdfMoney(-0.001), 'PHP 0.00', 'no minus sign on an amount that rounds to zero');
  assert.equal(formatPdfMoney(Number.NaN), 'PHP 0.00');
  assert.equal(formatPdfMoney(99.5, 'USD'), 'USD 99.50');
});

test('formatPdfMoney output is plain ASCII that Helvetica can print', () => {
  const { formatPdfMoney } = loadPayslipUtils();
  for (const amount of [0, 15, 1234.5, -9876543.21]) {
    assert.match(formatPdfMoney(amount), /^-?PHP [0-9,]+\.[0-9]{2}$/);
  }
});

test('on-screen formatCurrency keeps the peso sign', () => {
  const { formatCurrency } = loadPayslipUtils();
  assert.match(formatCurrency(1234), /₱/);
});
