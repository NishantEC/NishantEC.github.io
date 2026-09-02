import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArchiveIcon from '~icons/heroicons/archive-box';
import BarsIcon from '~icons/heroicons/bars-3';
import BriefcaseIcon from '~icons/heroicons/briefcase';
import CodeBracketIcon from '~icons/heroicons/code-bracket';
import ComputerDesktopIcon from '~icons/heroicons/computer-desktop';
import HomeIcon from '~icons/heroicons/home';
import MoonIcon from '~icons/heroicons/moon';
import StarIcon from '~icons/heroicons/star';
import SunIcon from '~icons/heroicons/sun';
import avatar from '../../assets/me.jpeg';
import { profile } from '../../data/profile';
import { usePanel } from '../panel/usePanel';
import type { Theme } from '../theme/ThemeProvider';
import { useTheme } from '../theme/useTheme';
import MenuItem from './MenuItem';
import MenuStatus from './MenuStatus';

const TRANSITION_DURATION = 400;

type Item = {
  name: string;
  icon?: ReactNode;
  isActive?: boolean;
  isCentered?: boolean;
  onSelect: (origin?: { x: number; y: number }) => void;
};

type Section = { label: string; isGrid?: boolean; items: Item[] };

const isMacPlatform = () =>
  (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ===
    'macOS' || /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const Menu = () => {
  const { theme, setTheme } = useTheme();
  const { tabs } = usePanel();
  const isSplit = tabs.length > 0;
  const [isMac, setIsMac] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const isTransitioning = useRef(false);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scrollToSection = useCallback((id: string) => {
    const target = document.querySelector<HTMLElement>(`#${id}`);
    if (!target) return;
    // Offset clears the fixed menu so the heading isn't hidden behind it.
    scrollTo({ behavior: 'smooth', top: target.offsetTop - 150 });
    setIsOpen(false);
  }, []);

  const sections: Section[] = useMemo(
    () => [
      {
        label: 'Sections',
        items: [
          { name: 'Home', icon: <HomeIcon />, onSelect: () => scrollToSection('hero') },
          {
            name: 'Experience',
            icon: <BriefcaseIcon />,
            onSelect: () => scrollToSection('experience'),
          },
          {
            name: 'Skills',
            icon: <ArchiveIcon />,
            onSelect: () => scrollToSection('skills'),
          },
          { name: 'Open source', icon: <StarIcon />, onSelect: () => scrollToSection('projects') },
          { name: 'Stack', icon: <CodeBracketIcon />, onSelect: () => scrollToSection('stack') },
        ],
      },
      {
        label: 'Theme',
        isGrid: true,
        items: (
          [
            ['Light', <SunIcon key="l" />, 'light'],
            ['Dark', <MoonIcon key="d" />, 'dark'],
            ['System', <ComputerDesktopIcon key="s" />, 'system'],
          ] as const
        ).map(([name, icon, value]) => ({
          name,
          icon,
          isCentered: true,
          isActive: theme === value,
          onSelect: (origin?: { x: number; y: number }) => setTheme(value as Theme, origin),
        })),
      },
    ],
    [scrollToSection, setTheme, theme],
  );

  const items = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  // ⌘K belongs to the command palette now — it reaches every project, the theme
  // and the contact actions, which is a superset of this menu and works with a
  // pane open where the pill is hidden. The pill still opens on hover and touch,
  // and its badge advertises the palette.
  useEffect(() => {
    setIsMac(isMacPlatform());
    return () => clearTimeout(transitionTimeout.current);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // On narrow screens nothing starts selected, so the first arrow press picks item 0.
    setSelected(window.innerWidth < 480 ? -1 : 0);

    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelected((i) => (i - 1 < 0 ? items.length - 1 : i - 1));
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelected((i) => (i + 1 > items.length - 1 ? 0 : i + 1));
          break;
        case 'Enter':
          e.preventDefault();
          items[selected]?.onSelect();
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#menu')) setIsOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', onClick);
    };
  }, [isOpen, items, selected]);

  // With a pane open the sidebar is already a compact index of everything the
  // menu navigates to, so the floating pill is redundant there.
  if (isSplit) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-8 z-50 flex justify-center px-8 sm:top-12">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover only reveals the menu; every action inside is a real button, and ⌘K opens it from the keyboard */}
      <div
        id="menu"
        className={`menu-shell pointer-events-auto w-full rounded-[1.6rem] bg-surface/90 ring ring-border backdrop-blur-sm transition-all duration-400 ease-out ${
          isOpen
            ? 'max-w-[min(400px,calc(100vw-4rem))] rounded-b-xl shadow-2xl dark:shadow-2xl/50'
            : 'max-w-xs shadow-lg/6'
        }`}
        onMouseEnter={() => !isTransitioning.current && setIsOpen(true)}
        onMouseLeave={() => !isTransitioning.current && setIsOpen(false)}
      >
        <div
          className="flex items-center overflow-hidden p-1.5"
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!isTransitioning.current) setIsOpen((v) => !v);
          }}
        >
          <img className="size-10 rounded-full object-cover" src={avatar} alt="" />

          <div className="menu-status flex w-full items-center justify-between pr-1.5 pl-2 text-nowrap">
            <div className="flex w-full min-w-0 flex-col leading-5">
              <span>{profile.name}</span>
              <MenuStatus />
            </div>

            <BarsIcon className="mr-1.5 ml-auto sm:hidden" />
            <kbd className="mr-1.5 ml-auto flex items-center gap-0.5 rounded-md bg-fg/5 p-1 font-sans text-sm text-muted not-sm:hidden">
              <span className={`leading-none ${isMac ? 'text-base' : ''}`}>
                {isMac ? '⌘' : 'Ctrl'}
              </span>
              K
            </kbd>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="relative flex flex-col gap-1.5 overflow-hidden p-1.5 pt-0"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: TRANSITION_DURATION / 1000, ease: [0.33, 1, 0.68, 1] }}
            >
              {sections.map((section) => (
                <div key={section.label} className="contents">
                  <hr className="-mx-1.5 text-border" />
                  <span className="pt-1 pl-2 text-sm text-muted">{section.label}</span>
                  <div className={section.isGrid ? 'grid grid-cols-3 gap-1.5' : 'contents'}>
                    {section.items.map((item) => {
                      const index = items.indexOf(item);
                      return (
                        <MenuItem
                          key={item.name}
                          isSelected={selected === index}
                          isActive={item.isActive}
                          isCentered={item.isCentered}
                          onMouseEnter={() => setSelected(index)}
                          onSelect={item.onSelect}
                        >
                          {item.icon}
                          {item.name}
                        </MenuItem>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Invisible margin so the menu survives the pointer drifting off its edge. */}
              <div className="absolute -inset-x-12 -top-0 -bottom-16 -z-10 not-sm:hidden" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Menu;
