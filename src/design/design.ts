import { useSyncExternalStore } from 'react';

/**
 * The redesign's choices, in one place.
 *
 * Every visual decision from the design pass lives here as a value, so the
 * same components can render either the decided design or the live site it
 * replaces. Visitors only ever see `DESIGN`. In dev (or with `?design` in the
 * URL) the editor overlay writes to this store, which is how a choice gets
 * tried on the real page instead of in a mockup. Locked decisions and their
 * reasons are logged in `docs/design/portfolio-decisions.md`.
 */
export type Design = {
  /** `enform`: sky in light mode, night in dark. `current`: the stone palette. */
  palette: 'enform' | 'current';
  /** `print`: a still Paper GrainGradient behind the hero only. */
  background: 'print' | 'none';
  /** `glass`: Enform's window glass on every shell, never an outline. */
  surface: 'glass' | 'current';
  /** Corner radius of card shells, in px. */
  radius: number;
  /** A "now building" pill above the name. */
  statusPill: boolean;
  /** Section labels. `current` mixes a serif index with a sans label; the rest are one font, one colour. */
  headings: 'current' | 'numbered' | 'plain' | 'title';
};

/** The site as it was before the redesign, kept for side-by-side comparison. */
export const LIVE: Design = {
  palette: 'current',
  background: 'none',
  surface: 'current',
  radius: 20,
  statusPill: false,
  headings: 'current',
};

/** The decided design. Each value here is locked in the decisions log. */
export const DESIGN: Design = {
  palette: 'enform',
  background: 'print',
  surface: 'glass',
  radius: 16,
  statusPill: false,
  /** Not decided yet: stays as it is today until locked. */
  headings: 'current',
};

/**
 * Most of the design is CSS keyed off attributes on <html>, so switching a
 * choice costs a style recalc and no React render below the provider.
 */
const apply = (design: Design) => {
  const root = document.documentElement;
  root.dataset.palette = design.palette;
  root.dataset.surface = design.surface;
  root.style.setProperty('--shell-r', `${design.radius}px`);
};

let state = DESIGN;
const listeners = new Set<() => void>();

export const designStore = {
  get: () => state,
  set(next: Design) {
    state = next;
    apply(next);
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

apply(DESIGN);

export const useDesign = () => useSyncExternalStore(designStore.subscribe, designStore.get);

/**
 * `useTheme` returns the setting, which can be `system`; the `dark` class on
 * <html> is the resolved answer, so that is what gets watched.
 */
export const useResolvedTheme = () =>
  useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'dark' as const,
  );
