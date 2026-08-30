import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

/**
 * Snapshots the built app to static HTML, one file per route.
 *
 * The app is rendered by a real browser rather than `renderToString`, because
 * what makes a route interesting here happens in effects: `PanelRouteSync`
 * resolves the URL into an open tab, and `useDocumentMeta` writes that route's
 * title, description, canonical and OG tags. A server render would run neither,
 * so every route would emit identical markup with the index.html defaults —
 * which is the problem this is meant to solve.
 *
 * `main.tsx` uses `createRoot`, not `hydrateRoot`, so React replaces this markup
 * outright on load. Nothing here has to match what the client would produce, and
 * there are no hydration mismatches to reconcile — the snapshot exists for
 * crawlers, unfurlers and first paint.
 */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Static file server over `dist`, with the SPA fallback the real host provides. */
const serve = (root: string) =>
  createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(root, path);

    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    } catch {
      // Unknown path — hand back the shell and let the router decide, exactly as
      // GitHub Pages does through 404.html.
      file = join(root, 'index.html');
    }

    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

export const prerender = async (dist: string, routes: string[]) => {
  // Imported lazily so `vite.config.ts` stays cheap to load for `vite dev`.
  const { default: puppeteer } = await import('puppeteer');

  const server = serve(dist);
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as { port: number };

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  let written = 0;

  try {
    for (const route of routes) {
      // A fresh context per route, because every route is served from the same
      // origin and therefore shares localStorage. Without isolation the tabs
      // opened while crawling one route persist into the next, `PanelProvider`
      // restores the last one, and route-sync navigates away from the URL being
      // captured — which silently wrote hale's title and canonical into the
      // stash page.
      const context = await browser.createBrowserContext();
      const page = await context.newPage();

      // GitHub's API is rate limited and its answers age. Baking "2 months ago"
      // and a commit subject into static HTML would ship prose that silently
      // goes stale, so those requests are refused and the client fills them in.
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.url().includes('api.github.com')) request.abort();
        else request.continue();
      });

      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle0' });
      // The app renders into an empty #root, so content there is the signal that
      // React has committed.
      await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0);

      const html = await page.evaluate(() => {
        // The pre-paint script in index.html sets this from localStorage on every
        // load, so a theme captured from the crawl would only fight it.
        document.documentElement.classList.remove('dark');
        return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
      });

      const dir = route === '/' ? dist : join(dist, route);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'index.html'), html);

      await page.close();
      await context.close();
      written += 1;
    }
  } finally {
    await browser.close();
    server.close();
  }

  return written;
};

export const distDir = (root: string) => resolve(root, 'dist');
