export type RepoInfo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
  url: string;
};

type RepoResponse = {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  html_url: string;
  fork: boolean;
  private: boolean;
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
];

/** "4 hours ago", "yesterday" — coarsest unit that still reads as non-zero. */
export const relativeTime = (iso: string, now = Date.now()) => {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
};

/**
 * Unauthenticated GitHub allows 60 requests/hour per IP, and this site can open
 * several panes in a session, so every response is cached in sessionStorage for
 * the tab's lifetime. `TTL` only matters for a tab left open for hours.
 */
const TTL = 10 * 60 * 1000;

const cached = async <T>(key: string, fetcher: () => Promise<T>): Promise<T | null> => {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const { at, data } = JSON.parse(raw) as { at: number; data: T };
      if (Date.now() - at < TTL) return data;
    }
  } catch {
    // Corrupt entry — fall through and refetch.
  }

  try {
    const data = await fetcher();
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
    return data;
  } catch {
    return null;
  }
};

/**
 * Every public repo, keyed by name. One request serves the whole page: the
 * project rows and the menu's activity line both read from it. In-flight
 * requests are shared so concurrent callers don't each spend a request against
 * the hourly cap.
 */
let reposPromise: Promise<Record<string, RepoInfo> | null> | null = null;

export const fetchRepos = (user: string) => {
  reposPromise ??= cached(`gh:repos:${user}`, async () => {
    const res = await fetch(
      `https://api.github.com/users/${user}/repos?sort=pushed&direction=desc&per_page=100`,
    );
    if (!res.ok) throw new Error(String(res.status));

    const repos = (await res.json()) as RepoResponse[];

    return Object.fromEntries(
      repos
        .filter((r) => !r.fork && !r.private)
        .map((r): [string, RepoInfo] => [
          r.name,
          {
            name: r.name,
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            pushedAt: r.pushed_at,
            url: r.html_url,
          },
        ]),
    );
  });

  return reposPromise;
};

/** Most recently pushed public repo — powers the menu's activity line. */
export const fetchLatestPush = async (user: string) => {
  const repos = await fetchRepos(user);
  if (!repos) return null;

  const latest = Object.values(repos).sort((a, b) => b.pushedAt.localeCompare(a.pushedAt))[0];
  return latest ?? null;
};
