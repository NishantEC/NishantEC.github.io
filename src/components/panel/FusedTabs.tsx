import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useLayoutEffect, useState } from 'react';
import ArchiveIcon from '~icons/heroicons/archive-box';
import StarIcon from '~icons/heroicons/star';
import XMarkIcon from '~icons/heroicons/x-mark';
import type { PanelTab } from './PanelProvider';
import { FUSED_TAB_DURATION, FUSED_TAB_EASE, useFusedTabIndicator } from './useFusedTabIndicator';

type Props = {
  tabs: PanelTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
};

/** Slack so labels don't collapse the instant they touch the edge. */
const FIT_BUFFER = 12;

/**
 * Tab strip where the active tab's background fuses into the panel surface
 * below it — the concave notches either side are radial gradients, which is
 * what sells the "merged into the panel" read.
 *
 * Every tab keeps its label while the strip has room. Only when they'd overflow
 * do the inactive ones collapse to icon-only, so the labels are a response to
 * pressure rather than a permanent state.
 */
const FusedTabs = ({ tabs, activeId, onSelect, onClose }: Props) => {
  const reduceMotion = useReducedMotion();
  const [labelled, setLabelled] = useState<Set<string>>(() => new Set(tabs.map((t) => t.id)));
  const duration = reduceMotion ? 0 : FUSED_TAB_DURATION;

  const isLabelVisible = useCallback(
    (id: string) => id === activeId || labelled.has(id),
    [labelled, activeId],
  );

  const { position, listRef, tabRefs, labelRefs } = useFusedTabIndicator(activeId, isLabelVisible);

  // Force every label open, measure, then drop only as many as the overflow
  // requires — oldest first, active always kept. Depends on `tabs` because
  // adding one doesn't resize the strip, so the observer alone would go stale.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || tabs.length === 0) return;

    const measure = () => {
      const restore: Array<[HTMLElement, string]> = [];
      for (const [, labelElement] of labelRefs.current) {
        restore.push([labelElement, labelElement.style.width]);
        labelElement.style.width = 'auto';
      }

      const natural = list.scrollWidth;
      const available = list.clientWidth;
      const widths = new Map<string, number>();
      for (const [id, labelElement] of labelRefs.current) {
        widths.set(id, labelElement.offsetWidth);
      }

      for (const [labelElement, width] of restore) {
        labelElement.style.width = width;
      }

      // scrollWidth is max(content, clientWidth), so equality means it fits —
      // overflow is the only thing this comparison can detect.
      let excess = natural - available - FIT_BUFFER;
      const next = new Set(tabs.map((t) => t.id));

      for (const tab of tabs) {
        if (excess <= 0) break;
        if (tab.id === activeId) continue;
        next.delete(tab.id);
        excess -= widths.get(tab.id) ?? 0;
      }

      setLabelled((current) =>
        current.size === next.size && [...next].every((id) => current.has(id)) ? current : next,
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [listRef, labelRefs, tabs, activeId]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Open items"
      aria-orientation="horizontal"
      className="relative flex h-12 min-w-0 flex-1 items-end gap-0.5 overflow-x-auto scrollbar-none bg-surface px-2"
    >
      {position && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-10 rounded-t-[14px] bg-[var(--panel)] before:absolute before:bottom-0 before:-left-3 before:size-3 before:bg-[radial-gradient(circle_12px_at_0_0,transparent_11.5px,var(--panel)_12px)] before:content-[''] after:absolute after:-right-3 after:bottom-0 after:size-3 after:bg-[radial-gradient(circle_12px_at_100%_0,transparent_11.5px,var(--panel)_12px)] after:content-['']"
          initial={false}
          animate={{ x: position.left, width: position.width }}
          transition={{ duration, ease: FUSED_TAB_EASE }}
        />
      )}

      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const Icon = tab.kind === 'stash' ? ArchiveIcon : StarIcon;
        const labelOpen = isLabelVisible(tab.id);

        return (
          <div
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            className="group relative z-10 flex shrink-0 items-end"
          >
            {/* The visual box lives here, not on the tab button, so the close
                button sits inside the hover fill and the fused indicator
                rather than hanging off the end of them. A button can't nest a
                button, hence the wrapper. */}
            <div
              className={`flex items-center gap-1 transition-colors ${
                isActive
                  ? 'h-10 rounded-t-[14px] pr-2 pl-3.5 text-fg'
                  : `mb-1 h-9 rounded-lg text-muted group-hover:bg-fg/6 group-hover:text-fg ${
                      labelOpen ? 'pr-1.5 pl-3' : 'px-2'
                    }`
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.title}
                title={labelOpen ? undefined : tab.title}
                onClick={() => !isActive && onSelect(tab.id)}
                className="flex items-center rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Icon className="size-4.5 shrink-0" />
                <motion.span
                  ref={(el: HTMLElement | null) => {
                    if (el) labelRefs.current.set(tab.id, el);
                    else labelRefs.current.delete(tab.id);
                  }}
                  initial={false}
                  animate={{ width: labelOpen ? 'auto' : 0, opacity: labelOpen ? 1 : 0 }}
                  transition={{ duration, ease: FUSED_TAB_EASE }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="block max-w-44 truncate pl-2">{tab.title}</span>
                </motion.span>
              </button>

              {/* Reserved slot — revealing it on hover changes only opacity, so
                  the strip never reflows. Icon-only tabs skip it; no room. */}
              {labelOpen && (
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={() => onClose(tab.id)}
                  className={`grid size-5 shrink-0 place-items-center rounded-full text-muted outline-none transition-all hover:bg-fg/12 hover:text-fg focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/60 ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <XMarkIcon className="size-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FusedTabs;
