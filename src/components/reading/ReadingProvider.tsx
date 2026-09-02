import { createContext, type ReactNode, useCallback, useMemo, useState } from 'react';

type ReadingContextValue = {
  /** Half-bold the front of every word across the site's own prose. */
  bionic: boolean;
  setBionic: (on: boolean) => void;
};

const STORAGE_KEY = 'reading-mode';

export const ReadingContext = createContext<ReadingContextValue>({
  bionic: false,
  setBionic: () => {},
});

/**
 * The archived bionic-reading draft demos half-bolding on a sample paragraph. This applies it to
 * the site's own writing, which is a better argument for the idea than a demo
 * is — and makes the toggle a real accessibility control rather than a toy.
 *
 * Off by default: it's a preference, and imposing it on a first-time reader
 * would be exactly the mistake that draft is sceptical about.
 */
export const ReadingProvider = ({ children }: { children: ReactNode }) => {
  const [bionic, setBionicState] = useState(() => localStorage.getItem(STORAGE_KEY) === 'bionic');

  const setBionic = useCallback((on: boolean) => {
    setBionicState(on);
    if (on) localStorage.setItem(STORAGE_KEY, 'bionic');
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ bionic, setBionic }), [bionic, setBionic]);

  return <ReadingContext value={value}>{children}</ReadingContext>;
};
