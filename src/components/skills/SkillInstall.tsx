import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import CheckIcon from '~icons/heroicons/check';
import CopyIcon from '~icons/heroicons/square-2-stack';
import { writeClipboard } from '../../utils/clipboard';
import { EASE } from '../../utils/motion';

/**
 * The install block: a command you can take.
 *
 * Shape borrowed from jakub.kr/skills — one bordered row, the command set in
 * mono with the copy affordance at its end. His carries links to the rest of
 * the collection underneath; ours doesn't, because there is one skill and a
 * button labelled "Skills" beside a button labelled "This one" would be two
 * routes to the same page.
 *
 * `--skill video2ascii` rather than the bare repo. The repo holds one skill
 * today, so the two install exactly the same thing — but this page is about one
 * skill, and the command on it should name that skill rather than the drawer it
 * lives in. It also stops being right the day a second one lands. The CLI's own
 * listing says as much: `Use --skill <name> to install specific skills`.
 *
 * It sits above the demo deliberately. The demo is the thing the skill made,
 * and a reader who scrolls past a nice animation and finds an install command
 * afterwards has already decided the page is a portfolio piece. Leading with
 * the command says the artefact is the point and the jellyfish is the evidence.
 */

/**
 * Copy and tick don't cross-fade through each other — one blurs out and the
 * next resolves in its place, which reads as the same mark changing state
 * rather than two icons briefly overlapping. `mode="wait"` is what makes that
 * sequential; without it both are mounted at once and the blur just muddies.
 *
 * The blur is smaller than it was and lasts longer. At 5px over 160ms there was
 * nothing to see: the icon was a smear for two frames and then it was a tick,
 * which reads as a hard swap. 3px is still legible as the same mark going soft,
 * and the duration is what lets you watch it happen.
 *
 * Out is quicker than in, and they move opposite ways: the old mark sinks and
 * softens, the new one rises and sharpens into place. Symmetrical timing made
 * the pause in the middle — `mode="wait"` holds an empty button between the two
 * — long enough to notice as a gap.
 */
const ENTER = { duration: 0.34, ease: EASE } as const;
/**
 * Eased *in*, unlike everything else here. `EASE` is front-loaded — almost all
 * of its change lands in the first fifth — which on the way out means the old
 * icon is gone by the second frame and the rest of the exit is an empty button.
 * This holds it a moment, then lets it go.
 */
const LEAVE = { duration: 0.18, ease: [0.4, 0, 1, 1] } as const;

const ICON_MOTION = {
  initial: { opacity: 0, filter: 'blur(3px)', scale: 0.86, y: 5 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0, transition: ENTER },
  exit: { opacity: 0, filter: 'blur(3px)', scale: 0.86, y: -5, transition: LEAVE },
} as const;

const SkillInstall = ({
  command = 'npx skills add NishantEC/skills --skill video2ascii',
}: {
  command?: string;
}) => {
  const [copied, setCopied] = useState(false);

  // Reverts on its own so the button is never stuck reporting a copy that
  // happened a minute ago. Cleared on unmount, and on a second copy, so a quick
  // double press doesn't leave a timer from the first one to cut the second short.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await writeClipboard(command)) setCopied(true);
  };

  return (
    /* The same two-layer card the demo panel wears: two strokes with an empty
       gutter between them, no fill on either. Radii are concentric — the inner
       is the outer minus the gutter (16 - 6 = 10) — so the two curves stay
       parallel rather than one cutting across the other. */
    <div className="my-6 rounded-2xl border border-border p-1.5">
      <div className="flex items-center gap-3 rounded-[10px] border border-border px-4 py-3">
        {/* `select-all` so a reader without clipboard permission — or one who
          simply doesn't trust a copy button — can take it in one gesture.

          It wraps on a narrow screen and doesn't on a wide one. Naming the skill
          made the command long enough to overflow at 430px, and a command you
          have to scroll sideways to read is worse than one on two lines — it
          breaks at a space, between the repo and the flag. */}
        <code className="min-w-0 flex-1 select-all whitespace-normal font-mono text-sm sm:overflow-x-auto sm:whitespace-nowrap">
          <span className="text-muted">npx</span>{' '}
          <span className="text-fg">{command.replace(/^npx\s+/, '')}</span>
        </code>

        <button
          type="button"
          onClick={copy}
          // The label carries the result, not just the action, because the icon
          // swap is invisible to a screen reader.
          aria-label={copied ? 'Copied install command' : 'Copy install command'}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted outline-none transition-[color,background-color,transform] hover:bg-fg/6 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.96]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? 'copied' : 'idle'}
              {...ICON_MOTION}
              className="grid place-items-center"
            >
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
};

export default SkillInstall;
