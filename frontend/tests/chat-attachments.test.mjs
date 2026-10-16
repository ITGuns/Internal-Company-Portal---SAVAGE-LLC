import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadChat(imports = {}) {
  const helperPath = path.resolve(__dirname, '../src/lib/chat.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: () => imports,
  }, { filename: helperPath });
  return compiledModule.exports;
}

// Values built in the vm realm have their own prototypes; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));
const stored = { name: 'team_photo.png', type: 'image/png', size: 1572864, uploadId: 'cmabc123' };

test('a new message attachment is the stored-upload metadata', () => {
  const { parseChatAttachment } = loadChat();
  assert.deepEqual(plain(parseChatAttachment(JSON.stringify(stored))), { kind: 'stored', file: stored });
});

test('older attachments stay inline and render as before', () => {
  const { parseChatAttachment } = loadChat();
  for (const src of ['data:image/png;base64,iVBORw0KGgo=', 'data:application/pdf;base64,JVBERi0=', '/uploads/old-photo.jpg']) {
    assert.deepEqual(plain(parseChatAttachment(src)), { kind: 'inline', src });
  }
  // JSON without an uploadId, or broken JSON, is not the stored shape either.
  assert.equal(parseChatAttachment('{"name":"x.png"}').kind, 'inline');
  assert.equal(parseChatAttachment('{not json').kind, 'inline');
  assert.equal(parseChatAttachment(''), null);
  assert.equal(parseChatAttachment(undefined), null);
  assert.equal(parseChatAttachment(null), null);
});

test('file sizes read in B, KB or MB', () => {
  const { formatAttachmentSize } = loadChat();
  assert.equal(formatAttachmentSize(512), '512 B');
  assert.equal(formatAttachmentSize(1536), '1.5 KB');
  assert.equal(formatAttachmentSize(1572864), '1.5 MB');
});

test('the file is uploaded first and the message carries only its metadata', async () => {
  const calls = [];
  const apiFetch = async (endpoint, options) => {
    calls.push({ endpoint, body: JSON.parse(options.body) });
    const payload = endpoint === '/uploads'
      ? { id: stored.uploadId, url: `/api/uploads/files/${stored.uploadId}`, filename: 'x.png', name: stored.name, type: stored.type, size: stored.size }
      : { id: 'msg-1' };
    return { json: async () => payload };
  };
  const fileToDataUri = async () => 'data:image/png;base64,iVBORw0KGgo=';
  const { uploadChatAttachment, sendMessage } = loadChat({ apiFetch, fileToDataUri });

  const file = { name: 'Team Photo.png', type: 'image/png', size: stored.size };
  const uploaded = await uploadChatAttachment(file);
  assert.deepEqual(plain(uploaded), stored);
  await sendMessage('conv-1', '', uploaded);

  assert.deepEqual(calls.map((call) => call.endpoint), ['/uploads', '/chat/conv-1/messages']);
  assert.deepEqual(calls[0].body, { name: 'Team Photo.png', type: 'image/png', data: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.deepEqual(calls[1].body, { content: '', attachment: stored });
});
