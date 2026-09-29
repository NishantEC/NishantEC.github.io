import { profile } from '../../data/profile';
import VisitorCount from '../analytics/VisitorCount';
import { useTheme } from '../theme/useTheme';
import CopyEmailButton from '../ui/CopyEmailButton';
import GemShader from '../ui/GemShader';

// Citrine, pale for light theme and deep for dark, like the skills card.
const CITRINE = {
  light: ['#fff7ed', '#fed7aa', '#fdba74'] as const,
  dark: ['#fdba74', '#c2410c', '#2a1206'] as const,
};

const gemVars = {
  '--l1': CITRINE.light[0],
  '--l2': CITRINE.light[1],
  '--l3': CITRINE.light[2],
  '--g1': CITRINE.dark[0],
  '--g2': CITRINE.dark[1],
  '--g3': CITRINE.dark[2],
} as React.CSSProperties;

/**
 * The page ends on an ask: a citrine gem card with one line and the email
 * button, then the quiet link row underneath. It replaced "Open to interesting
 * work", which read as half-available and gave a reader nothing to do.
 */
const HomeFooter = () => {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

  return (
    <footer className="section flex flex-col gap-5">
      <div className="squircle-outer border border-border bg-bg p-[3px]">
        <div
          className="gem squircle-inner relative overflow-hidden border border-white/10"
          style={gemVars}
        >
          <GemShader light={CITRINE.light} dark={CITRINE.dark} />
          <div className="relative flex flex-wrap items-end justify-between gap-6 px-8 py-9 text-(--gem-cap-fg) sm:px-10 sm:py-10">
            <p className="max-w-md font-display text-4xl leading-[1.05] tracking-tight italic sm:text-5xl">
              Building something? Let’s talk.
            </p>
            <CopyEmailButton />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-5 text-xs text-muted">
        <div className="flex gap-4">
          <a href={profile.socials.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href={profile.socials.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
          <a href={profile.socials.x} target="_blank" rel="noreferrer">
            X ↗
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <VisitorCount />
        </div>
        <button
          type="button"
          onClick={() => setTheme(next)}
          aria-label={'Color theme: ' + theme + '. Switch to ' + next}
        >
          {theme} ◐
        </button>
      </div>
    </footer>
  );
};
export default HomeFooter;
