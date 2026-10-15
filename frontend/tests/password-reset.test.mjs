import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPasswordResetHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/password-reset.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports }, { filename: helperPath });
  return compiledModule.exports;
}

const helpers = loadPasswordResetHelpers();
const EMAIL = 'member1@example.test';

/** Real random bytes, copied into the helper's own array. */
function strongRandom(bytes) {
  const random = crypto.randomBytes(bytes.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = random[i];
  return bytes;
}

/** Each call fills the array with the next scripted values, zero padded. */
function scriptedRandom(calls) {
  return (bytes) => {
    const next = calls.shift() ?? [];
    bytes.fill(0);
    next.forEach((value, index) => { bytes[index] = value; });
    return bytes;
  };
}

function check(password, confirm = password, email = EMAIL) {
  return { ...helpers.validateResetPasswordForm({ password, confirm }, email) };
}

test('the alphabet has letters and digits without look-alikes', () => {
  assert.equal(helpers.PASSWORD_ALPHABET.length, 56);
  for (const lookAlike of ['0', 'O', 'o', '1', 'l', 'I']) {
    assert.equal(helpers.PASSWORD_ALPHABET.includes(lookAlike), false, lookAlike);
  }
});

test('generated passwords are 12 characters from the alphabet and pass the server rules', () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const password = helpers.generatePassword(strongRandom);
    assert.equal(password.length, helpers.GENERATED_PASSWORD_LENGTH);
    assert.equal(password.length, 12);
    assert.match(password, /^[A-HJ-NP-Za-km-z2-9]+$/);
    assert.match(password, /[a-z]/);
    assert.equal(helpers.getPasswordProblem(password, EMAIL), null);
    seen.add(password);
  }
  assert.equal(seen.size, 300, 'no repeats');
});

test('the generator skips biased bytes and draws again when a kind of character is missing', () => {
  const calls = [
    // First draw: twelve "A" with no lowercase letter or digit, so it is thrown away.
    [],
    // Second draw: 255 and 224 are skipped; 56 wraps to "A" and 223 to "9".
    [255, 224, 56, 24, 48, 1, 25, 49, 2, 26, 50, 3, 27, 223],
  ];
  assert.equal(helpers.generatePassword(scriptedRandom(calls)), 'Aa2Bb3Cc4Dd9');
  assert.equal(calls.length, 0, 'both draws were used');
});

test('the generator gives up instead of looping forever on a broken random source', () => {
  assert.throws(() => helpers.generatePassword((bytes) => bytes.fill(0)), /Could not generate a password/);
});

test('validation uses the server rules and wording', () => {
  assert.deepEqual(check('Abcdefg1'), {});
  assert.deepEqual(check(`A1${'x'.repeat(70)}`), {}, '72 characters is allowed');
  assert.deepEqual(check(''), { password: 'New password is required', confirm: 'Type the new password again' });
  assert.deepEqual(check('Abcde12'), { password: 'Password must be at least 8 characters' });
  assert.deepEqual(check(`A1${'x'.repeat(71)}`), { password: 'Password must be at most 72 characters' });
  assert.deepEqual(check('abcdefg1'), { password: 'Password must contain at least one uppercase letter' });
  assert.deepEqual(check('Abcdefgh'), { password: 'Password must contain at least one number' });
  assert.deepEqual(check('Member1@Example.TEST'), { password: 'Password must not be the same as the email address' });
  assert.deepEqual(check('Member1@Example.TEST', 'Member1@Example.TEST', null), {}, 'no email, no email rule');
});

test('both fields must match', () => {
  assert.deepEqual(check('Abcdefg1', 'Abcdefg2'), { confirm: 'The two passwords do not match' });
  assert.deepEqual(check('Abcdefg1', ''), { confirm: 'Type the new password again' });
  assert.deepEqual(check('short', 'other'), {
    password: 'Password must be at least 8 characters',
    confirm: 'The two passwords do not match',
  });
});
