import { stash } from '../../content/collections';
import { formatMonth } from '../../utils/date';
import { useCompact } from '../panel/useCompact';
import { usePanel } from '../panel/usePanel';
import Prose from '../reading/Prose';
import StashThumb from '../stash/StashThumb';
import IndexRow from '../ui/IndexRow';
import SectionLabel from '../ui/SectionLabel';
import SidebarSection from '../ui/SidebarSection';

const Stash = ({ index }: { index?: number }) => {
  const { open, activeId } = usePanel();
  const compact = useCompact();

  const openItem = (slug: string, title: string) =>
    open({ id: `stash:${slug}`, kind: 'stash', slug, title });

  // Nothing to show, nothing to render — and no empty heading left behind.
  if (stash.length === 0) return null;

  if (compact) {
    return (
      <SidebarSection id="stash" index={index} label="stash">
        {stash.map((item) => (
          <IndexRow
            key={item.slug}
            label={item.title}
            meta={formatMonth(item.date)}
            isActive={activeId === `stash:${item.slug}`}
            onClick={() => openItem(item.slug, item.title)}
          />
        ))}
      </SidebarSection>
    );
  }

  return (
    <section className="section flex scroll-mt-24 flex-col gap-8" id="stash">
      <SectionLabel index={index}>stash</SectionLabel>

      <p className="text-sm leading-[22px] text-muted">
        Things I built to understand them. Kept here because I liked them, not because they were
        finished — each one is live, not a screenshot.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {stash.map((item) => (
          <button
            type="button"
            key={item.slug}
            onClick={() => openItem(item.slug, item.title)}
            className="squircle-sm flex flex-col border border-border bg-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg/5"
          >
            <div className="squircle-xs mb-4 h-28 overflow-hidden bg-bg">
              <StashThumb demo={item.demo} />
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

export default Stash;
