import type { ReactNode } from 'react';

/**
 * Section heading for the full-width page: an index and a quiet lowercase
 * label, no icon and no rule. The index gives the page a spine without adding a
 * visual divider.
 *
 * The sidebar doesn't use this — there the index moves into the gutter and the
 * label becomes a micro-cap, so `SidebarSection` owns that layout instead.
 */
const SectionLabel = ({ index, children }: { index?: number; children: ReactNode }) => (
  <h2 className="flex items-baseline gap-2.5 text-sm tracking-[0.02em] text-muted lowercase">
    {index !== undefined && (
      <span aria-hidden="true" className="font-display text-base text-accent italic tabular-nums">
        {String(index).padStart(2, '0')}
      </span>
    )}
    {children}
  </h2>
);

export default SectionLabel;
