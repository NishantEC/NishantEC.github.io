import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

export type Chip = {
  /** Text shown inline in the sentence. */
  label: string;
  /** Replaces the whole paragraph while this chip is hovered. */
  reveal: string;
  href?: string;
};

export type Segment = string | Chip;

const isChip = (segment: Segment): segment is Chip => typeof segment !== 'string';

/**
 * A paragraph whose copy swaps out while you hover one of its inline chips —
 * the chip explains itself in place, instead of pushing you to another page.
 * The chip's border is traced by a beam for as long as it's hovered.
 */
const RevealParagraph = ({ segments }: { segments: Segment[] }) => {
  const [active, setActive] = useState<string>();

  const revealed = segments.find((s) => isChip(s) && s.label === active) as Chip | undefined;

  return (
    // Reserving the taller of the two heights would need measurement; instead the
    // layers are stacked so the paragraph box never reflows mid-hover.
    <p className="grid [&>*]:col-start-1 [&>*]:row-start-1">
      <motion.span
        animate={{ opacity: revealed ? 0 : 1, filter: revealed ? 'blur(2px)' : 'blur(0px)' }}
        transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}
      >
        {segments.map((segment, i) =>
          isChip(segment) ? (
            <a
              key={segment.label}
              className="beam-chip"
              data-active={active === segment.label ? '' : undefined}
              href={segment.href}
              target={segment.href ? '_blank' : undefined}
              rel={segment.href ? 'noreferrer' : undefined}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(segment.label)}
              onPointerLeave={() => setActive(undefined)}
              onFocus={() => setActive(segment.label)}
              onBlur={() => setActive(undefined)}
            >
              {segment.label}
            </a>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: plain text runs are positional
            <span key={i}>{segment}</span>
          ),
        )}
      </motion.span>

      <AnimatePresence>
        {revealed && (
          <motion.span
            key={revealed.label}
            className="pointer-events-none text-fg"
            initial={{ opacity: 0, filter: 'blur(3px)', y: 3 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, filter: 'blur(3px)', y: -3 }}
            transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}
          >
            {revealed.reveal}
          </motion.span>
        )}
      </AnimatePresence>
    </p>
  );
};

export default RevealParagraph;
