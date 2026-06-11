import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEscapeLayerStack() {
  const helperPath = path.resolve(__dirname, '../src/lib/escape-layer-stack.ts');
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

test('escape layers close the most recently opened surface first', () => {
  const {
    __resetEscapeLayersForTests,
    addEscapeLayer,
    createEscapeLayerId,
    isTopEscapeLayer,
    removeEscapeLayer,
  } = loadEscapeLayerStack();

  __resetEscapeLayersForTests();

  const firstLayer = createEscapeLayerId();
  const secondLayer = createEscapeLayerId();

  addEscapeLayer(firstLayer);
  assert.equal(isTopEscapeLayer(firstLayer), true);

  addEscapeLayer(secondLayer);
  assert.equal(isTopEscapeLayer(firstLayer), false);
  assert.equal(isTopEscapeLayer(secondLayer), true);

  removeEscapeLayer(secondLayer);
  assert.equal(isTopEscapeLayer(firstLayer), true);

  removeEscapeLayer(firstLayer);
  assert.equal(isTopEscapeLayer(firstLayer), false);
});

test('escape layers remove the latest matching duplicate registration only', () => {
  const {
    __resetEscapeLayersForTests,
    addEscapeLayer,
    createEscapeLayerId,
    isTopEscapeLayer,
    removeEscapeLayer,
  } = loadEscapeLayerStack();

  __resetEscapeLayersForTests();

  const firstLayer = createEscapeLayerId();
  const secondLayer = createEscapeLayerId();

  addEscapeLayer(firstLayer);
  addEscapeLayer(secondLayer);
  addEscapeLayer(firstLayer);

  assert.equal(isTopEscapeLayer(firstLayer), true);

  removeEscapeLayer(firstLayer);
  assert.equal(isTopEscapeLayer(secondLayer), true);
});
