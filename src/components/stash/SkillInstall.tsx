import { useEffect, useState } from 'react';
import CheckIcon from '~icons/heroicons/check';
import CopyIcon from '~icons/heroicons/square-2-stack';

/**
 * The install block: a command you can take, and the two places it came from.
 *
 * Shape borrowed from jakub.kr/skills — a single bordered container holding the
 * command on one row and the links as equal halves beneath it, hairlines rather
 * than gaps between them. It reads as one object you can act on instead of a
 * command with some links loose underneath.
 *
 * It sits above the demo deliberately. The demo is the thing the skill made,
 * and a reader who scrolls past a nice animation and finds an install command
 * afterwards has already decided the page is a portfolio piece. Leading with
 * the command says the artefact is the point and the jellyfish is the evidence.
 */

const LINK =
  'flex-1 px-3 py-2.5 text-center text-muted text-sm outline-none transition-colors hover:bg-fg/4 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset';

const SkillInstall = ({
  command = 'npx skills add NishantEC/skills',
  repo = 'https://github.com/NishantEC/skills',
}: {
  command?: string;
  repo?: string;
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

  const copy = () => {
    navigator.clipboard
      ?.writeText(command)
      .then(() => setCopied(true))
      .catch(() => {});
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-3 px-4 py-3">
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
          // swap below is invisible to a screen reader.
          aria-label={copied ? 'Copied install command' : 'Copy install command'}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted outline-none transition-colors hover:bg-fg/6 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </button>
      </div>

      <div className="flex border-border border-t">
        <a href={repo} target="_blank" rel="noreferrer" className={LINK}>
          Skills
        </a>
        <a
          href={`${repo}/tree/main/skills/video-to-ascii`}
          target="_blank"
          rel="noreferrer"
          className={`${LINK} border-border border-l`}
        >
          This one
        </a>
      </div>
    </div>
  );
};

export default SkillInstall;
