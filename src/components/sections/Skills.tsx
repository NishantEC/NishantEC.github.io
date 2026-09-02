import { skills } from '../../content/collections';
import { formatMonth } from '../../utils/date';
import { useCompact } from '../panel/useCompact';
import { usePanel } from '../panel/usePanel';
import Prose from '../reading/Prose';
import SkillThumb from '../skills/SkillThumb';
import IndexRow from '../ui/IndexRow';
import SectionLabel from '../ui/SectionLabel';
import SidebarSection from '../ui/SidebarSection';

const Skills = ({ index }: { index?: number }) => {
  const { open, activeId } = usePanel();
  const compact = useCompact();

  const openItem = (slug: string, title: string) =>
    open({ id: `skill:${slug}`, kind: 'skill', slug, title });

  // Nothing to show, nothing to render — and no empty heading left behind.
  if (skills.length === 0) return null;

  if (compact) {
    return (
      <SidebarSection id="skills" index={index} label="skills">
        {skills.map((item) => (
          <IndexRow
            key={item.slug}
            label={item.title}
            meta={formatMonth(item.date)}
            isActive={activeId === `skill:${item.slug}`}
            onClick={() => openItem(item.slug, item.title)}
          />
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

      <div className="grid gap-3 sm:grid-cols-2">
        {skills.map((item) => (
          <button
            type="button"
            key={item.slug}
            onClick={() => openItem(item.slug, item.title)}
            className="squircle-sm flex flex-col border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg/5"
          >
            <div className="squircle-xs mb-4 h-28 overflow-hidden bg-bg">
              <SkillThumb demo={item.demo} />
            </div>

            <h3 className="mb-1">{item.title}</h3>
            <p className="mb-3 text-sm text-muted">
              <Prose>{item.blurb}</Prose>
            </p>
            <span className="mt-auto text-sm text-muted">{formatMonth(item.date)}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Skills;
