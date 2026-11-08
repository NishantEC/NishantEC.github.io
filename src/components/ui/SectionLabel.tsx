import type { ReactNode } from 'react';
import { useDesign } from '../../design/design';

/**
 * Section heading for the full-width page.
 *
 * `current` is the original: a serif italic index in the accent colour and a
 * quiet lowercase label. The redesign rule is one font and one colour per
 * heading, so the other styles never mix the two:
 * - `numbered`: index and label in the same sans and the same muted tone.
 * - `plain`: just the label, sentence case, in the text colour.
 * - `title`: a real heading, larger and tightly set, no index.
 *
 * The sidebar doesn't use this — there the index moves into the gutter and the
 * label becomes a micro-cap, so `SidebarSection` owns that layout instead.
 */
const pad = (index: number) => String(index).padStart(2, '0');

const SectionLabel = ({ index, children }: { index?: number; children: ReactNode }) => {
  const { headings } = useDesign();

  if (headings === 'numbered') {
    return (
      <h2 className="flex items-baseline gap-2.5 text-sm font-medium tracking-[0.01em] text-muted tabular-nums">
        {index !== undefined && <span aria-hidden="true">{pad(index)}</span>}
        <span className="first-letter:uppercase">{children}</span>
      </h2>
    );
  }

  if (headings === 'plain') {
    return <h2 className="text-[15px] font-medium text-fg first-letter:uppercase">{children}</h2>;
  }

  if (headings === 'title') {
    return (
      <h2 className="text-3xl font-semibold tracking-[-0.03em] text-fg first-letter:uppercase">
        {children}
      </h2>
    );
  }

  return (
    <h2 className="flex items-baseline gap-2.5 text-sm tracking-[0.02em] text-muted lowercase">
      {index !== undefined && (
        <span aria-hidden="true" className="font-display text-base text-accent italic tabular-nums">
          {pad(index)}
        </span>
      )}
      {children}
    </h2>
  );
};

export default SectionLabel;
