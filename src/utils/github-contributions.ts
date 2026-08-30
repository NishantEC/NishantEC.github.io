export type Day = { date: string; count: number; level: number };
export type Contributions = Day[];

type ApiResponse = {
  total?: Record<string, number>;
  contributions: { date: string; count: number; level: number }[];
};

export type ContributionsResult = {
  days: Contributions;
  total: number;
};

/**
 * Public, unauthenticated mirror of the GitHub contributions calendar.
 * Returns an empty array on any failure — the graph just renders as empty
 * cells rather than breaking the page.
 */
export const fetchContributions = async (user: string): Promise<ContributionsResult> => {
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`);
    if (!res.ok) return { days: [], total: 0 };

    const data = (await res.json()) as ApiResponse;
    const days = data.contributions ?? [];
    const total =
      Object.values(data.total ?? {}).reduce((sum, n) => sum + n, 0) ||
      days.reduce((sum, d) => sum + d.count, 0);

    return { days, total };
  } catch {
    return { days: [], total: 0 };
  }
};

/** Chunks a flat day list into calendar weeks, padding the first week so it starts on Sunday. */
export const toWeeks = (contributions: Contributions): (Day | undefined)[][] => {
  if (contributions.length === 0) return [];

  const days = [...contributions];
  const leading = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const padded: (Day | undefined)[] = [
    ...Array.from<undefined>({ length: leading }).fill(undefined),
    ...days,
  ];

  const weeks: (Day | undefined)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return weeks;
};
