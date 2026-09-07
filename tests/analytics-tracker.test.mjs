import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/analytics.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replaceAll('import.meta.env', 'environment'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function tracker(prod = true, hostname = 'www.nishantg.com', code = 'test-site') {
  const scripts = [];
  const scope = {
    exports: {},
    environment: { PROD: prod, VITE_GOATCOUNTER_CODE: code },
    window: { location: { hostname } },
    document: {
      title: 'Portfolio',
      getElementById: (id) => scripts.find((script) => script.id === id),
      createElement: () => ({ dataset: {} }),
      head: { appendChild: (script) => scripts.push(script) },
    },
  };
  vm.runInNewContext(compiled, scope);
  return { scope, scripts, api: scope.exports };
}

test('development, previews, prerendering, and invalid config never load tracking', () => {
  for (const args of [
    [false],
    [true, 'localhost'],
    [true, '127.0.0.1'],
    [true, 'preview.vercel.app'],
    [true, 'www.nishantg.com', ''],
    [true, 'www.nishantg.com', 'evil.com/path'],
  ]) {
    const { api, scripts } = tracker(...args);
    api.startAnalytics();
    api.trackPageVisit('/');
    assert.equal(scripts.length, 0);
  }
});

test('one script, queued initial visit, duplicate suppression, and route revisits', () => {
  const { api, scripts, scope } = tracker();
  api.startAnalytics();
  api.startAnalytics();
  assert.equal(scripts.length, 1);
  assert.equal(scope.window.goatcounter.no_onload, true);
  assert.equal(scripts[0].dataset.goatcounter, 'https://test-site.goatcounter.com/count');
  api.trackPageVisit('/');
  api.trackPageVisit('/');
  api.trackPageVisit('/skills/video2ascii');
  const visits = [];
  scope.window.goatcounter.count = (visit) => visits.push(visit.path);
  scripts[0].onload();
  api.trackPageVisit('/skills/video2ascii');
  api.trackPageVisit('/');
  assert.deepEqual(visits, ['/', '/skills/video2ascii', '/']);
});

test('blocked script does not break subsequent navigation', () => {
  const { api, scripts } = tracker();
  api.startAnalytics();
  api.trackPageVisit('/');
  scripts[0].onerror();
  assert.doesNotThrow(() => api.trackPageVisit('/skills/video2ascii'));
});
