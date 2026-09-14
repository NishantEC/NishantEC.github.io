import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/content/featured.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const scope = { exports: {} };
vm.runInNewContext(compiled, scope);

test('keeps curated entries in display order and skips unavailable entries', () => {
  const entries = [{ slug: 'neko' }, { slug: 'cterm' }, { slug: 'enform' }];
  assert.deepEqual(
    [...scope.exports.selectBySlug(entries, ['enform', 'cterm', 'missing'])],
    [{ slug: 'enform' }, { slug: 'cterm' }],
  );
});
