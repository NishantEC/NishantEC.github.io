import type { ComponentType, ReactNode } from 'react';
import Prose from '../reading/Prose';

/**
 * Styling for compiled MDX.
 *
 * MDX emits bare `h2`/`p`/`ul`, so rather than a global stylesheet the elements
 * are mapped to components here — that keeps case-study prose from inheriting
 * whatever the surrounding layout happens to do to a `p`, and keeps the styles
 * next to the thing they style.
 *
 * Paragraphs and list items route through `Prose`, so reading mode applies to
 * written content as well as the hand-built copy.
 */
const components: Record<string, ComponentType<{ children?: ReactNode }>> = {
  h2: ({ children }) => (
    <h2 className="mt-9 mb-3 font-display text-xl leading-tight italic first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-7 mb-2 font-medium">{children}</h3>,
  p: ({ children }) => (
    <p className="mb-4 leading-[26px] text-muted">
      <Prose>{children}</Prose>
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 flex list-[circle] flex-col gap-1.5 pl-4 leading-[26px] text-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 flex list-decimal flex-col gap-1.5 pl-4 leading-[26px] text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li>
      <Prose>{children}</Prose>
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-2 border-border pl-4 text-muted italic">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="squircle-xs bg-fg/6 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="squircle-xs mb-4 overflow-x-auto border border-border bg-bg p-4 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-border underline-offset-4 transition-colors hover:text-fg"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-8 border-border" />,
};

/**
 * `empty:hidden` matters for entries that are only a demo — a skill can
 * have frontmatter and no prose, and without this its empty wrapper still
 * collects a flex gap from the layout around it.
 */
const MdxBody = ({
  Content,
  extra,
}: {
  Content: ComponentType<{ components?: Record<string, ComponentType> }>;
  /**
   * Components an entry may place itself, by name, in its own MDX.
   *
   * Most entries are prose with a demo bolted above them, which the layout can
   * position. One is not: the ASCII entry interleaves an install block, two
   * live panels and the writing between them, and only the writing knows the
   * order. Passing the panels in as MDX components puts that order in the
   * content file, where changing it is an edit rather than a refactor.
   *
   * Keys override the element map above when they collide, so an entry can also
   * restyle its own headings without every case study inheriting it.
   */
  extra?: Record<string, ComponentType>;
}) => (
  <div className="text-[15px] empty:hidden">
    <Content components={{ ...components, ...extra } as Record<string, ComponentType>} />
  </div>
);

export default MdxBody;
