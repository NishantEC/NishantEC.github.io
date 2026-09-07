import { useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import preview from '../../assets/skills/butterfly-preview.json';
import type { SkillMeta } from '../../content/schema';
import { useFrameClock } from '../../utils/useFrameClock';

// Baked from the same butterfly.mp4 used by the interactive ASCII page.
// A small text preview avoids decoding and sampling video on the homepage.
const POSTER = 25;
const SkillThumb = ({ demo }: { demo: SkillMeta['demo'] }) => {
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLPreElement>(null);
  const frame = useRef(POSTER);
  const reducedMotion = useReducedMotion();
  const visible = useInView(root);
  useFrameClock(preview.fps, demo === 'ascii' && visible && !reducedMotion, () => {
    frame.current = (frame.current + 1) % preview.frames.length;
    if (text.current) text.current.textContent = preview.frames[frame.current];
  });
  if (demo !== 'ascii') return null;
  return (
    <div
      ref={root}
      className="grid h-full place-items-center [container-type:inline-size] bg-stone-100 dark:bg-stone-900"
    >
      <pre
        ref={text}
        aria-hidden="true"
        className="font-mono text-[length:min(7px,2.4cqw)] leading-none text-stone-600 dark:text-stone-400"
      >
        {preview.frames[POSTER]}
      </pre>
    </div>
  );
};
export default SkillThumb;
