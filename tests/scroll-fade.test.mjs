import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/components/ui/BlurGradient.tsx', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

test('uses a compact four-rem blur strip at both edges', () => {
  assert.match(source, /z-40 h-16/);
  assert.doesNotMatch(source, /z-40 h-32/);
});

function visibility(scrollTop, scrollHeight, clientHeight) {
  const scope = { exports: {}, require: () => ({}) };
  vm.runInNewContext(compiled, scope);
  return { ...scope.exports.getScrollFadeVisibility({ scrollTop, scrollHeight, clientHeight }) };
}

test('shows neither fade when the viewport already contains the whole page', () => {
  assert.deepEqual(visibility(0, 600, 600), { top: false, bottom: false });
});

test('shows only the bottom fade at the beginning of a scrollable page', () => {
  assert.deepEqual(visibility(0, 1200, 600), { top: false, bottom: true });
});

test('shows both fades between the page edges', () => {
  assert.deepEqual(visibility(100, 1200, 600), { top: true, bottom: true });
});

test('hides the bottom fade at the end of the page', () => {
  assert.deepEqual(visibility(600, 1200, 600), { top: true, bottom: false });
});
