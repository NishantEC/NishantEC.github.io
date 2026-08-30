import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { profile } from '../../data/profile';
import { fetchLatestPush, type RepoInfo, relativeTime } from '../../utils/github';

/**
 * Live status line: the last thing actually pushed to GitHub. Falls back to the
 * static role/status if the API is unreachable or rate-limited.
 */
const MenuStatus = () => {
  const [push, setPush] = useState<RepoInfo | null>(null);

  useEffect(() => {
    fetchLatestPush('NishantEC').then(setPush);
  }, []);

  return (
    <span className="relative block w-full overflow-hidden text-sm text-muted">
      <span className="opacity-0" aria-hidden="true">
        _
      </span>

      <AnimatePresence mode="wait">
        <motion.span
          key={push ? push.name : 'fallback'}
          className="absolute inset-0 flex items-center gap-1.5 text-nowrap"
          initial={{ opacity: 0, y: 6, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
        >
          {push ? (
            <>
              <span className="relative size-1.5 shrink-0 blur-[1px] *:absolute *:inset-0 *:rounded-full *:bg-accent">
                <span />
                <span className="ping" />
              </span>
              <span className="truncate">
                pushed to <span className="text-fg">{push.name}</span> {relativeTime(push.pushedAt)}
              </span>
            </>
          ) : (
            <span className="truncate">
              {profile.role} · {profile.location}
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default MenuStatus;
