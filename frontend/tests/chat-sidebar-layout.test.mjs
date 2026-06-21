import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadChatSidebarLayoutHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/chat-sidebar-layout.ts');
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

test('chat sidebar delete buttons stay subtle until hover or focus', () => {
  const { getChatSidebarArchiveButtonClass, getChatSidebarDeleteButtonClass } = loadChatSidebarLayoutHelpers();

  const activeClass = getChatSidebarDeleteButtonClass(true);
  const inactiveClass = getChatSidebarDeleteButtonClass(false);
  const archiveClass = getChatSidebarArchiveButtonClass(false);

  assert.match(activeClass, /h-10/);
  assert.match(activeClass, /w-10/);
  assert.doesNotMatch(activeClass, /rounded-full/);
  assert.doesNotMatch(activeClass, /hover:bg-white/);
  assert.doesNotMatch(activeClass, /bg-red-700/);
  assert.match(activeClass, /hover:bg-red-500\/15/);

  assert.doesNotMatch(inactiveClass, /bg-red-700/);
  assert.match(inactiveClass, /hover:bg-red-500\/10/);
  assert.match(inactiveClass, /focus-visible:ring-red-500\/40/);

  assert.match(archiveClass, /h-10/);
  assert.match(archiveClass, /hover:bg-\[var\(--accent\)\]\/10/);
  assert.doesNotMatch(archiveClass, /red-500/);
});
