import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * The sidebar's rail: one hairline running down the gutter from the first
 * section to the last, uninterrupted between them. The section numerals punch
 * holes in it, so the breaks in the line are the section boundaries — the
 * sidebar reads as a single index rather than two stacked lists.
 *
 * It fades over its last 20px so the line doesn't stop dead in mid-air. That
 * distance is deliberately about half a row: fade any further and a short list
 * loses the rail beside its final entries entirely.
 *
 * This component only mounts once a pane is open, so mounting is the split
 * opening — the rail draws itself downward rather than appearing, which gives
 * the transition a beat of its own and explains the new element by showing it
 * being made.
 */
const SectionSpine = ({ children }: { children: ReactNode }) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="section relative flex flex-col gap-10">
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 bottom-0 left-[5px] w-px origin-top bg-[linear-gradient(to_bottom,var(--border)_0%,var(--border)_calc(100%-1.25rem),transparent_100%)]"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          duration: reduceMotion ? 0 : 0.5,
          // Starts after the width has committed, so the line draws into a
          // column that has stopped moving.
          delay: reduceMotion ? 0 : 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      {children}
    </div>
  );
};

export default SectionSpine;
