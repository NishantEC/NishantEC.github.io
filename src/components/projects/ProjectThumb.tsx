import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * A moving preview per project, instead of the same gradient four times.
 *
 * Each one animates the single thing that makes its project interesting — the
 * private link for herm, a real session for cterm, the citation for
 * the-resume-thing, the on-device number for hale. They are deliberately DOM and
 * CSS rather than video or canvas: they must stay legible at 96px tall, cost
 * nothing on load, and stop entirely under `prefers-reduced-motion`, where each
 * settles on its finished state rather than freezing mid-way.
 */

/**
 * The project accents are chosen to sit in a gradient, and several of them land
 * around 2.5:1 as small text on a white card. Mixing toward the foreground fixes
 * that in both themes from one expression — `--fg` is near-black in light mode
 * and near-white in dark — so the mark keeps its hue and gains the contrast.
 * Graphical uses (the ring, the travelling dot, a border) keep the raw accent:
 * they only owe 3:1 and already clear it.
 */
const asText = (accent: string) => `color-mix(in oklch, ${accent}, var(--fg) 35%)`;

const useTypewriter = (text: string, enabled: boolean, speed = 55) => {
  const [shown, setShown] = useState(enabled ? '' : text);

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }

    let index = 0;
    setShown('');

    const timer = setInterval(() => {
      index += 1;
      setShown(text.slice(0, index));
      // Hold the finished line for a beat, then start over.
      if (index > text.length + 12) index = 0;
    }, speed);

    return () => clearInterval(timer);
  }, [text, enabled, speed]);

  return shown;
};

/** herm — a private link between your device and a box with nothing exposed. */
const HermThumb = ({ accent, animate }: { accent: string; animate: boolean }) => (
  <div className="flex h-full items-center justify-center gap-2 px-4 font-mono text-[10px] text-muted">
    <span className="squircle-xs border border-border px-1.5 py-1">you</span>

    <span className="relative h-px flex-1 bg-border">
      {animate && (
        <motion.span
          className="absolute -top-[2px] size-[5px] rounded-full"
          style={{ background: accent }}
          initial={{ left: '0%' }}
          animate={{ left: '100%' }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
      )}
    </span>

    <span className="squircle-xs border border-dashed px-1.5 py-1" style={{ borderColor: accent }}>
      agent
    </span>
  </div>
);

/** cterm — a real terminal, so it runs one. */
const CtermThumb = ({ accent, animate }: { accent: string; animate: boolean }) => {
  const typed = useTypewriter('ghostty --wasm', animate);

  return (
    <div className="flex h-full flex-col justify-center gap-1 px-4 font-mono text-[10px] leading-4">
      <p className="text-muted">
        <span style={{ color: asText(accent) }}>$</span> {typed}
        {animate && (
          <motion.span
            className="ml-px inline-block h-3 w-[5px] translate-y-[2px] bg-current"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, times: [0, 0.5, 0.5, 1] }}
          />
        )}
      </p>
      <p className="truncate text-muted">running in a browser tab</p>
    </div>
  );
};

/** the-resume-thing — every claim carries its source. */
const ResumeThumb = ({ accent, animate }: { accent: string; animate: boolean }) => (
  <div className="flex h-full flex-col justify-center gap-1.5 px-4 text-[10px] leading-4">
    <p className="text-muted">Cut build times by 40%</p>
    <motion.p
      className="flex items-center gap-1 font-mono"
      style={{ color: asText(accent) }}
      // Never fades to nothing: a cycle that bottoms out at zero leaves the card
      // looking half-rendered to anyone who arrives on the wrong beat.
      animate={animate ? { opacity: [0.4, 1, 1, 0.4] } : { opacity: 1 }}
      transition={
        animate
          ? {
              duration: 2.6,
              times: [0, 0.2, 0.75, 1],
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }
          : undefined
      }
    >
      ↳ a3f91c2 · verified
    </motion.p>
  </div>
);

/** hale — recovery computed on the device, no account. */
const HaleThumb = ({ accent, animate }: { accent: string; animate: boolean }) => (
  <div className="flex h-full items-center justify-center gap-3 px-4">
    <svg viewBox="0 0 36 36" className="size-11 -rotate-90" aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-border"
      />
      <motion.circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={2 * Math.PI * 15}
        initial={animate ? { strokeDashoffset: 2 * Math.PI * 15 } : false}
        animate={{ strokeDashoffset: 2 * Math.PI * 15 * 0.28 }}
        transition={animate ? { duration: 1.4, ease: [0.22, 1, 0.36, 1] } : undefined}
      />
    </svg>

    <div className="font-mono text-[10px] leading-4 text-muted">
      <p style={{ color: asText(accent) }}>72% recovered</p>
      <p>on-device</p>
    </div>
  </div>
);

/** arc-sidepanel-api — a panel docked onto a page with no slot for one. */
const ArcThumb = ({ accent, animate }: { accent: string; animate: boolean }) => (
  <div className="flex h-full items-center justify-center px-4">
    <div className="relative flex h-14 w-32 gap-1">
      <div className="squircle-xs flex-1 border border-border" />
      <motion.div
        className="squircle-xs w-9 border border-dashed"
        style={{ borderColor: accent }}
        initial={animate ? { opacity: 0, x: 8 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={
          animate
            ? {
                duration: 0.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 1.8,
                repeatType: 'reverse' as const,
              }
            : undefined
        }
      />
    </div>
  </div>
);

const THUMBS: Record<string, typeof HermThumb> = {
  herm: HermThumb,
  cterm: CtermThumb,
  'the-resume-thing': ResumeThumb,
  hale: HaleThumb,
  'arc-sidepanel-api': ArcThumb,
};

const ProjectThumb = ({ name, accent }: { name: string; accent: string }) => {
  const reduceMotion = useReducedMotion();
  const Thumb = THUMBS[name];

  // A project without a thumb falls back to its wordmark rather than a gap.
  if (!Thumb) {
    return (
      <div className="grid h-full place-items-center">
        <span className="font-display text-2xl italic" style={{ color: accent }}>
          {name}
        </span>
      </div>
    );
  }

  return <Thumb accent={accent} animate={!reduceMotion} />;
};

export default ProjectThumb;
