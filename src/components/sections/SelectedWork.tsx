import ctermShot from '../../assets/projects/cterm.png';
import enformShot from '../../assets/projects/enform-analysis.png';
import haleHome from '../../assets/projects/hale-home.png';
import haleRecovery from '../../assets/projects/hale-recovery.png';
import haleSleep from '../../assets/projects/hale-sleep.png';
import hermShot from '../../assets/projects/herm-slack.png';
import nekoShot from '../../assets/projects/neko.png';
import resumeDemo from '../../assets/projects/the-resume-thing.gif';
import { projects } from '../../content/collections';
import { LATEST_WORK_SLUGS, selectBySlug } from '../../content/featured';
import { projectDestination } from '../../content/projectDestination';
import ProjectThumb from '../projects/ProjectThumb';
import SkillsShowcase from '../skills/SkillsShowcase';
import GemShader from '../ui/GemShader';
import SectionLabel from '../ui/SectionLabel';

/**
 * Each card is a real screenshot set on a tinted backdrop, with the caption in
 * its own band below it. The screenshot is never cropped to fill the card —
 * cropping is what turned hale into one widget and cut herm off mid-sentence —
 * so every card shows the whole product at a glance. Each project is a gem
 * with a pale palette for light theme and a deep one for dark; the gem utility
 * in index.css turns them into a faceted backdrop and picks one per theme.
 */
type Palette = [string, string, string];
type Media = { light: Palette; dark: Palette; shots: string[] };
const MEDIA: Record<string, Media> = {
  hale: {
    light: ['#ecfdf5', '#a7f3d0', '#6ee7b7'],
    dark: ['#6ee7b7', '#047857', '#022c22'],
    shots: [haleRecovery, haleHome, haleSleep],
  },
  enform: {
    light: ['#eff6ff', '#bfdbfe', '#93c5fd'],
    dark: ['#93c5fd', '#1d4ed8', '#0b1437'],
    shots: [enformShot],
  },
  cterm: {
    light: ['#faf5ff', '#e9d5ff', '#c4b5fd'],
    dark: ['#d8b4fe', '#6d28d9', '#1a0b2e'],
    shots: [ctermShot],
  },
  herm: {
    light: ['#eef2ff', '#c7d2fe', '#a5b4fc'],
    dark: ['#a5b4fc', '#4338ca', '#110f2e'],
    shots: [hermShot],
  },
  'the-resume-thing': {
    light: ['#fff1f2', '#fecdd3', '#fda4af'],
    dark: ['#fda4af', '#be123c', '#2a0612'],
    shots: [resumeDemo],
  },
  neko: {
    light: ['#fffbeb', '#fde68a', '#fcd34d'],
    dark: ['#fcd34d', '#b45309', '#1f1206'],
    shots: [nekoShot],
  },
};

const QUARTZ = {
  light: ['#fafaf9', '#e7e5e4', '#d6d3d1'] as Palette,
  dark: ['#a8a29e', '#292524', '#0c0a09'] as Palette,
};

/** Hands both palettes to the gem utility, which picks one per theme. */
const gemVars = ([l1, l2, l3]: Palette, [g1, g2, g3]: Palette) =>
  ({
    '--l1': l1,
    '--l2': l2,
    '--l3': l3,
    '--g1': g1,
    '--g2': g2,
    '--g3': g3,
  }) as React.CSSProperties;

// Squircle corners come from the utilities in index.css; the 3px ring between
// the two borders is the page background.
const FRAME =
  'group w-full squircle-outer border border-border bg-bg p-[3px] transition-transform duration-300 hover:-translate-y-0.5';
const INNER = 'relative block h-full w-full overflow-hidden squircle-inner border border-white/10';
const LIFT =
  'transition-transform duration-500 ease-out group-hover:-translate-y-1.5 motion-reduce:transform-none';
const SHADOW = 'shadow-[0_18px_40px_rgb(0_0_0/0.5)] ring-1 ring-white/10';

