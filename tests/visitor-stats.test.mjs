import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

let handler;
let originalFetch;
let originalEnv;
let instance = 0;
const originalNow = Date.now;

beforeEach(async () => {
  originalFetch = globalThis.fetch;
  originalEnv = { ...process.env };
  process.env.VITE_GOATCOUNTER_CODE = 'test-website';
  handler = (await import(`../api/stats.js?test=${instance++}`)).default;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  Date.now = originalNow;
});

const request = (method = 'GET') => new Request('https://www.nishantg.com/api/stats', { method });

test('missing site configuration return a non-cacheable unavailable response', async () => {
  delete process.env.VITE_GOATCOUNTER_CODE;
  globalThis.fetch = () => assert.fail('must not call GoatCounter');
  const response = await handler.fetch(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { error: 'Visitor statistics unavailable' });
});

test('only GET is accepted', async () => {
  globalThis.fetch = () => assert.fail('must not call GoatCounter');
  const response = await handler.fetch(request('POST'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET');
});

test('returns only the public aggregate and caches concurrent requests', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://test-website.goatcounter.com');
    assert.equal(parsed.pathname, '/counter/TOTAL.json');
    assert.equal(parsed.search, '');
    assert.equal(options.headers.Authorization, undefined);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ count: '1,240', count_unique: '1,240', extra: 'never expose' });
  };
  const responses = await Promise.all([handler.fetch(request()), handler.fetch(request())]);
  assert.equal(calls, 1);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), 'public, s-maxage=300');
    const body = await response.json();
    assert.deepEqual(Object.keys(body).sort(), ['pageVisits', 'period', 'updatedAt']);
    assert.equal(body.pageVisits, 1240);
    assert.equal(body.period, 'all-time');
  }
  await handler.fetch(request());
  assert.equal(calls, 1);
});

test('accepts a real zero', async () => {
  globalThis.fetch = async () => Response.json({ count: '0' });
  const response = await handler.fetch(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).pageVisits, 0);
});

test('cache expires after five minutes and CDN lifetime uses the remaining age', async () => {
  let now = originalNow();
  Date.now = () => now;
  let calls = 0;
  globalThis.fetch = async () => Response.json({ count: String(++calls) });
  await handler.fetch(request());
  now += 299000;
  const cached = await handler.fetch(request());
  assert.equal((await cached.json()).pageVisits, 1);
  assert.equal(cached.headers.get('Vercel-CDN-Cache-Control'), 'public, s-maxage=1');
  now += 1001;
  assert.equal((await (await handler.fetch(request())).json()).pageVisits, 2);
});

test('rejects malformed counts without caching or leaking upstream errors', async () => {
  for (const count of [null, -1, 1.5, '1,2', '', {}, '9007199254740992']) {
    globalThis.fetch = async () => Response.json({ count });
    const response = await handler.fetch(request());
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { error: 'Visitor statistics unavailable' });
  }
});

test('upstream failures are recoverable and do not leak credentials', async () => {
  globalThis.fetch = async () => new Response('private-test-key', { status: 401 });
  assert.equal((await handler.fetch(request())).status, 502);
  globalThis.fetch = async () => {
    throw new Error('private-test-key');
  };
  const failed = await handler.fetch(request());
  assert.equal(failed.status, 502);
  assert.ok(!(await failed.text()).includes('private-test-key'));
  globalThis.fetch = async () => Response.json({ count: '7' });
  assert.equal((await handler.fetch(request())).status, 200);
});
