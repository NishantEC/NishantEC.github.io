import { experience } from '../../data/profile';
import { useCompact } from '../panel/useCompact';

const Experience = () => {
  const compact = useCompact();
  const [current, ...previous] = experience;
  if (compact || !current) return null;
  return (
    <section className="section text-sm" id="experience" aria-labelledby="experience-title">
      <h2 id="experience-title" className="mb-5 text-xs tracking-widest text-muted uppercase">
        Currently
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span
            aria-hidden="true"
            className="mr-2 inline-block size-1.5 rounded-full bg-green-700 dark:bg-green-400"
          />
          {current.title} at {current.company}
        </p>
        <span className="text-muted">{current.period}</span>
      </div>
      <details className="mt-6 text-muted">
        <summary className="cursor-pointer">Work history</summary>
        <div className="mt-5 space-y-7">
          {[current, ...previous].map((job) => (
            <div key={job.company}>
              <h3 className="text-fg">
                {job.company} · {job.title}
              </h3>
              <p className="mt-1 text-xs">{job.period}</p>
              <ul className="mt-3 list-disc space-y-2 pl-4 leading-relaxed">
                {job.bullets.map((bullet) => (
                  <li key={bullet.text}>{bullet.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
};
export default Experience;
