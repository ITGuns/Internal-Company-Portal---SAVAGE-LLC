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
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, console, Intl, Date }, { filename: helperPath });
  return compiledModule.exports;
}

const approval = () => loadHelper('../src/lib/payslip-approval.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('signature size check: a PNG data URL of at most 64 KB', () => {
  const { checkSignatureDataUrl, MAX_SIGNATURE_BYTES, SIGNATURE_MESSAGE, SIGNATURE_TOO_LARGE_MESSAGE } = approval();
  assert.equal(MAX_SIGNATURE_BYTES, 65536);
  assert.equal(checkSignatureDataUrl(PNG), null);
  assert.equal(checkSignatureDataUrl(null), SIGNATURE_MESSAGE);
  assert.equal(checkSignatureDataUrl(''), SIGNATURE_MESSAGE);
  assert.equal(checkSignatureDataUrl('data:image/png;base64,'), SIGNATURE_MESSAGE, 'an empty image');
  assert.equal(checkSignatureDataUrl('data:image/jpeg;base64,/9j/4AAQ'), SIGNATURE_MESSAGE);
  const prefix = 'data:image/png;base64,';
  const atLimit = prefix + 'A'.repeat(MAX_SIGNATURE_BYTES - prefix.length);
  assert.equal(checkSignatureDataUrl(atLimit), null, 'exactly 64 KB is fine');
  assert.equal(checkSignatureDataUrl(`${atLimit}A`), SIGNATURE_TOO_LARGE_MESSAGE);
});

test('sign-off form: name, signature and the amounts checkbox are all required', () => {
  const { validateSignOff, buildApprovalBody, CONFIRM_MESSAGE, SIGNER_NAME_MESSAGE, SIGNATURE_MESSAGE } = approval();
  assert.equal(validateSignOff({ signerName: 'Dina Cruz', signature: PNG, confirmed: true }).valid, true);
  const empty = validateSignOff({ signerName: ' ', signature: null, confirmed: false });
  assert.equal(empty.valid, false);
  assert.deepEqual(plain(empty.errors), { signerName: SIGNER_NAME_MESSAGE, signature: SIGNATURE_MESSAGE, confirmed: CONFIRM_MESSAGE });
  assert.equal(validateSignOff({ signerName: 'D', signature: PNG, confirmed: true }).errors.signerName, SIGNER_NAME_MESSAGE);
  assert.equal(validateSignOff({ signerName: 'x'.repeat(81), signature: PNG, confirmed: true }).valid, false);
  assert.deepEqual(plain(buildApprovalBody({ signerName: '  Dina   Cruz ', signature: PNG })), { signerName: 'Dina Cruz', signature: PNG });
  assert.deepEqual(
    plain(buildApprovalBody({ signerName: 'Dina Cruz', signature: PNG }, { expectedGrossPay: 10000, expectedNetPay: 9500 })),
    { signerName: 'Dina Cruz', signature: PNG, expectedGrossPay: 10000, expectedNetPay: 9500 },
    'the amounts on screen go with the signature',
  );
  assert.deepEqual(
    plain(buildApprovalBody({ signerName: 'Dina Cruz', signature: PNG }, { expectedCount: 3, expectedNet: 59000 })),
    { signerName: 'Dina Cruz', signature: PNG, expectedCount: 3, expectedNet: 59000 },
  );
});

test('approve button: shown to every payroll role, enabled for signers only', () => {
  const { approveButtonState, SIGNER_ONLY_HINT, OWN_PAYSLIP_HINT, LOCKED_HINT } = approval();
  assert.deepEqual(plain(approveButtonState({ canSign: true, locked: false, isOwn: false })), { enabled: true });
  assert.deepEqual(plain(approveButtonState({ canSign: false, locked: false, isOwn: false })), { enabled: false, hint: SIGNER_ONLY_HINT });
  assert.deepEqual(plain(approveButtonState({ canSign: true, locked: false, isOwn: true })), { enabled: false, hint: OWN_PAYSLIP_HINT });
  assert.deepEqual(plain(approveButtonState({ canSign: true, locked: true, isOwn: false })), { enabled: false, hint: LOCKED_HINT });
});

test('approval labels and the approved-by line in the payroll timezone', () => {
  const { isPayslipApproved, approvalStatusLabel, approvedByLine, formatApprovalDate } = approval();
  const approved = { approvalStatus: 'approved', approvalSignerName: 'Dina Cruz', approvedAt: '2026-10-27T17:30:00.000Z' };
  assert.equal(isPayslipApproved(approved), true);
  assert.equal(isPayslipApproved({ approvalStatus: 'draft' }), false);
  assert.equal(isPayslipApproved(null), false);
  assert.equal(approvalStatusLabel(approved), 'Approved for disbursement');
  assert.equal(approvalStatusLabel({}), 'Waiting for disbursement approval');
  // 17:30 UTC on Oct 27 is Oct 28 in Manila.
  assert.equal(formatApprovalDate(approved.approvedAt), 'Oct 28, 2026');
  assert.equal(approvedByLine(approved), 'Approved by Dina Cruz on Oct 28, 2026');
  assert.equal(formatApprovalDate('not a date'), '');
  assert.equal(approvedByLine({ approvalStatus: 'approved' }), 'Approved by a disbursement officer');
});

