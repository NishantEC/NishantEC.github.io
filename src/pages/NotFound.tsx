import { Link, useLocation } from 'react-router';

import { projects, skills } from '../content/collections';

/**
 * Levenshtein distance, iterative with a single row. The candidate set is a
 * handful of slugs, so this is cheap and exact — a fuzzy library would be more
 * dependency than the problem deserves.
 */
const distance = (a: string, b: string) => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[b.length];
};

const ROUTES = [
  ...projects.map((p) => ({ path: `/project/${p.slug}`, label: p.title, kind: 'project' })),
  ...skills.map((s) => ({ path: `/skills/${s.slug}`, label: s.title, kind: 'skill' })),
];

/**
 * A 404 that does something. Rather than only apologising, it names the path
 * that failed and offers the closest real routes — which is the actual question
 * someone has when they land here from a stale link or a typo.
 */
const NotFound = () => {
  const { pathname } = useLocation();

  // Compared on the last segment: `/project/herrm` should find `herm` without
  // the shared prefix flattening every score.
  const typed = pathname.split('/').filter(Boolean).at(-1) ?? '';

  const suggestions = ROUTES.map((route) => ({
    ...route,
    score: distance(typed.toLowerCase(), route.path.split('/').at(-1)?.toLowerCase() ?? ''),
  }))
    .sort((a, b) => a.score - b.score)
    // Anything further than this is noise dressed up as a suggestion.
    .filter((route) => route.score <= Math.max(4, typed.length * 0.6))
    .slice(0, 3);

  return (
    <section className="section flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">404</p>
        <h1 className="font-display text-2xl leading-8 tracking-[-0.6px] italic">
          No route for that
        </h1>
      </div>

      <p className="squircle-xs overflow-x-auto border border-border bg-surface px-3 py-2 font-mono text-sm text-muted">
        <span>GET </span>
        <span className="text-fg">{pathname}</span>
      </p>

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Closest matches:</p>
          {/* biome-ignore lint/a11y/noRedundantRoles: not redundant — `display: flex`
              strips list semantics in Safari/VoiceOver, so the role must be explicit. */}
          <ul role="list" className="flex flex-col">
            {suggestions.map((route) => (
              <li key={route.path}>
                <Link
                  to={route.path}
                  className="group flex items-baseline justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
                >
                  <span className="truncate text-muted group-hover:text-fg">{route.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{route.path}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm leading-[22px] text-muted">
        Or press <kbd className="rounded-md bg-fg/8 px-1.5 py-0.5 font-sans text-xs">⌘K</kbd> to
        search everything.
      </p>

      <Link
        to="/"
        className="squircle-xs w-fit border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        Back to the start
      </Link>
    </section>
  );
};

export default NotFound;