const Shots = ({ media }: { media: Media }) => {
  // Several phone screens stand side by side, the middle one raised a little.
  // On a phone-width card only the middle one shows: three side by side at
  // that size were too small to read and cropped at the edges.
  if (media.shots.length > 1) {
    return (
      <span className={'absolute inset-x-0 top-[8%] bottom-0 flex justify-center gap-[4%] ' + LIFT}>
        {media.shots.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={
              'h-[125%] w-auto rounded-[18px] ' +
              SHADOW +
              (i === 1 ? ' -translate-y-[4%]' : '') +
              (i !== 1 ? ' hidden sm:block' : '')
            }
          />
        ))}
      </span>
    );
  }

  return (
    <img
      src={media.shots[0]}
      alt=""
      className={'absolute top-[8%] left-[6%] w-[88%] rounded-[10px] ' + SHADOW + ' ' + LIFT}
    />
  );
};

// One line per card, short enough to show whole. The full tagline lives on
// the project page; a truncated sentence on a card only hides its point.
const CARD_LINE: Record<string, string> = {
  enform: 'An AI form builder that reads the answers.',
  'the-resume-thing': 'A résumé where every line cites a PR.',
  neko: 'A macOS launcher for apps and agents.',
  herm: 'A private AI agent box, no open ports.',
  cterm: "Ghostty's real terminal, in a browser.",
};

const SelectedWork = () => {
  const latestWork = selectBySlug(projects, LATEST_WORK_SLUGS);

  if (latestWork.length === 0) return null;

  return (
    <section className="section" id="projects" aria-labelledby="latest-work-title">
      <div id="latest-work-title" className="mb-8">
        <SectionLabel index={1}>latest work</SectionLabel>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Skills sits among the projects as one wide entry, showing what the
            skills actually made rather than a separate section about them.
            8/3 keeps its height equal to a 4/3 card beside it. */}
        <div id="skills" className={FRAME + ' grid scroll-mt-24 sm:col-span-2'}>
          <div className={INNER + ' aspect-[4/3] bg-bg text-fg sm:aspect-[8/3] lg:aspect-auto'}>
            <SkillsShowcase />
          </div>
        </div>
        {latestWork.map((project, i) => {
          const destination = projectDestination(project);
          if (!destination) return null;
          // Skills takes two cells, so the last project fills the gap it
          // would otherwise leave at the end of the three-column grid.
          const wide = i === latestWork.length - 1 && latestWork.length % 3 === 0;
          const media = MEDIA[project.slug];
          const vars = gemVars(media?.light ?? QUARTZ.light, media?.dark ?? QUARTZ.dark);

          return (
            <div key={project.slug} className={FRAME + (wide ? ' lg:col-span-2' : '')}>
              <a
                href={destination}
                target="_blank"
                rel="noreferrer"
                style={vars}
                className={INNER + ' gem aspect-[4/3] text-left' + (wide ? ' lg:aspect-[8/3]' : '')}
              >
                {media && <GemShader light={media.light} dark={media.dark} />}
                {media ? (
                  <Shots media={media} />
                ) : (
                  <span className="absolute inset-0">
                    <ProjectThumb name={project.slug} accent={project.accent} />
                  </span>
                )}
                <span className="gem-cap absolute inset-x-0 bottom-0 z-10 block px-5 pt-10 pb-4">
                  <span className="flex items-center justify-between text-[15px] font-medium">
                    {project.title} <span aria-hidden="true">↗</span>
                  </span>
                  <span
                    className={
                      'mt-0.5 text-[13px] text-(--gem-cap-muted) ' +
                      (wide ? 'line-clamp-2' : 'line-clamp-1')
                    }
                  >
                    {CARD_LINE[project.slug] ?? project.tagline}
                  </span>
                </span>
              </a>
            </div>
          );
        })}
      </div>
      <a
        href="https://github.com/NishantEC"
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex text-sm text-muted underline underline-offset-4 transition-colors hover:text-fg"
      >
        More at GitHub ↗
      </a>
    </section>
  );
};

export default SelectedWork;