test('a locked period never shows an unsigned payslip as awaiting approval', () => {
  const { approvalDisplayState, LOCKED_WITHOUT_SIGN_OFF } = approval();
  // Review fix 2026-10-28: payslips from before the sign-off release are draft forever.
  assert.equal(approvalDisplayState({ approvalStatus: 'draft' }, false), 'pending');
  assert.equal(approvalDisplayState({ approvalStatus: 'draft' }, true), 'locked-unsigned');
  assert.equal(approvalDisplayState({}, true), 'locked-unsigned', 'no approval fields at all');
  assert.equal(approvalDisplayState(null, true), 'locked-unsigned');
  assert.equal(approvalDisplayState({ approvalStatus: 'approved' }, true), 'approved', 'a signed payslip stays signed when locked');
  assert.equal(approvalDisplayState({ approvalStatus: 'approved' }, false), 'approved');
  assert.equal(LOCKED_WITHOUT_SIGN_OFF, 'Locked without sign-off');
});

test('lock prompt names the unapproved payslips and reads the 409 count', () => {
  const { lockConfirmMessage, parseUnapprovedCount } = approval();
  assert.match(lockConfirmMessage('Oct 16, 2026 to Oct 31, 2026', 0), /^Lock the payroll period Oct 16, 2026 to Oct 31, 2026\?/);
  assert.match(lockConfirmMessage('Oct 2026', 1), /^1 payslip is not approved for disbursement yet\. Lock the payroll period Oct 2026\?.* Lock it anyway\?$/);
  assert.match(lockConfirmMessage('Oct 2026', 3), /^3 payslips are not approved/);
  // The server's 409 messages.
  assert.equal(parseUnapprovedCount('1 payslip is not approved for disbursement yet.'), 1);
  assert.equal(parseUnapprovedCount('12 payslips are not approved for disbursement yet.'), 12);
  assert.equal(parseUnapprovedCount('Period is already processed'), null);
  assert.equal(parseUnapprovedCount(undefined), null);
  // A non-signer's 409 (review fix 2026-10-28) is shown as it is, never read as a force prompt.
  assert.equal(parseUnapprovedCount('2 payslips are not approved. A Disbursement Officer or an admin can lock anyway.'), null);
});

test('period progress and the approve-all result line', () => {
  const { approvalProgressLabel, approveAllResultLine } = approval();
  assert.equal(approvalProgressLabel({ total: 5, approved: 3 }), '3 of 5 approved');
  assert.equal(approvalProgressLabel({ total: 0, approved: 0 }), '');
  assert.equal(approvalProgressLabel(null), '');
  assert.equal(approveAllResultLine({ approved: 3, alreadyApproved: 0, skippedOwn: 0 }), 'Approved 3 payslips.');
  assert.equal(
    approveAllResultLine({ approved: 1, alreadyApproved: 2, skippedOwn: 1 }),
    'Approved 1 payslip. 2 payslips already had an approval. Your own payslip needs another signer.',
  );
  // Review fix 2026-10-28: payslips the signer edited are left for another signer.
  assert.equal(approveAllResultLine({ approved: 2, alreadyApproved: 0, skippedOwn: 0, skippedEdited: 1 }), 'Approved 2 payslips. 1 payslip you edited needs another signer.');
  assert.equal(approveAllResultLine({ approved: 0, alreadyApproved: 0, skippedOwn: 0, skippedEdited: 3 }), 'Approved 0 payslips. 3 payslips you edited need another signer.');
});

test('PDF approval block: the plain signature line until approved, then the green block', () => {
  const { drawPdfApprovalBlock } = approval();
  const recorder = () => {
    const calls = [];
    const doc = new Proxy({}, {
      get: (_target, name) => (...args) => {
        calls.push([name, ...args]);
        return name === 'splitTextToSize' ? [String(args[0])] : undefined;
      },
    });
    return { doc, calls };
  };
  const plainLine = recorder();
  drawPdfApprovalBlock(plainLine.doc, { approvalStatus: 'draft' }, 110, 200, 80);
  assert.deepEqual(plain(plainLine.calls), [['line', 110, 200, 190, 200], ['text', 'Authorized Signature', 110, 205]]);

  const signed = recorder();
  drawPdfApprovalBlock(signed.doc, { approvalStatus: 'approved', approvalSignerName: 'Dina Cruz', approvedAt: '2026-10-28T02:00:00.000Z', approvalSignature: PNG }, 110, 200, 80);
  const names = signed.calls.map((call) => call[0]);
  assert.ok(names.includes('roundedRect'));
  const image = signed.calls.find((call) => call[0] === 'addImage');
  assert.deepEqual(plain(image.slice(1, 3)), [PNG, 'PNG']);
  const texts = signed.calls.filter((call) => call[0] === 'text').map((call) => call[1]);
  assert.ok(texts.includes('APPROVED FOR DISBURSEMENT'));
  assert.deepEqual(plain(texts.at(-1)), ['Approved by Dina Cruz on Oct 28, 2026']);
});
