import { useNavigate } from 'react-router';
import { skills } from '../../content/collections';
import { FEATURED_SKILL_SLUGS, selectBySlug } from '../../content/featured';
import { useCompact } from '../panel/useCompact';
import SkillThumb from '../skills/SkillThumb';
import IndexRow from '../ui/IndexRow';
import SectionLabel from '../ui/SectionLabel';
import SidebarSection from '../ui/SidebarSection';

const Skills = ({ index }: { index?: number }) => {
  const navigate = useNavigate();
  const compact = useCompact();
  const featuredSkills = selectBySlug(skills, FEATURED_SKILL_SLUGS);

  const openItem = (slug: string) => navigate(`/skills/${slug}`);

  // Nothing to show, nothing to render — and no empty heading left behind.
  if (skills.length === 0) return null;

  if (compact) {
    return (
      <SidebarSection id="skills" index={index} label="skills">
        {skills.map((item) => (
          <IndexRow key={item.slug} label={item.title} onClick={() => openItem(item.slug)} />
        ))}
      </SidebarSection>
    );
  }

  return (
    <section className="section flex scroll-mt-24 flex-col gap-8" id="skills">
      <SectionLabel index={index}>skills</SectionLabel>

      {/* What the section is for, not what I think of it. Each of these is
          installable, so the sentence has to say that before it says anything
          about craft — a reader who wants the artefact should not have to open
          an entry to find out they can take it. */}
      <p className="text-sm leading-[22px] text-muted">
        Agent skills I build alongside the work and publish so anyone can install them. Each one
        gets a page here with the thing it made, running.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        {featuredSkills.map((item) => (
          <div
            key={item.slug}
            className="group w-full overflow-hidden rounded-2xl border border-border bg-surface p-[3px] transition-transform hover:-translate-y-0.5 hover:shadow-lg/5"
          >
            <button
              type="button"
              onClick={() => openItem(item.slug)}
              className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left appearance-none"
            >
              <span className="block h-44 shrink-0 overflow-hidden border-b border-border bg-bg sm:h-48">
                <SkillThumb demo={item.demo} slug={item.slug} />
              </span>

              <span className="block flex-1 p-5">
                <span className="mb-1 block text-base font-medium">{item.title}</span>
                <span className="block text-sm text-muted">{item.blurb}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Skills;
