import { readdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import Icons from 'unplugin-icons/vite';
import { defineConfig, type Plugin } from 'vite';

const SITE = 'https://www.nishantg.com';

/**
 * Routes derived from the content directory.
 *
 * This used to be a literal list, because importing the old data modules pulled
 * their PNG imports through a bundler that can't read them. Content is now MDX
 * files whose filename is the slug, so the directory listing *is* the route
 * list — no import, and nothing to forget to update when a project is added.
 *
 * Drafts are skipped, because `collections.ts` drops them from the build too.
 * Without this the prerender would emit a page for an entry the app no longer
 * resolves — a 404 rendered at a real URL, and listed in the sitemap.
 */
const isDraft = (file: string) => {
  const [, frontmatter = ''] = readFileSync(file, 'utf8').split('---', 2);
  return /^draft:\s*true\s*$/m.test(frontmatter);
};

const slugsIn = (dir: string) => {
  const base = resolve(__dirname, 'src/content', dir);
  return readdirSync(base)
    .filter((file) => file.endsWith('.mdx'))
    .filter((file) => !isDraft(resolve(base, file)))
    .map((file) => file.replace(/\.mdx$/, ''));
};

const ROUTES = [
  '/',
  ...slugsIn('projects').map((slug) => `/project/${slug}`),
  ...slugsIn('skills').map((slug) => `/skills/${slug}`),
];

/**
 * Snapshots each route to static HTML after the bundle is written. Runs last so
 * it renders the finished build rather than a half-written one.
 */
const prerenderPlugin = (): Plugin => ({
  name: 'prerender',
  apply: 'build',
  enforce: 'post',
  async closeBundle() {
    const { prerender } = await import('./scripts/prerender');
    const count = await prerender(resolve(__dirname, 'dist'), ROUTES);
    console.log(`prerender: ${count} routes`);
  },
});

const sitemap = (): Plugin => ({
  name: 'sitemap',
  apply: 'build',
  async closeBundle() {
    const today = new Date().toISOString().slice(0, 10);
    const body = ROUTES.map(
      (path) => `  <url>\n    <loc>${SITE}${path}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
    ).join('\n');

    await writeFile(
      resolve(__dirname, 'dist/sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    );

    console.log(`sitemap: ${ROUTES.length} urls`);
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Ahead of the React plugin: MDX has to become JSX before React sees it.
    // `remarkMdxFrontmatter` turns the YAML block into a named `frontmatter`
    // export, which is what `collections.ts` reads.
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [
          remarkFrontmatter,
          [remarkMdxFrontmatter, { name: 'frontmatter' }],
          remarkGfm,
        ],
        providerImportSource: '@mdx-js/react',
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    sitemap(),
    prerenderPlugin(),
  ],
});
