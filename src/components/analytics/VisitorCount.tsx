import { useContext } from 'react';
import { VisitorStatsContext } from './VisitorStatsProvider';

export default function VisitorCount() {
  const visits = useContext(VisitorStatsContext);
  if (visits === null || visits === 0) return null;

  return (
    <span
      className="text-xs text-muted tabular-nums"
      title="Total page visits across the site since tracking began. Counts may take up to four hours to refresh."
    >
      {visits.toLocaleString('en-US')} {visits === 1 ? 'page visit' : 'page visits'}
    </span>
  );
}
