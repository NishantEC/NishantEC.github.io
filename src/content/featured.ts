export const selectBySlug = <T extends { slug: string }>(entries: T[], slugs: string[]) =>
  slugs.flatMap((slug) => entries.find((entry) => entry.slug === slug) ?? []);

export const FEATURED_SKILL_SLUGS = ['video2ascii', 'creating-logos'];
export const LATEST_WORK_SLUGS = ['enform', 'hale', 'the-resume-thing', 'neko', 'herm', 'cterm'];
