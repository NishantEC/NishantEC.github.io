import { useContext } from 'react';
import { VisitorStatsContext } from './VisitorStatsProvider';

export default function VisitorCount() {
  const visitors = useContext(VisitorStatsContext);
  if (visitors === null) return null;

  return (
    <footer className="mx-auto mt-12 w-full max-w-2xl border-t border-border pt-5 text-center text-muted text-xs leading-6">
      <p title="Page visits across the site since tracking began, not distinct people. Totals can take up to four hours to refresh.">
        <span className="tabular-nums">{visitors.toLocaleString('en-US')}</span>{' '}
        {visitors === 1 ? 'page visit' : 'page visits'} across the site
        <span aria-hidden="true"> · </span>
        <span className="sr-only">, </span>
        since tracking began
      </p>
    </footer>
  );
}
