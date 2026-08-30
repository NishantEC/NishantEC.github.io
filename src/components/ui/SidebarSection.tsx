import type { ReactNode } from 'react';

/**
 * A section as it appears in the condensed sidebar: a narrow gutter holding the
 * index, and a body holding the label and the rows.
 *
 * The gutter is the point. `SectionSpine` draws one hairline down it for the
 * whole column, so the gutter is what separates one section from the next and
 * what the active-row marker sits in — no band, no rule, no fill. That means the
 * two measurements here are load-bearing: the gutter's width and the gap to the
 * body decide where the rail lands, and `IndexRow` positions its marker against
 * the same total.
 */
export const GUTTER = 18;
export const GUTTER_GAP = 14;

const SidebarSection = ({
  id,
  index,
  label,
  children,
}: {
  id: string;
  index?: number;
  label: string;
  children: ReactNode;
}) => (
  <section id={id} aria-labelledby={`${id}-label`} className="flex w-full scroll-mt-24 gap-3.5">
    <div className="w-[18px] shrink-0">
      {index !== undefined && (
        /* Opaque, so it punches a hole in the rail running behind it — that
           break is what reads as the start of a section. Hidden from the
           accessibility tree: it's an ordinal, not part of the name. */
        <span
          aria-hidden="true"
          className="relative z-10 inline-block bg-bg py-0.5 font-display text-xs text-accent italic tabular-nums"
        >
          {String(index).padStart(2, '0')}
        </span>
      )}
    </div>

    <div className="min-w-0 flex-1">
      <h2 id={`${id}-label`} className="pb-2.5 text-[10px] tracking-[0.1em] text-muted uppercase">
        {label}
      </h2>

      {/* biome-ignore lint/a11y/noRedundantRoles: not redundant here — `display: flex`
          strips list semantics in Safari/VoiceOver, so the role has to be explicit. */}
      <ul role="list" className="flex flex-col">
        {children}
      </ul>
    </div>
  </section>
);

export default SidebarSection;
