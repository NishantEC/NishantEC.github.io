import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import CheckIcon from '~icons/heroicons/check';
import CopyIcon from '~icons/heroicons/square-2-stack';
import { writeClipboard } from '../../utils/clipboard';
import { EASE } from '../../utils/motion';

/**
 * Copies the panel's current settings as something an agent can act on.
 *
 * The point of the page is that the skill is installable, and the panel is where
 * you work out what you actually want from it. Without this the two are
 * disconnected: you find a look here, then describe it from memory in a prompt.
 * This closes that — dial it in, copy it, paste it after `npx skills add` and
 * the agent has the exact arguments rather than an adjective.
 *
 * JSON, not a flag string. The consumer is a model reading a prompt, and JSON
 * says which of these are numbers and which are names without it having to
 * guess. `ramp` is the name rather than the characters because the skill knows
 * the names; the characters are the panel's way of showing you what they mean.
 *
 * `zoom` is deliberately not in it. It scales the rendering on screen and has no
 * bearing on what gets baked, so shipping it would put a viewing preference in
 * something that describes an output.
 */

const ICON_MOTION = {
  initial: { opacity: 0, filter: 'blur(3px)', scale: 0.86 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1, transition: { duration: 0.3, ease: EASE } },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    scale: 0.86,
    transition: { duration: 0.16, ease: EASE },
  },
} as const;

export type Preset = {
  ramp: string;
  columns: number;
  contrast: number;
  invert: boolean;
  ink: [string, string];
  background: string;
  fps: number;
};

const CopyPreset = ({ preset }: { preset: Preset }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const body = JSON.stringify(preset, null, 2);
    if (await writeClipboard(`video-to-ascii preset\n${body}`)) setCopied(true);
  };

  return (
    <button
      type="button"
      // Says what it copies, because the label cannot fit it. Without this the
      // button announces as "Copy preset" and a screen-reader user has no way
      // to know whether that is the ramp, the colours, or all of it.
      aria-label={`Copy these settings as JSON: ${preset.ramp} ramp, ${preset.columns} columns, ${preset.fps}fps`}
      onClick={copy}
      className="dialkit-button flex items-center justify-center gap-1.5 whitespace-nowrap"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={copied ? 'copied' : 'idle'} {...ICON_MOTION} className="grid">
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        </motion.span>
      </AnimatePresence>
      {copied ? 'Copied' : 'Copy preset'}
    </button>
  );
};

export default CopyPreset;
