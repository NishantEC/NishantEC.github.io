import { motion } from 'motion/react';
import { projects } from '../../content/collections';
import { LATEST_WORK_SLUGS, selectBySlug } from '../../content/featured';
import { projectDestination } from '../../content/projectDestination';
import ProjectThumb from '../projects/ProjectThumb';

const SelectedWork = () => {
  const latestWork = selectBySlug(projects, LATEST_WORK_SLUGS);

  if (latestWork.length === 0) return null;

  return (
    <section className="section" id="projects" aria-labelledby="latest-work-title">
      <h2 id="latest-work-title" className="mb-6 text-xs tracking-widest text-muted uppercase">
        Latest work
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-5">
        {latestWork.map((project) => {
          const destination = projectDestination(project);
          if (!destination) return null;

          return (
            <div
              key={project.slug}
              className="group w-full overflow-hidden rounded-2xl border border-border bg-surface p-[3px] transition-transform hover:-translate-y-0.5 hover:shadow-lg/5"
            >
              <a
                href={destination}
                target="_blank"
                rel="noreferrer"
                className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left"
              >
                <motion.span
                  layoutId={`mark:${project.slug}`}
                  className="block aspect-[16/10] shrink-0 overflow-hidden border-b border-border bg-bg transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none"
                >
                  <ProjectThumb name={project.slug} accent={project.accent} />
                </motion.span>
                <span className="block flex-1 p-5">
                  <span className="mb-1 flex items-center justify-between text-base font-medium">
                    {project.title} <span aria-hidden="true">↗</span>
                  </span>
                  <span className="block text-sm text-muted">{project.tagline}</span>
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
