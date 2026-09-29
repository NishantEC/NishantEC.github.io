import { experience } from '../../data/profile';
import { useCompact } from '../panel/useCompact';
import SectionLabel from '../ui/SectionLabel';

const Experience = ({ index }: { index?: number }) => {
  const compact = useCompact();

  // Hidden entirely while a pane is open — App unmounts it, this is the guard
  // for any other caller.
  if (compact || experience.length === 0) return null;

  return (
    <section className="section flex scroll-mt-24 flex-col gap-8" id="experience">
      <SectionLabel index={index}>experience</SectionLabel>

      <ul className="flex flex-col gap-12">
        {experience.map((job) => (
          <li key={job.company} className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div>
                <p className="text-sm text-muted">
                  {job.period}, {job.location}
                </p>
                <h3 className="inline items-center">
                  {job.title} at
                  {job.logo && (
                    <img
                      src={job.logo}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      className="mr-0.5 ml-2 inline size-6 -translate-y-0.5 object-contain dark:brightness-150"
                    />
                  )}{' '}
                  {job.company}
                </h3>
              </div>

              {job.previously?.map(({ period, title }) => (
                <div key={period} className="relative pl-9 text-muted">
                  <div className="absolute top-0 left-2 h-7 w-4.5 rounded-bl-lg border-b-2 border-l-2 border-border" />
                  <p className="text-xs opacity-80">{period}</p>
                  <p className="text-sm">{title}</p>
                </div>
              ))}
            </div>

            <ul className="mt-2 flex list-[circle] flex-col gap-1 pl-4 leading-relaxed text-pretty text-muted">
              {job.bullets.map((bullet) => (
                <li key={bullet.text}>
                  {bullet.tooltip ? (
                    <span className="tooltip-trigger cursor-help underline decoration-fg/20 decoration-dashed underline-offset-4">
                      {bullet.text}
                      <span
                        role="tooltip"
                        className="tooltip squircle pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-20 w-max max-w-xs bg-stone-900 px-3 py-2 text-sm leading-snug text-stone-100 shadow-xl/30 dark:bg-stone-950"
                      >
                        {bullet.tooltip}
                      </span>
                    </span>
                  ) : (
                    bullet.text
                  )}
                </li>
              ))}
            </ul>

            <ul className="mt-2 flex flex-wrap gap-2">
              {job.stack.map((tech) => (
                <li
                  key={tech}
                  className="squircle-xs border border-border px-2 py-1 text-sm text-muted"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Experience;
