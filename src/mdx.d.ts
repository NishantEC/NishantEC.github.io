/**
 * MDX files compile to a React component plus a named `frontmatter` export
 * (produced by `remark-mdx-frontmatter`). `frontmatter` is typed as `unknown`
 * here rather than a union of the content types: TypeScript can't tell which
 * collection a given file belongs to from its path, so the cast happens once, in
 * `collections.ts`, where the directory is known.
 */
declare module '*.mdx' {
  import type { ComponentType } from 'react';

  export const frontmatter: unknown;

  const MDXComponent: ComponentType<{
    components?: Record<string, ComponentType>;
  }>;

  export default MDXComponent;
}
