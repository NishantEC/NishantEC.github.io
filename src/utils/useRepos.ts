import { useEffect, useState } from 'react';
import { fetchRepos, type RepoInfo } from './github';

export const GITHUB_USER = 'NishantEC';

/**
 * Every public repo, keyed by name. `null` until the request resolves and
 * permanently `null` if it fails — callers render their static fallback rather
 * than a spinner, because none of this is load-bearing.
 */
export const useRepos = () => {
  const [repos, setRepos] = useState<Record<string, RepoInfo> | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRepos(GITHUB_USER).then((data) => {
      if (alive) setRepos(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return repos;
};
