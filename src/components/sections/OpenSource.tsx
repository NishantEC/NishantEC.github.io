import { motion } from 'motion/react';
import GithubIcon from '~icons/simple-icons/github';
import { projects } from '../../content/collections';
import { projectDestination } from '../../content/projectDestination';
import { profile } from '../../data/profile';
import { useRepos } from '../../utils/useRepos';
import { useCompact } from '../panel/useCompact';
import ProjectThumb from '../projects/ProjectThumb';
import IndexRow from '../ui/IndexRow';
import SectionLabel from '../ui/SectionLabel';
import SidebarSection from '../ui/SidebarSection';

const OpenSource = ({ index }: { index?: number }) => {
  const compact = useCompact();
  // Star counts come from the API rather than frontmatter — a number written
  // into a file is a number that goes stale.
  const repos = useRepos();

  if (projects.length === 0) return null;

  const openProject = (slug: string) => {
    const project = projects.find((item) => item.slug === slug);
    const destination = project && projectDestination(project);
    if (destination) window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const starsFor = (slug: string) => repos?.[slug]?.stars ?? 0;

  if (compact) {
    return (
      <SidebarSection id="projects" index={index} label="open source">
        {projects.map((project) => (
          <IndexRow
            key={project.slug}
            label={project.title}
            meta={starsFor(project.slug) > 0 ? `★ ${starsFor(project.slug)}` : undefined}
            onClick={() => openProject(project.slug)}
          />
        ))}
      </SidebarSection>
    );
  }

  return (
    <section className="section flex scroll-mt-24 flex-col gap-8" id="projects">
      <SectionLabel index={index}>open source</SectionLabel>

      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((project) => (
          <button
            type="button"
            key={project.slug}
            onClick={() => openProject(project.slug)}
            className="squircle-sm relative flex flex-col border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg/5"
          >
            {/* Shares a `layoutId` with the same block in the pane, so the card
                flies into the panel it opens instead of the two cross-fading. */}
            <motion.div
              layoutId={`mark:${project.slug}`}
              className="squircle-xs mb-4 grid h-24 place-items-center"
              style={{
                background: `radial-gradient(120% 100% at 50% 0%, ${project.accent}22, transparent 70%)`,
              }}
            >
              <ProjectThumb name={project.slug} accent={project.accent} />
            </motion.div>

            {starsFor(project.slug) > 0 && (
              <span className="absolute top-6 right-6 flex items-center gap-1 text-sm text-muted">
                ⭐ {starsFor(project.slug)}
              </span>
            )}

            <h3 className="mb-1">{project.title}</h3>
            <p className="text-sm text-muted">{project.tagline}</p>
          </button>
        ))}
      </div>

      <a
        href={profile.socials.github}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-muted transition-colors hover:text-fg"
      >
        See it all on
        <GithubIcon className="size-4" />
        <span className="underline underline-offset-4">GitHub</span>
      </a>
    </section>
  );
};

export default OpenSource;
