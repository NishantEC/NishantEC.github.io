import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { projects, stash } from '../../content/collections';
import { profile } from '../../data/profile';
import { useDocumentMeta } from '../../utils/useDocumentMeta';
import { type PanelTab, tabPath } from './PanelProvider';
import { usePanel } from './usePanel';

const DEFAULT_DESCRIPTION =
  'Frontend engineer in Bangalore building AI-facing product interfaces at Healthifyme, and developer tools on the side.';

/** Each open item gets its own description, so shared links unfurl usefully. */
const descriptionFor = (tab: PanelTab) => {
  if (tab.kind === 'project') {
    return projects.find((p) => p.slug === tab.slug)?.tagline ?? DEFAULT_DESCRIPTION;
  }
  return stash.find((v) => v.slug === tab.slug)?.blurb ?? DEFAULT_DESCRIPTION;
};

/**
 * Resolve a URL back into a tab, so a pasted link finds the right item.
 *
 * Exported because `App` needs the same answer to render the standalone
 * document — a second copy of this rule would drift from `isKnownPath`.
 */
export const tabFromPath = (pathname: string): PanelTab | null => {
  const [, kind, slug] = pathname.split('/');

  if (kind === 'project') {
    const project = projects.find((p) => p.slug === slug);
    return project
      ? { id: `project:${project.slug}`, kind: 'project', slug: project.slug, title: project.title }
      : null;
  }

  if (kind === 'stash') {
    const entry = stash.find((v) => v.slug === slug);
    return entry
      ? { id: `stash:${entry.slug}`, kind: 'stash', slug: entry.slug, title: entry.title }
      : null;
  }

  return null;
};

/**
 * `/` or a path that resolves to a real item. Anything else is a 404.
 *
 * Exported because `App` needs the same answer to decide whether to lay out the
 * split view at all — a second copy of this rule would drift from `tabFromPath`.
 */
export const isKnownPath = (pathname: string) => pathname === '/' || tabFromPath(pathname) !== null;

/**
 * Keeps the active tab and the URL in step, in both directions:
 * URL → open/focus that tab (so links and reloads work), and active tab → URL.
 * The other open tabs stay in state only; they aren't addressable.
 */
const PanelRouteSync = () => {
  const { tabs, activeId, open, focus } = usePanel();
  const navigate = useNavigate();
  const location = useLocation();
  const lastSynced = useRef<string | null>(null);

  // URL → state, but only once a workspace exists. With no tabs open the URL
  // belongs to the standalone document view, and opening one here is exactly
  // what used to drop an outside visitor into somebody else's tab layout.
  // Inside the app, back and forward still resolve to the right tab.
  useEffect(() => {
    if (location.pathname === lastSynced.current) return;
    lastSynced.current = location.pathname;

    if (tabs.length === 0) return;

    const tab = tabFromPath(location.pathname);
    if (!tab) return;

    if (tabs.some((t) => t.id === tab.id)) focus(tab.id);
    else open(tab);
  }, [location.pathname, tabs, open, focus]);

  // State → URL. Left alone on an unknown path, otherwise an open tab would
  // drag the URL back and the 404 could never be reached. Also left alone with
  // no tabs open: the old `?? '/'` fallback redirected a freshly loaded item
  // URL to the home page, which is the one thing a shared link must never do.
  useEffect(() => {
    if (!isKnownPath(location.pathname)) return;

    const active = tabs.find((t) => t.id === activeId);
    if (!active) return;

    const target = tabPath(active);
    if (target === location.pathname) return;
    lastSynced.current = target;
    navigate(target);
  }, [activeId, tabs, navigate, location.pathname]);

  // Falls back to the URL so a standalone document gets the item's own title
  // and description rather than the site defaults.
  const active = tabs.find((t) => t.id === activeId) ?? tabFromPath(location.pathname);

  useDocumentMeta(
    active
      ? {
          title: `${active.title} — ${profile.name}`,
          description: descriptionFor(active),
          path: tabPath(active),
        }
      : {
          title: `${profile.name} • ${profile.role}`,
          description: DEFAULT_DESCRIPTION,
          path: '/',
        },
  );

  return null;
};

export default PanelRouteSync;
