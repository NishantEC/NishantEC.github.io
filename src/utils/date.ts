/**
 * Frontmatter dates are ISO so they sort correctly and Keystatic can edit them
 * with a date picker. Nothing should render one raw — "2026-07-01" in a list of
 * experiments reads like a log line.
 */
export const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
