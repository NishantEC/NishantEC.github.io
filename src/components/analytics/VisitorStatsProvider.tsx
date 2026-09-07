import { createContext, type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { trackPageVisit } from '../../utils/analytics';

export const VisitorStatsContext = createContext<number | null>(null);

export function VisitorStatsProvider({ children }: { children: ReactNode }) {
  const [visitors, setVisitors] = useState<number | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageVisit(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!import.meta.env.VITE_GOATCOUNTER_CODE) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch('/api/stats', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (
          data.period === 'all-time' &&
          Number.isSafeInteger(data.pageVisits) &&
          data.pageVisits >= 0
        ) {
          if (!controller.signal.aborted) setVisitors(data.pageVisits);
        }
      })
      .catch(() => {
        /* Analytics must never prevent reading the site. */
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  return <VisitorStatsContext.Provider value={visitors}>{children}</VisitorStatsContext.Provider>;
}
