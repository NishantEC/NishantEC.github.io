import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import dotmetricsMark from '../../assets/dotmetrics-mark.svg';
import nekoAppIcon from '../../assets/neko-app-icon.svg';
import GemShader from '../ui/GemShader';
import FlyingAscii from './FlyingAscii';
import { EnformMark } from './LogoMarks';

type Palette = [string, string, string];
type Output = {
  skill: string;
  label: string;
  note: string;
  /** Gem backdrop, pale for light theme and deep for dark, like the project cards. */
  gem?: { light: Palette; dark: Palette };
  /** A plain dark backdrop in both themes, used instead of a gem; the card's
   * own text switches to light ink on it. */
  onDark?: boolean;
  /** How long the slide stays up before the next one. */
  duration: number;
  render: (active: boolean) => React.ReactNode;
};

const gemVars = ({ light: [l1, l2, l3], dark: [g1, g2, g3] }: NonNullable<Output['gem']>) =>
  ({
    '--l1': l1,
    '--l2': l2,
    '--l3': l3,
    '--g1': g1,
    '--g2': g2,
    '--g3': g3,
  }) as React.CSSProperties;

const Mark = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={'grid size-20 place-items-center rounded-2xl border border-border ' + className}>
    {children}
  </div>
);

// One slide per skill, showing what that skill made. Adding a skill later
// means adding one entry here; the card layout does not change.
const OUTPUTS: Output[] = [
  {
    skill: 'video2ascii',
    label: 'video2ascii',
    note: 'video into ascii art',
    // Plain near black, like the clip it came from. The butterfly is the one
    // thing moving here, so there is no lava lamp behind it.
    onDark: true,
    // The butterfly large, crossing the card from one side to the other.
    duration: 7000,
    render: (active) => <FlyingAscii active={active} duration={7000} />,
  },
  {
    skill: 'creating-logos',
    label: 'creating-logos',
    note: 'logos and app icons',
    // Citrine.
    gem: { light: ['#fff7ed', '#fed7aa', '#fdba74'], dark: ['#fdba74', '#c2410c', '#2a1206'] },
    duration: 4500,
    render: () => (
      <div className="flex h-full items-center justify-center gap-4 pb-10 sm:pr-44 sm:pb-0 sm:pl-28">
        <Mark className="bg-black text-white [&_svg]:size-11">
          <EnformMark />
        </Mark>
        <img src={nekoAppIcon} alt="Neko" className="size-20" />
        <Mark className="bg-[#f7f1e4]">
          <img src={dotmetricsMark} alt="Dotmetrics" className="size-11" />
        </Mark>
      </div>
    ),
  },
];

// Light ink for a slide with a dark backdrop, whatever the site theme is.
const DARK_INK = {
  '--fg': 'oklch(0.97 0.01 200)',
  '--muted': 'oklch(0.97 0.01 200 / 0.6)',
} as React.CSSProperties;

const pad = (n: number) => String(n).padStart(2, '0');

const SkillsShowcase = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const current = OUTPUTS[active];

  useEffect(() => {
    if (reducedMotion) return;
    const id = setTimeout(
      () => setActive((i) => (i + 1) % OUTPUTS.length),
      OUTPUTS[active].duration,
    );
    return () => clearTimeout(id);
  }, [reducedMotion, active]);

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-bg"
      style={current.onDark ? DARK_INK : undefined}
    >
      {/* One gem per skill, crossfading with the slide so the card takes on the
          colour of whichever skill is showing. */}
      {OUTPUTS.map((output, i) => (
        <span
          key={output.label}
          aria-hidden="true"
          style={output.gem ? gemVars(output.gem) : undefined}
          className={
            'pointer-events-none absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ' +
            (output.gem ? 'gem ' : 'bg-[#07090a] ') +
            (i === active ? 'opacity-100' : 'opacity-0')
          }
        >
          {output.gem ? <GemShader light={output.gem.light} dark={output.gem.dark} /> : null}
        </span>
      ))}
      <button
        type="button"
        onClick={() => navigate('/skills/' + current.skill)}
        aria-label={'Open ' + current.skill}
        className="absolute inset-0 cursor-pointer appearance-none"
      >
        {OUTPUTS.map((output, i) => (
          <span
            key={output.label}
            aria-hidden={i !== active}
            className={
              'absolute inset-0 block transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ' +
              (i === active ? 'opacity-100' : 'pointer-events-none translate-y-3 opacity-0')
            }
          >
            {i === active || Math.abs(i - active) === 1 ? output.render(i === active) : null}
          </span>
        ))}
      </button>

      <span className="pointer-events-none absolute top-5 left-6 font-mono text-[11px] tracking-widest text-muted uppercase transition-colors duration-700">
        skills · open source
      </span>

      <span
        className="pointer-events-none absolute bottom-5 left-6 flex items-baseline gap-2"
        aria-live="polite"
      >
        <span className="font-display text-6xl leading-none tracking-tight text-fg italic transition-colors duration-700 sm:text-7xl">
          {pad(active + 1)}
        </span>
        <span className="font-mono text-xs text-muted transition-colors duration-700">
          / {pad(OUTPUTS.length)} · {current.note}
        </span>
      </span>

      <ol className="absolute top-1/2 right-6 hidden -translate-y-1/2 text-right sm:block">
        {OUTPUTS.map((output, i) => (
          <li key={output.label}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active}
              className={
                'font-mono text-[11px] leading-[2.1] transition-colors ' +
                (i === active ? 'text-fg' : 'text-muted/70 hover:text-fg')
              }
            >
              {output.label}
              <span className={i === active ? '' : 'invisible'}> ←</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default SkillsShowcase;
