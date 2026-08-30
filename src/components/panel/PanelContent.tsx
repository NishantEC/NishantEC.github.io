import { motion } from 'motion/react';
import GithubIcon from '~icons/simple-icons/github';
import { findProject, findStash } from '../../content/collections';
import type { ProjectStatus } from '../../content/schema';
import MdxBody from '../content/MdxBody';
import ProjectThumb from '../projects/ProjectThumb';
import Prose from '../reading/Prose';
import AsciiArt from '../stash/AsciiArt';
import BionicDemo from '../stash/BionicDemo';

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

      <p className="leading-[26px] text-muted">
        <Prose>{project.tagline}</Prose>
      </p>

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

const StashView = ({ slug }: { slug: string }) => {
  const entry = findStash(slug);
  if (!entry) return null;

  return (
    /* The demo comes first. A stash entry is something to play with, not
       something to read — prose above it just pushes the point below the fold. */
    <div className="flex w-full flex-col gap-6">
      {/* Everything shares the reading column so the heading, the demo and the
          prose line up on one left edge. The demo used to break out, from when
          the art was large; it is a small square now and the breakout only
          bought a third alignment. */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {entry.demo === 'bionic' && <BionicDemo />}
        {entry.demo === 'ascii' && <AsciiArt />}
        <MdxBody Content={entry.Content} />
      </div>
    </div>
  );
};

const PanelContent = ({ tab }: { tab: PanelTab }) =>
  tab.kind === 'project' ? <ProjectView slug={tab.slug} /> : <StashView slug={tab.slug} />;

export default PanelContent;
