import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArchiveIcon from '~icons/heroicons/archive-box';
import ArrowTopRightIcon from '~icons/heroicons/arrow-top-right-on-square';
import BookOpenIcon from '~icons/heroicons/book-open';
import ComputerDesktopIcon from '~icons/heroicons/computer-desktop';
import EnvelopeIcon from '~icons/heroicons/envelope';
import MoonIcon from '~icons/heroicons/moon';
import StarIcon from '~icons/heroicons/star';
import SunIcon from '~icons/heroicons/sun';
import XMarkIcon from '~icons/heroicons/x-mark';
import { projects, skills } from '../../content/collections';
import { profile } from '../../data/profile';
import { usePanel } from '../panel/usePanel';
import { originOf, type Theme } from '../theme/ThemeProvider';
import { useTheme } from '../theme/useTheme';

type Action = {
  id: string;
  label: string;
  group: string;
  icon: ReactNode;
  /** Extra text to match against, so "terminal" finds cterm. */
  keywords?: string;
  hint?: string;
  /** `origin` is the row's own centre, so the theme wipe starts from it. */
  run: (origin?: { x: number; y: number }) => void;
};

export const isMac = () =>
  (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ===
    'macOS' || /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const { open, closeAll, tabs } = usePanel();
  const { theme, setTheme } = useTheme();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Whatever had focus before the palette took it, so Esc puts you back.
  const restoreTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    restoreTo.current?.focus();
  }, []);

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [
      ...projects.map((project) => ({
        id: `project:${project.slug}`,
        label: project.title,
        group: 'Projects',
        icon: <StarIcon />,
        keywords: `${project.tagline} ${project.stack.join(' ')}`,
        run: () =>
          open({
            id: `project:${project.slug}`,
            kind: 'project' as const,
            slug: project.slug,
            title: project.title,
          }),
      })),

      ...skills.map((item) => ({
        id: `skill:${item.slug}`,
        label: item.title,
        group: 'Skills',
        icon: <ArchiveIcon />,
        keywords: `${item.blurb} ${item.slug}`,
        run: () =>
          open({
            id: `skill:${item.slug}`,
            kind: 'skill' as const,
            slug: item.slug,
            title: item.title,
          }),
      })),

      {
        id: 'copy-email',
        label: 'Copy my email',
        group: 'Contact',
        icon: <EnvelopeIcon />,
        keywords: profile.email,
        run: () => navigator.clipboard.writeText(profile.email).catch(() => {}),
      },

      ...Object.entries(profile.socials).map(([name, href]) => ({
        id: `social:${name}`,
        label: `Open ${name === 'x' ? 'X' : name[0].toUpperCase() + name.slice(1)}`,
        group: 'Contact',
        icon: <ArrowTopRightIcon />,
        run: () => window.open(href, '_blank', 'noopener,noreferrer'),
      })),

      ...(
        [
          ['Light', <SunIcon key="l" />, 'light'],
          ['Dark', <MoonIcon key="d" />, 'dark'],
          ['System', <ComputerDesktopIcon key="s" />, 'system'],
        ] as const
      ).map(([label, icon, value]) => ({
        id: `theme:${value}`,
        label: `Theme: ${label}`,
        group: 'Theme',
        icon,
        keywords: 'appearance colour color mode',
        hint: theme === value ? 'current' : undefined,
        run: (origin?: { x: number; y: number }) => setTheme(value as Theme, origin),
      })),
    ];

    if (tabs.length > 0) {
      list.push({
        id: 'close-all',
        label: 'Close all tabs',
        group: 'Panel',
        icon: <XMarkIcon />,
        keywords: 'back to page dismiss',
        hint: 'Esc',
        run: closeAll,
      });
    }

    return list;
  }, [open, closeAll, tabs.length, theme, setTheme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => `${a.label} ${a.keywords ?? ''}`.toLowerCase().includes(q));
  }, [actions, query]);

  // Grouped for display, but selection indexes the flat list — otherwise arrow
  // keys would have to know about group boundaries.
  const groups = useMemo(() => {
    const map = new Map<string, Action[]>();
    for (const action of results) {
      const bucket = map.get(action.group);
      if (bucket) bucket.push(action);
      else map.set(action.group, [action]);
    }
    return [...map];
  }, [results]);

  // Retyping should put you back on the first result. Adjusting during render is
  // React's documented way to reset state on a change, and it avoids the extra
  // commit an effect would cost on every keystroke.
  const [lastQuery, setLastQuery] = useState(query);
  if (query !== lastQuery) {
    setLastQuery(query);
    setSelected(0);
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'k' || !(isMac() ? e.metaKey : e.ctrlKey)) return;
      e.preventDefault();

      setIsOpen((wasOpen) => {
        if (wasOpen) {
          restoreTo.current?.focus();
          return false;
        }
        restoreTo.current = document.activeElement as HTMLElement;
        setQuery('');
        setSelected(0);
        return true;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Keep the highlighted row on screen when arrowing past the fold. Selecting by
  // index rather than by the `data-selected` flag keeps the lookup independent
  // of how the rows are grouped in the DOM.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelected((i) => (results.length ? (i + 1) % results.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelected((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
        break;
      case 'Enter': {
        e.preventDefault();
        const action = results[selected];
        if (!action) return;
        // Looked up rather than passed, so keyboard activation starts the theme
        // wipe from the same row a click would have.
        action.run(originOf(listRef.current?.querySelector(`[data-index="${selected}"]`) ?? null));
        close();
        break;
      }
      case 'Escape':
        e.preventDefault();
        // The pane binds Escape too. Without this, closing the palette would
        // also close every open tab behind it.
        e.stopPropagation();
        close();
        break;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 flex items-start justify-center bg-stone-950/40 px-4 pt-[15vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="squircle-sm w-full max-w-lg overflow-hidden border border-border bg-surface shadow-2xl/40"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Jump to a project, change the theme…"
              aria-label="Search commands"
              aria-controls="palette-results"
              className="w-full border-b border-border bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted"
            />

            <div
              id="palette-results"
              ref={listRef}
              className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-fg/20 scrollbar-track-transparent p-1.5"
            >
              {results.length === 0 ? (
                <p className="px-2.5 py-6 text-center text-sm text-muted">Nothing matches that.</p>
              ) : (
                groups.map(([group, items]) => (
                  <div key={group}>
                    <p className="px-2.5 pt-2 pb-1 text-[10px] tracking-[0.1em] text-muted uppercase">
                      {group}
                    </p>
                    {items.map((action) => {
                      const index = results.indexOf(action);
                      const isSelected = index === selected;

                      return (
                        <button
                          key={action.id}
                          type="button"
                          data-index={index}
                          onMouseMove={() => setSelected(index)}
                          onClick={(e) => {
                            action.run(originOf(e.currentTarget));
                            close();
                          }}
                          className={`squircle-xs flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm transition-colors ${
                            isSelected ? 'bg-fg/8 text-fg' : 'text-muted'
                          }`}
                        >
                          <span className="grid size-4 shrink-0 place-items-center [&>svg]:size-4">
                            {action.icon}
                          </span>
                          <span className="truncate">{action.label}</span>
                          {action.hint && (
                            <span className="ml-auto shrink-0 text-xs text-muted">
                              {action.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
