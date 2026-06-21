import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDailyLogComments() {
  const helperPath = path.resolve(__dirname, '../src/lib/daily-log-comments.ts');
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

test('counts daily-log comments from the comment thread', () => {
  const { getDailyLogCommentCount } = loadDailyLogComments();

  assert.equal(getDailyLogCommentCount({ comments: [] }), 0);
  assert.equal(getDailyLogCommentCount({ comments: [{ id: 'c1' }, { id: 'c2' }] }), 2);
});

test('labels and gates daily-log comment ownership', () => {
  const {
    canDeleteDailyLogComment,
    getDailyLogCommentAuthorLabel,
  } = loadDailyLogComments();
  const comment = {
    authorId: 'user-1',
    author: { name: 'Admin User', email: 'admin@example.test' },
  };

  assert.equal(getDailyLogCommentAuthorLabel(comment, 'user-1'), 'You');
  assert.equal(getDailyLogCommentAuthorLabel(comment, 'user-2'), 'Admin User');
  assert.equal(canDeleteDailyLogComment(comment, 'user-1'), true);
  assert.equal(canDeleteDailyLogComment(comment, 'user-2'), false);
});
