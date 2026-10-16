import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadUploadLimits() {
  const helperPath = path.resolve(__dirname, '../src/lib/upload-limits.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports }, { filename: helperPath });
  return compiledModule.exports;
}

const limits = loadUploadLimits();

test('uploads stop at 3 MB, under the 4.5 MB Vercel body cap after base64', () => {
  assert.equal(limits.MAX_UPLOAD_BYTES, 3 * 1024 * 1024);
  assert.ok((limits.MAX_UPLOAD_BYTES * 4) / 3 < 4.5 * 1000 * 1000);
  assert.equal(limits.fileTooLargeMessage({ name: 'plan.pdf', size: limits.MAX_UPLOAD_BYTES }), null);
  assert.equal(
    limits.fileTooLargeMessage({ name: 'plan.pdf', size: limits.MAX_UPLOAD_BYTES + 1 }),
    'plan.pdf is larger than 3 MB. Choose a smaller file.',
  );
});

test('chat attachments go through the uploads service, so they share the 3 MB limit', () => {
  assert.equal(limits.MAX_CHAT_ATTACHMENT_BYTES, undefined, 'no separate chat limit');
  assert.equal(limits.fileTooLargeMessage({ name: 'photo.png', size: 1.5 * 1024 * 1024 }), null);
  assert.equal(
    limits.fileTooLargeMessage({ name: 'photo.jpg', size: 4 * 1024 * 1024 }),
    'photo.jpg is larger than 3 MB. Choose a smaller file.',
  );
});

test('ticket attachments share 700 KB under the 1 MB parser', () => {
  assert.ok((limits.MAX_TICKET_ATTACHMENTS_BYTES * 4) / 3 < 1024 * 1024);
  assert.equal(limits.ticketAttachmentsTooLargeMessage([{ name: 'a.png', size: 300 * 1024 }, { name: 'b.png', size: 400 * 1024 }]), null);
  assert.equal(
    limits.ticketAttachmentsTooLargeMessage([{ name: 'a.png', size: 400 * 1024 }, { name: 'b.png', size: 400 * 1024 }]),
    'Attachments can be up to 700 KB in total. Remove a file or choose smaller ones.',
  );
});
