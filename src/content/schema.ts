/**
 * The content model.
 *
 * Everything the site renders comes from MDX files under `src/content`, loaded
 * through `collections.ts`. These types are the contract between what an author
 * writes in frontmatter and what a component can rely on — Keystatic's config
 * mirrors them, so a field added in one place has to be added in both.
 *
 * Deliberately absent: stars, last commit, language. Those are read live from
 * the GitHub API. A number written into frontmatter is a number someone has to
 * remember to update, and it will be wrong within a month.
 */

/** Where a project actually stands, rather than implying everything is finished. */
export type ProjectStatus = 'shipped' | 'wip' | 'archived' | 'experiment';

export type ProjectMeta = {
  title: string;
  /** URL segment and the key used to look the repo up on GitHub. */
  slug: string;
  /** One sentence. Shown on the card and used as the route's meta description. */
  tagline: string;
  status: ProjectStatus;
  /** Year work started, or a range like "2025–2026". */
  year: string;
  /** What you actually did, when it isn't obviously all of it. */
  role?: string;
  stack: string[];
  repo?: string;
  demo?: string;
  /** Colour used for the card's gradient and the wordmark. */
  accent: string;
  /** Ordering weight for the landing page; lower comes first. */
  order?: number;
  featured?: boolean;
  /** Paths relative to the MDX file. */
  cover?: string;
  screenshots?: { src: string; alt: string; caption?: string }[];
  /** Set while the prose is machine-drafted and unreviewed. */
  draft?: boolean;
};

export type PostMeta = {
  title: string;
  slug: string;
  /** Shown in the index and used as the meta description. */
  summary: string;
  /** ISO date; the index sorts on it and the route uses it in the URL. */
  date: string;
  tags: string[];
  draft?: boolean;
};

export type StashMeta = {
  title: string;
  slug: string;
  blurb: string;
  date: string;
  /** Which interactive playground the entry mounts, if any. */
  demo?: 'bionic' | 'ascii';
  draft?: boolean;
};

export type NoteMeta = {
  title: string;
  slug: string;
  /** Where it came from, shown under the title. */
  source: string;
  url: string;
  /** Why it mattered — the whole point of the section. */
  note: string;
};

/** A loaded entry: its frontmatter plus the compiled MDX component. */
export type Entry<T> = T & {
  Content: React.ComponentType<{ components?: Record<string, React.ComponentType> }>;
};
