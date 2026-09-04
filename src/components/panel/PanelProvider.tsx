import { createContext, type ReactNode, useCallback, useMemo, useState } from 'react';

export type PanelTab = {
  /** Stable key — `project:herm`, `skill:video2ascii`. */
  id: string;
  kind: 'project' | 'skill';
  slug: string;
  title: string;
};

type PanelContextValue = {
  tabs: PanelTab[];
  activeId: string | null;
  open: (tab: PanelTab) => void;
  close: (id: string) => void;
  closeAll: () => void;
  focus: (id: string) => void;
  /** Sidebar width as a percentage of the viewport, shared so the page and the pane stay in step. */
  sidebar: number;
  setSidebar: (pct: number) => void;
  /** Collapsed hides the sidebar entirely and gives the pane the full width. */
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  /** True while dragging the divider, so the width transition goes instant. */
  isResizing: boolean;
  setIsResizing: (v: boolean) => void;
};

export const SIDEBAR_MIN = 24;
export const SIDEBAR_MAX = 45;
const SIDEBAR_DEFAULT = 32;
const SIDEBAR_KEY = 'sidebar-width';
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

/**
 * The URL segment each kind lives under.
 *
 * Stated rather than interpolated from `tab.kind`. The kind is the singular
 * noun for one entry and the segment is the section it belongs to, and those
 * are only the same string by coincidence — they were, while the section was
 * called "stash", and interpolating the kind silently produced `/skill/...`
 * the moment it wasn't. Both directions read from here, so they cannot drift.
 */
const SEGMENT = { project: 'project', skill: 'skills' } as const;

export const KIND_BY_SEGMENT = Object.fromEntries(
  Object.entries(SEGMENT).map(([kind, segment]) => [segment, kind]),
) as Record<string, PanelTab['kind'] | undefined>;

/** The URL for a tab. The active tab lives on a route; the rest are only in state. */
export const tabPath = (tab: PanelTab) => `/${SEGMENT[tab.kind]}/${tab.slug}`;

export const PanelContext = createContext<PanelContextValue>({
  tabs: [],
  activeId: null,
  open: () => {},
  close: () => {},
  closeAll: () => {},
  focus: () => {},
  sidebar: SIDEBAR_DEFAULT,
  setSidebar: () => {},
  isSidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  isResizing: false,
  setIsResizing: () => {},
});

export const PanelProvider = ({ children }: { children: ReactNode }) => {
  /**
   * Always empty on load, and deliberately not persisted.
   *
   * The tab set is a workspace someone builds by clicking around, not a
   * preference — so a fresh document load starts with none, and an item URL
   * renders as a standalone document instead. That is what keeps a shared link
   * from opening in whatever layout the visitor happened to leave behind, and
   * it is the whole reason this isn't read back from storage.
   *
   * The sidebar width below is persisted, because that one *is* a preference.
   */
  const [tabs, setTabs] = useState<PanelTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const open = useCallback((tab: PanelTab) => {
    // Re-opening an existing tab focuses it rather than duplicating.
    setTabs((current) => (current.some((t) => t.id === tab.id) ? current : [...current, tab]));
    setActiveId(tab.id);
  }, []);

  const close = useCallback((id: string) => {
    setTabs((current) => {
      const index = current.findIndex((t) => t.id === id);
      const next = current.filter((t) => t.id !== id);

      setActiveId((currentActive) => {
        if (currentActive !== id) return currentActive;
        if (next.length === 0) return null;
        // Focus the neighbour that took its place, or the new last tab.
        return (next[index] ?? next[next.length - 1]).id;
      });

      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setTabs([]);
    setActiveId(null);
  }, []);

  const focus = useCallback((id: string) => setActiveId(id), []);

  const [sidebar, setSidebarState] = useState(
    () => Number(localStorage.getItem(SIDEBAR_KEY)) || SIDEBAR_DEFAULT,
  );

  const setSidebar = useCallback((pct: number) => {
    const clamped = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, pct));
    setSidebarState(clamped);
    localStorage.setItem(SIDEBAR_KEY, String(clamped));
  }, []);

  /**
   * Persisted alongside the width, for the same reason: how much room you want
   * the page to take is a preference, unlike the tab set above, which is a
   * workspace and resets every load.
   */
  const [isSidebarCollapsed, setCollapsedState] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(v));
  }, []);

  const [isResizing, setIsResizing] = useState(false);

  const value = useMemo(
    () => ({
      tabs,
      activeId,
      open,
      close,
      closeAll,
      focus,
      sidebar,
      setSidebar,
      isSidebarCollapsed,
      setSidebarCollapsed,
      isResizing,
      setIsResizing,
    }),
    [
      tabs,
      activeId,
      open,
      close,
      closeAll,
      focus,
      sidebar,
      setSidebar,
      isSidebarCollapsed,
      setSidebarCollapsed,
      isResizing,
    ],
  );

  return <PanelContext value={value}>{children}</PanelContext>;
};
