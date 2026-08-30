import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: Theme;
  /** `origin` is the click point the reveal expands from; omit it to swap instantly. */
  setTheme: (theme: Theme, origin?: { x: number; y: number }) => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

const STORAGE_KEY = 'theme';
const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Centre of an element, for starting the reveal at the control you pressed. */
export const originOf = (el: Element | null) => {
  if (!el) return undefined;
  const { left, top, width, height } = el.getBoundingClientRect();
  return { x: left + width / 2, y: top + height / 2 };
};

const apply = (theme: Theme) => {
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark' || (theme === 'system' && prefersDark()),
  );
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system',
  );

  const setTheme = useCallback((next: Theme, origin?: { x: number; y: number }) => {
    const commit = () => {
      setThemeState(next);
      // "system" is the absence of a preference, so it clears storage rather than storing a value.
      if (next === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
      apply(next);
    };

    // A circular reveal from whatever was clicked. View Transitions snapshots
    // the old frame and cross-fades it, so the clip-path only has to animate the
    // incoming layer — no duplicated DOM, no flash of the wrong theme.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };

    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit();
      return;
    }

    // Keyboard activation has no click point, so the wipe starts from the middle
    // rather than not happening at all.
    const from = origin ?? { x: innerWidth / 2, y: innerHeight / 2 };

    // Radius to the furthest corner, so the circle always finishes off-screen.
    const radius = Math.hypot(
      Math.max(from.x, innerWidth - from.x),
      Math.max(from.y, innerHeight - from.y),
    );

    doc.startViewTransition(commit).ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${from.x}px ${from.y}px)`,
            `circle(${radius}px at ${from.x}px ${from.y}px)`,
          ],
        },
        {
          duration: 520,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  }, []);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (theme === 'system') apply('system');
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
};
