const CACHE_MS = 5 * 60 * 1000;
let cached;
let pending;

const unavailable = (status) =>
  Response.json(
    { error: 'Visitor statistics unavailable' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );

async function readStats(code) {
  const endAt = Date.now();
  const url = new URL(`https://${code}.goatcounter.com/counter/TOTAL.json`);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error('Analytics request failed');

  const stats = await response.json();
  // The public endpoint returns an English-formatted string, e.g. "1,240".
  if (typeof stats?.count !== 'string' || !/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(stats.count)) {
    throw new Error('Invalid visit count');
  }
  const pageVisits = Number(stats.count.replaceAll(',', ''));
  if (!Number.isSafeInteger(pageVisits)) throw new Error('Invalid visit count');

  const data = { pageVisits, period: 'all-time', updatedAt: new Date(endAt).toISOString() };
  cached = { data, expiresAt: Date.now() + CACHE_MS };
  return data;
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return new Response(null, {
        status: 405,
        headers: { Allow: 'GET', 'Cache-Control': 'no-store' },
      });
    }

    const code = process.env.VITE_GOATCOUNTER_CODE?.trim();
    if (!code || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(code)) return unavailable(503);

    try {
      let data = cached?.expiresAt > Date.now() ? cached.data : null;
      if (!data) {
        // Coalesce cache misses in a warm function; the CDN shares results
        // between browsers. Neither cache stores failed upstream responses.
        pending ??= readStats(code).finally(() => {
          pending = undefined;
        });
        data = await pending;
      }
      // Don't restart a full CDN lifetime for an almost-expired warm cache.
      const ttl = Math.max(0, Math.ceil((cached.expiresAt - Date.now()) / 1000));
      return Response.json(data, {
        headers: {
          'Cache-Control': `public, max-age=${Math.min(60, ttl)}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${ttl}`,
        },
      });
    } catch {
      return unavailable(502);
    }
  },
};
