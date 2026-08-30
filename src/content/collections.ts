import type { Entry, NoteMeta, PostMeta, ProjectMeta, StashMeta } from './schema';

/**
 * Loads every MDX file at build time.
 *
 * `eager: true` is deliberate. The site prerenders each route in a real browser
 * and the whole corpus is a few dozen small files, so lazy chunks would buy a
 * negligible bundle saving in exchange for every list needing a loading state.
 * Revisit if the post count reaches the hundreds.
 */
type MdxModule<T> = {
  default: Entry<T>['Content'];
  frontmatter: T;
};

const load = <T extends { slug: string; draft?: boolean }>(
  modules: Record<string, unknown>,
): Entry<T>[] =>
  Object.values(modules as Record<string, MdxModule<T>>)
    .map(({ default: Content, frontmatter }) => ({ ...frontmatter, Content }))
    // Drafts are visible while running locally so they can be previewed, and
    // dropped from the build so an unfinished post can sit in the repo.
    .filter((entry) => import.meta.env.DEV || !entry.draft);

export const projects = load<ProjectMeta>(
  import.meta.glob('./projects/*.mdx', { eager: true }),
).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));

export const posts = load<PostMeta>(import.meta.glob('./posts/*.mdx', { eager: true })).sort(
  (a, b) => b.date.localeCompare(a.date),
);

export const stash = load<StashMeta>(import.meta.glob('./stash/*.mdx', { eager: true })).sort(
  (a, b) => b.date.localeCompare(a.date),
);

export const notes = load<NoteMeta>(import.meta.glob('./notes/*.mdx', { eager: true }));

export const findProject = (slug: string) => projects.find((p) => p.slug === slug);
export const findPost = (slug: string) => posts.find((p) => p.slug === slug);
export const findStash = (slug: string) => stash.find((s) => s.slug === slug);

/** Every route the content produces — the sitemap and prerender both read this. */
export const contentRoutes = () => [
  '/',
  '/writing',
  ...projects.map((p) => `/project/${p.slug}`),
  ...stash.map((s) => `/stash/${s.slug}`),
  ...posts.map((p) => `/writing/${p.slug}`),
];
