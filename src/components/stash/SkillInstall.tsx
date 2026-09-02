import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import CheckIcon from '~icons/heroicons/check';
import CopyIcon from '~icons/heroicons/square-2-stack';
import { EASE } from '../../App';

/**
 * The install block: a command you can take.
 *
 * Shape borrowed from jakub.kr/skills — one bordered row, the command set in
 * mono with the copy affordance at its end. His carries links to the rest of
 * the collection underneath; ours doesn't, because there is one skill and a
 * button labelled "Skills" beside a button labelled "This one" would be two
 * routes to the same page.
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
 */
const ICON_MOTION = {
  initial: { opacity: 0, filter: 'blur(5px)', scale: 0.7 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
  exit: { opacity: 0, filter: 'blur(5px)', scale: 0.7 },
  transition: { duration: 0.16, ease: EASE },
} as const;

/**
 * Copies, and says whether it managed to.
 *
 * `navigator.clipboard` is undefined outside a secure context and rejects with
 * `NotAllowedError` when the document isn't focused, so the async API alone
 * leaves the button doing nothing at all on a plain-http preview — no error, no
 * tick, no clue. The textarea fallback is the old synchronous path, which works
 * in both cases. The boolean is what matters: a tick shown after a failed copy
 * is worse than no tick, because the reader walks away with an empty clipboard
 * believing otherwise.
 */
const writeClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // ignored — falls through to the synchronous path below
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    // Off-screen rather than `display: none`, which is not selectable.
    field.setAttribute('aria-hidden', 'true');
    field.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    return ok;
  } catch {
    return false;
  }
};

const SkillInstall = ({ command = 'npx skills add NishantEC/skills' }: { command?: string }) => {
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
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
      {/* `select-all` so a reader without clipboard permission — or one who
          simply doesn't trust a copy button — can take it in one gesture. */}
      <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap font-mono text-sm">
        <span className="text-accent">npx</span>{' '}
        <span className="text-fg">{command.replace(/^npx\s+/, '')}</span>
      </code>

      <button
        type="button"
        onClick={copy}
        // The label carries the result, not just the action, because the icon
        // swap is invisible to a screen reader.
        aria-label={copied ? 'Copied install command' : 'Copy install command'}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted outline-none transition-colors hover:bg-fg/6 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
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
  );
};

export default SkillInstall;
