type PageVisit = { path: string; title: string };

declare global {
  interface Window {
    goatcounter?: { no_onload?: boolean; count?: (visit: PageVisit) => void };
  }
}

let enabled = false;
let lastPath: string | undefined;
const pending: PageVisit[] = [];

function flush() {
  if (!window.goatcounter?.count) return;
  for (const visit of pending.splice(0)) window.goatcounter.count(visit);
}

/** React Router owns pageviews, with GoatCounter's automatic onload disabled. */
export function startAnalytics() {
  const code = import.meta.env.VITE_GOATCOUNTER_CODE?.trim();
  const domains = ['www.nishantg.com', 'nishantg.com'];
  if (!import.meta.env.PROD || !code || !domains.includes(window.location.hostname)) return;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(code)) return;
  if (document.getElementById('goatcounter-tracker')) return;

  enabled = true;
  window.goatcounter = { no_onload: true };
  const script = document.createElement('script');
  script.id = 'goatcounter-tracker';
  script.src = 'https://gc.zgo.at/count.js';
  script.async = true;
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  script.onload = flush;
  script.onerror = () => {
    enabled = false;
    pending.length = 0;
  };
  document.head.appendChild(script);
}

export function trackPageVisit(path: string) {
  if (!enabled || path === lastPath) return;
  lastPath = path;
  pending.push({ path, title: document.title });
  if (pending.length > 100) pending.shift();
  flush();
}
