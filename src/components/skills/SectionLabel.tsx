import type { ReactNode } from 'react';

/**
 * A section marker for skill pages: a muted slash, the name, and a hairline
 * running out to the right edge.
 *
 * Case-study headings are display italic and want to be read as titles. These
 * want the opposite — they divide a page you are playing with into parts, and
 * should be quiet enough that the panel below is still the loudest thing in
 * view. The rule does the dividing so the type doesn't have to get bigger.
 *
 * Used as the `h2` override for entries that pass it through `MdxBody`'s
 * `extra`, so `## the demo` in the MDX comes out in this shape and the heading
 * level stays correct for anyone navigating by headings.
 */
const SectionLabel = ({ children }: { children?: ReactNode }) => (
  <h2 className="mt-10 mb-3 flex items-center gap-3 font-normal text-[15px] first:mt-0">
    <span>
      <span aria-hidden="true" className="text-muted">
        /
      </span>{' '}
      {children}
    </span>
    <span aria-hidden="true" className="h-px flex-1 bg-border" />
  </h2>
);

export default SectionLabel;
