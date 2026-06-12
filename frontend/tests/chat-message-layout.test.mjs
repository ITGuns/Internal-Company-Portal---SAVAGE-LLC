import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadChatMessageLayoutHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/chat-message-layout.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    console,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('places message reaction trigger beside the bubble', () => {
  const { getChatMessageActionLayout } = loadChatMessageLayoutHelpers();

  const ownLayout = getChatMessageActionLayout(true);
  const teammateLayout = getChatMessageActionLayout(false);

  assert.match(ownLayout.row, /justify-end/);
  assert.match(ownLayout.actionRail, /order-first/);
  assert.match(ownLayout.pickerPanel, /right-0/);
  assert.doesNotMatch(ownLayout.reactionChips, /SmilePlus|Open quick reactions/);

  assert.match(teammateLayout.row, /justify-start/);
  assert.match(teammateLayout.actionRail, /order-last/);
  assert.match(teammateLayout.pickerPanel, /left-0/);
});
