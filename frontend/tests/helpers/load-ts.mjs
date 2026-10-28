import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

/**
 * Loads a TypeScript module from src/ the way the other tests do (transpile to
 * CommonJS, run in a fresh vm context) and resolves its relative imports the
 * same way, so a helper that imports lib/payroll-dates.ts stays testable.
 * Type-only imports are elided by transpileModule. `stubs` replaces imports
 * by specifier (for example { './api': { apiFetch } }).
 * Not a test file itself: the npm test glob is tests/*.test.mjs.
 */
export function loadTsModule(absolutePath, { stubs = {}, globals = {} } = {}, cache = new Map()) {
  const cached = cache.get(absolutePath);
  if (cached) return cached.exports;

  const { outputText } = ts.transpileModule(fs.readFileSync(absolutePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const compiledModule = { exports: {} };
  cache.set(absolutePath, compiledModule);

  const requireModule = (specifier) => {
    if (Object.prototype.hasOwnProperty.call(stubs, specifier)) return stubs[specifier];
    if (!specifier.startsWith('.')) {
      throw new Error(`Unexpected import "${specifier}" in ${absolutePath}`);
    }
    const base = path.resolve(path.dirname(absolutePath), specifier);
    const file = [`${base}.ts`, `${base}.tsx`].find((candidate) => fs.existsSync(candidate));
    if (!file) throw new Error(`Cannot resolve "${specifier}" from ${absolutePath}`);
    return loadTsModule(file, { stubs, globals }, cache);
  };

  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: requireModule,
    console,
    Date,
    Intl,
    ...globals,
  }, { filename: absolutePath });

  return compiledModule.exports;
}

/** Copies a value made inside a vm context into this realm, for deepEqual. */
export const plain = (value) => JSON.parse(JSON.stringify(value));
