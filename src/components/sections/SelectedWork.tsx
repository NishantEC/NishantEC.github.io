import { motion } from 'motion/react';
import { projects, skills } from '../../content/collections';
import { usePanel } from '../panel/usePanel';
import ProjectThumb from '../projects/ProjectThumb';
import SkillThumb from '../skills/SkillThumb';

const SelectedWork = () => {
  const { open } = usePanel();
  const ascii = skills.find((skill) => skill.slug === 'video2ascii');
  const cterm = projects.find((project) => project.slug === 'cterm');
  const terminal = (
    <>
      <motion.div
        layoutId={cterm ? 'mark:cterm' : undefined}
        className="mb-4 h-48 rounded-2xl border border-border p-[3px] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none"
        aria-hidden="true"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[13px] border border-border bg-stone-950">
          <div className="border-b border-stone-700 px-3 py-2 font-mono text-[10px] text-stone-400">
            ● ● ● &nbsp; cterm
          </div>
          <div className="flex-1 [&_p]:text-stone-300">
            <ProjectThumb name="cterm" accent="#a3b899" />
          </div>
        </div>
      </motion.div>
      <span className="flex items-center justify-between">
        cterm <span aria-hidden="true">↗</span>
      </span>
      <span className="mt-1 block text-sm text-muted">A browser terminal powered by Ghostty.</span>
    </>
  );

  return (
    <section className="section" id="projects" aria-labelledby="selected-work-title">
      <h2 id="selected-work-title" className="mb-6 text-xs tracking-widest text-muted uppercase">
        A few things I’ve made
      </h2>
      <div className="grid gap-7 sm:grid-cols-2">
        {ascii && (
          <button
            type="button"
            className="group text-left"
            onClick={() =>
              open({ id: 'skill:video2ascii', kind: 'skill', slug: ascii.slug, title: ascii.title })
            }
          >
            <div className="mb-4 h-48 rounded-2xl border border-border p-[3px] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none">
              <div className="h-full overflow-hidden rounded-[13px] border border-border bg-surface">
                <SkillThumb demo={ascii.demo} />
              </div>
            </div>
            <span className="flex items-center justify-between">
              video2ascii <span aria-hidden="true">↗</span>
            </span>
            <span className="mt-1 block text-sm text-muted">
              Turn footage into an ASCII animation.
            </span>
          </button>
        )}
        {cterm ? (
          <button
            type="button"
            className="group text-left"
            onClick={() =>
              open({ id: 'project:cterm', kind: 'project', slug: cterm.slug, title: cterm.title })
            }
          >
            {terminal}
          </button>
        ) : (
          <a
            className="group text-left"
            href="https://github.com/NishantEC/cterm"
            target="_blank"
            rel="noreferrer"
          >
            {terminal}
          </a>
        )}
      </div>
      <p className="mt-6 border-t border-border pt-5 text-sm leading-7 text-muted">
        Also building{' '}
        <a
          className="text-fg hover:underline"
          href="https://github.com/NishantEC/herm"
          target="_blank"
          rel="noreferrer"
        >
          herm ↗
        </a>
        {' · '}
        <a
          className="text-fg hover:underline"
          href="https://github.com/NishantEC/the-resume-thing"
          target="_blank"
          rel="noreferrer"
        >
          the-resume-thing ↗
        </a>
      </p>
    </section>
  );
};
export default SelectedWork;
