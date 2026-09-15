import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import ctermScreenshot from '../../assets/projects/cterm.png';
import enformScreenshot from '../../assets/projects/enform-analysis.png';
import haleHomeScreenshot from '../../assets/projects/hale-home.png';
import haleRecoveryScreenshot from '../../assets/projects/hale-recovery.png';
import haleSleepScreenshot from '../../assets/projects/hale-sleep.png';
import hermSlackScreenshot from '../../assets/projects/herm-slack.png';
import nekoScreenshot from '../../assets/projects/neko.png';
import resumeDemo from '../../assets/projects/the-resume-thing.gif';

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

/** herm — the agent where it is useful: a private Slack conversation. */
const HermThumb = ({ accent }: { accent: string; animate: boolean }) => (
  <div className="flex h-full flex-col overflow-hidden bg-[#1a1d21] font-sans text-[9px] text-[#d1d2d3]">
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 bg-[#20242a] px-3">
      <span className="grid size-5 place-items-center rounded-[4px] bg-[radial-gradient(circle_at_35%_25%,#7788ff,#242051_68%)] text-[8px] font-bold text-white">
        H
      </span>
      <span className="font-semibold text-[11px] tracking-tight text-white">Herm</span>
      <span className="rounded bg-white/10 px-1 py-px text-[7px] font-semibold tracking-wide text-[#d5d7dc]">
        VIP
      </span>
      <span className="ml-auto size-1.5 rounded-full" style={{ background: accent }} />
    </div>

    <div className="flex h-7 shrink-0 items-end gap-3 border-b border-white/10 px-3 text-[#a8adb5]">
      <span className="border-b-2 border-white pb-1 text-white">⌂ Home</span>
      <span className="pb-1">● Chat</span>
      <span className="pb-1">◷ History</span>
      <span className="ml-auto pb-1">More⌄</span>
    </div>

    <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 px-3 py-2.5 leading-[1.35]">
      <div className="flex items-start gap-1.5">
        <span className="grid size-4 shrink-0 place-items-center rounded-[4px] bg-[#d8dce5] text-[8px] font-semibold text-[#20242a]">
          N
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[#f1f2f3]">Nishant</p>
          <p className="text-[#c8cbd0]">
            Hello, can you reply with a short status message for a portfolio screenshot?
          </p>
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        <span className="grid size-4 shrink-0 place-items-center rounded-[4px] bg-[radial-gradient(circle_at_35%_25%,#7686ff,#211c59_68%)] text-[8px] font-bold text-white">
          H
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[#f1f2f3]">
            Herm{' '}
            <span className="ml-1 rounded bg-white/10 px-1 py-px text-[7px] tracking-wide text-[#d5d7dc]">
              AGENT
            </span>
          </p>
          <p className="text-[#c8cbd0]">
            Ready. Private gateway is healthy and no public ingress is exposed.
          </p>
          <span className="mt-1 inline-flex rounded bg-white/10 px-1.5 py-0.5 font-mono text-[8px] text-[#dfe1e5]">
            tailscale · connected
          </span>
        </div>
      </div>
    </div>
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

/** hale — three real iPhone simulator captures, arranged like a small health story. */
const HaleThumb = () => (
  <div className="relative h-full overflow-hidden bg-[#071514]">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-25%,rgba(72,153,118,0.55),transparent_63%),linear-gradient(130deg,#06110f_8%,#0d1b1b_58%,#171025)]" />
    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(transparent,rgba(3,10,9,0.72))]" />

    <img
      src={haleRecoveryScreenshot}
      alt=""
      className="absolute left-[8%] top-6 w-[29%] -rotate-[7deg] rounded-[11px] object-cover object-top opacity-75 shadow-[0_16px_34px_rgba(0,0,0,0.45)] ring-1 ring-white/15"
    />
    <img
      src={haleHomeScreenshot}
      alt=""
      className="absolute left-1/2 top-3 z-10 w-[35%] -translate-x-1/2 rounded-[13px] object-cover object-top shadow-[0_22px_44px_rgba(0,0,0,0.58)] ring-1 ring-white/25"
    />
    <img
      src={haleSleepScreenshot}
      alt=""
      className="absolute right-[8%] top-7 w-[29%] rotate-[7deg] rounded-[11px] object-cover object-top opacity-80 shadow-[0_16px_34px_rgba(0,0,0,0.45)] ring-1 ring-white/15"
    />

    <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(transparent,#071514)]" />
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

const EnformThumb = ({ accent, animate }: { accent: string; animate: boolean }) => (
  <div className="flex h-full items-center justify-center gap-2 px-4 font-mono text-[10px] text-muted">
    <span className="squircle-xs border border-border px-2 py-1">ask</span>
    <motion.span
      className="size-1.5 rounded-full"
      style={{ background: accent }}
      animate={animate ? { scale: [1, 1.5, 1] } : { scale: 1 }}
      transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
    />
    <span className="squircle-xs border border-border px-2 py-1">theme</span>
  </div>
);

const NekoThumb = ({ accent, animate }: { accent: string; animate: boolean }) => (
  <div className="flex h-full items-center justify-center gap-1.5 px-4 font-mono text-[10px] text-muted">
    <span className="squircle-xs border border-border px-2 py-1">⌘</span>
    {['apps', 'tasks', 'files'].map((item, index) => (
      <motion.span
        key={item}
        className="squircle-xs border border-border px-2 py-1"
        animate={animate ? { opacity: [0.45, 1, 0.45] } : { opacity: 1 }}
        transition={{ duration: 1.8, delay: index * 0.2, repeat: Number.POSITIVE_INFINITY }}
        style={index === 1 ? { borderColor: accent, color: asText(accent) } : undefined}
      >
        {item}
      </motion.span>
    ))}
  </div>
);

const THUMBS: Record<string, typeof HermThumb> = {
  herm: HermThumb,
  cterm: CtermThumb,
  'the-resume-thing': ResumeThumb,
  hale: HaleThumb,
  'arc-sidepanel-api': ArcThumb,
  enform: EnformThumb,
  neko: NekoThumb,
};

const SCREENSHOTS: Record<string, string> = {
  enform: enformScreenshot,
  cterm: ctermScreenshot,
  herm: hermSlackScreenshot,
  neko: nekoScreenshot,
  'the-resume-thing': resumeDemo,
};

const ProjectThumb = ({ name, accent }: { name: string; accent: string }) => {
  const reduceMotion = useReducedMotion();
  const Thumb = THUMBS[name];
  const screenshot = SCREENSHOTS[name];

  if (screenshot) {
    if (name === 'herm' || name === 'cterm') {
      return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#171327] p-7">
          <div className="absolute -left-12 -top-14 size-40 rounded-full bg-[#6d4cff]/45 blur-3xl" />
          <div className="absolute -bottom-20 -right-8 size-44 rounded-full bg-[#ef6947]/40 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(77,57,164,0.4),transparent_45%,rgba(231,103,70,0.26))]" />
          <img
            src={screenshot}
            alt=""
            className="relative h-full w-full rounded-[10px] object-cover object-top shadow-[0_18px_40px_rgba(0,0,0,0.48)] ring-1 ring-white/10"
          />
        </div>
      );
    }

    const screenshotClass =
      name === 'the-resume-thing'
        ? 'bg-[#f7f6f3] object-cover object-top'
        : 'object-cover object-top';

    return <img src={screenshot} alt="" className={`h-full w-full ${screenshotClass}`} />;
  }

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
