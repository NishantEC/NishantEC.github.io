import { motion } from 'motion/react';
import type { ComponentType } from 'react';
import GithubIcon from '~icons/simple-icons/github';
import { findProject, findSkill } from '../../content/collections';
import type { ProjectStatus } from '../../content/schema';
import MdxBody from '../content/MdxBody';
import ProjectThumb from '../projects/ProjectThumb';
import AsciiArt from '../skills/AsciiArt';
import SectionLabel from '../skills/SectionLabel';
import SkillInstall from '../skills/SkillInstall';

import type { PanelTab } from './PanelProvider';

/**
 * Status is stated rather than implied. A portfolio that presents everything as
 * finished is the least believable kind, and "wip" costs nothing to admit.
 */
const STATUS_LABEL: Record<ProjectStatus, string> = {
  shipped: 'Shipped',
  wip: 'In progress',
  archived: 'Archived',
  experiment: 'Experiment',
};

const ProjectView = ({ slug }: { slug: string }) => {
  const project = findProject(slug);
  if (!project) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* The other half of the card morph — see OpenSource.tsx. */}
      <motion.div
        layoutId={`mark:${project.slug}`}
        className="squircle-xs grid h-28 place-items-center"
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, ${project.accent}22, transparent 70%)`,
        }}
      >
        <ProjectThumb name={project.slug} accent={project.accent} />
      </motion.div>

      <p className="leading-[26px] text-muted">{project.tagline}</p>

      <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <dt className="sr-only">Status</dt>
        <dd className="squircle-xs border border-border px-2 py-0.5 text-xs">
          {STATUS_LABEL[project.status]}
        </dd>
        <dt className="sr-only">Year</dt>
        <dd className="text-xs">{project.year}</dd>
        {project.role && (
          <>
            <dt className="sr-only">Role</dt>
            <dd className="text-xs">· {project.role}</dd>
          </>
        )}
      </dl>

      <ul className="flex flex-wrap gap-1.5">
        {project.stack.map((tech) => (
          <li key={tech} className="squircle-xs bg-fg/6 px-2 py-1 text-xs text-muted">
            {tech}
          </li>
        ))}
      </ul>

      <MdxBody Content={project.Content} />

      {project.repo && (
        <a
          href={project.repo}
          target="_blank"
          rel="noreferrer"
          className="squircle-xs flex w-fit items-center gap-2 border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg"
        >
          <GithubIcon className="size-4" />
          View repository
        </a>
      )}
    </div>
  );
};

/**
 * What the ASCII entry may place in its own MDX.
 *
 * Declared once outside the component so the identities are stable — a fresh
 * object each render would give MDX new component types every time and remount
 * both panels, throwing away a decoded sprite sheet and whatever clip the
 * reader had loaded into the playground.
 */
const ASCII_PARTS = {
  h2: SectionLabel,
  Install: SkillInstall,
  Demo: AsciiArt,
} as unknown as Record<string, ComponentType>;

const SkillView = ({ slug }: { slug: string }) => {
  const entry = findSkill(slug);
  if (!entry) return null;

  // Most entries are a demo with prose under it, and the layout can put the
  // demo up top without the content file having an opinion. The ASCII entry
  // runs install, demo, playground and writing in a deliberate order, so it
  // places its own parts and gets no slot here — see `MdxBody`'s `extra`.
  const composed = entry.demo === 'ascii';

  return (
    /* The demo comes first. A skill page is something to play with, not
       something to read — prose above it just pushes the point below the fold. */
    <div className="flex w-full flex-col gap-6">
      {/* Everything shares the reading column so the heading, the demo and the
          prose line up on one left edge. The demo used to break out, from when
          the art was large; it is a small square now and the breakout only
          bought a third alignment. */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <MdxBody Content={entry.Content} extra={composed ? ASCII_PARTS : undefined} />
      </div>
    </div>
  );
};

const PanelContent = ({ tab }: { tab: PanelTab }) =>
  tab.kind === 'project' ? <ProjectView slug={tab.slug} /> : <SkillView slug={tab.slug} />;

export default PanelContent;
