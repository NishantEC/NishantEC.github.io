import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import GithubIcon from '~icons/simple-icons/github';
import LinkedinIcon from '~icons/simple-icons/linkedin';
import XIcon from '~icons/simple-icons/x';
import { profile } from '../../data/profile';
import { type Contributions, fetchContributions } from '../../utils/github-contributions';

const EASE = [0.33, 1, 0.68, 1] as const;

/**
 * The five levels the contributions API returns, at the size a seven-day strip
 * needs inside a tooltip. There was a full-year calendar component here once;
 * it went with the hover card it was built for.
 */
const HEAT = [
  'bg-fg/10',
  'bg-green-600/25 dark:bg-green-400/25',
  'bg-green-600/45 dark:bg-green-400/45',
  'bg-green-600/70 dark:bg-green-400/70',
  'bg-green-600/95 dark:bg-green-400/95',
];

type Key = 'github' | 'linkedin' | 'x';
type Box = { left: number; width: number };

/** 'https://x.com/NishCodes' -> '@NishCodes' */
const handleOf = (url: string) => `@${url.split('/').filter(Boolean).pop()}`;

/**
 * Three links cast as one plate rather than three separate icons: a single
 * squircled rail (sized the way `Button`'s `lg` houses `icon`-sized squircles)
 * with a joint that slides underneath whichever tile has the pointer or focus.
 * It's the fused tab strip's own trick — an indicator tweened to a measured
 * `offsetLeft`/`offsetWidth`, same easing — aimed at a hover state instead of
 * a selection.
 *
 * Nothing here changes size or position: the tiles are static grid cells, and
 * the only thing that moves is a decorative, absolutely-positioned backdrop.
 * Identity surfaces in place, in the site's existing tooltip idiom, so there
 * is nothing to reflow and nothing that pops.
 */
const Contacts = () => {
  const reduceMotion = useReducedMotion();
  const [contributions, setContributions] = useState<Contributions>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState<Key | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const tileRefs = useRef(new Map<Key, HTMLAnchorElement>());

  useEffect(() => {
    fetchContributions('NishantEC').then(({ days, total: t }) => {
      setContributions(days);
      setTotal(t);
    });
  }, []);

  // Only the box updates on entry — leaving fades the joint out in place
  // rather than snapping it back to nothing, so re-entering a neighbour reads
  // as one continuous slide instead of a fresh pop each time.
  const moveTo = useCallback((key: Key | null) => {
    setActive(key);
    if (!key) return;
    const node = tileRefs.current.get(key);
    if (!node) return;
    // `offsetLeft` is measured from the rail's border box, but this indicator
    // is absolutely positioned with no `left`, so it already starts at its
    // static position — inside the padding. Translating by the raw offset
    // counts that padding twice and parks the joint a few pixels right of the
    // tile. Read the padding rather than hardcoding it, so changing `p-1` on
    // the rail cannot silently reintroduce the drift.
    const rail = node.parentElement;
    const pad = rail ? Number.parseFloat(getComputedStyle(rail).paddingLeft) || 0 : 0;
    setBox({ left: node.offsetLeft - pad, width: node.offsetWidth });
  }, []);

  const onEnter = (key: Key) => (event: React.PointerEvent<HTMLAnchorElement>) => {
    // Touch has no hover to leave — the joint would just stay stranded lit.
    if (event.pointerType !== 'mouse') return;
    moveTo(key);
  };

  const onRailLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    moveTo(null);
  };

  const links: { key: Key; href: string; label: string; hint: string; Icon: typeof GithubIcon }[] =
    [
      {
        key: 'github',
        href: profile.socials.github,
        label: 'GitHub',
        hint:
          total > 0
            ? `${total.toLocaleString()} contributions this year`
            : handleOf(profile.socials.github),
        Icon: GithubIcon,
      },
      {
        key: 'linkedin',
        href: profile.socials.linkedin,
        label: 'LinkedIn',
        hint: `${profile.role} · ${profile.location}`,
        Icon: LinkedinIcon,
      },
      {
        key: 'x',
        href: profile.socials.x,
        label: 'X',
        hint: handleOf(profile.socials.x),
        Icon: XIcon,
      },
    ];

  return (
    <nav
      aria-label="Elsewhere"
      className="squircle-sm relative flex items-center gap-0.5 border border-border bg-surface p-1"
      onPointerLeave={onRailLeave}
    >
      {box && (
        <motion.div
          aria-hidden="true"
          className="squircle-xs pointer-events-none absolute top-1 bottom-1 bg-fg/6"
          initial={false}
          animate={{ x: box.left, width: box.width, opacity: active ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE }}
        />
      )}

      {links.map(({ key, href, label, hint, Icon }) => (
        <a
          key={key}
          ref={(el) => {
            if (el) tileRefs.current.set(key, el);
            else tileRefs.current.delete(key);
          }}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} — ${hint}`}
          onPointerEnter={onEnter(key)}
          onFocus={() => moveTo(key)}
          onBlur={() => moveTo(null)}
          className={`tooltip-trigger squircle-xs relative z-10 grid size-9 shrink-0 place-items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 sm:size-8 ${
            active === key ? 'text-fg' : 'text-muted'
          }`}
        >
          <Icon aria-hidden="true" className="size-4.5 [&_path]:fill-current" />

          <div
            role="tooltip"
            className="tooltip squircle-xs pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-max max-w-[11rem] -translate-x-1/2 bg-stone-900 px-2.5 py-1.5 text-center text-xs text-stone-100 shadow-xl/30 motion-reduce:transition-none dark:bg-stone-950"
          >
            <p className="font-medium text-[13px]">{label}</p>
            <p className="text-stone-400">{hint}</p>

            {key === 'github' && contributions.length > 0 && (
              <div aria-hidden="true" className="mt-1.5 flex justify-center gap-[2px]">
                {contributions.slice(-7).map((day) => (
                  <span key={day.date} className={`size-1.5 rounded-[1px] ${HEAT[day.level]}`} />
                ))}
              </div>
            )}
          </div>
        </a>
      ))}
    </nav>
  );
};

export default Contacts;
