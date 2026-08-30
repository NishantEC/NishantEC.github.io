import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
};

/**
 * One line of the condensed sidebar: name on the left, star count or date on
 * the right. Rows that map to something openable get the active treatment when
 * that item is showing in the pane.
 *
 * The active marker is a thicker accent segment of the spine itself rather than
 * a separate mark — the rail already groups the rows, so one element does both
 * jobs. It's absolutely positioned into the gutter (`GUTTER + GUTTER_GAP` back
 * from the row's left edge), so an active row is exactly as wide as an inactive
 * one and nothing in the text flow shifts.
 */
const IndexRow = ({ label, meta, onClick, isActive }: Props) => {
  const shared = 'group flex w-full items-baseline justify-between gap-3 py-1.5 text-left text-sm';

  const content = (
    <>
      <span className={`truncate ${isActive ? 'text-fg' : 'text-muted group-hover:text-fg'}`}>
        {label}
      </span>
      {meta && <span className="shrink-0 text-xs text-muted tabular-nums">{meta}</span>}
    </>
  );

  return (
    <li className="relative">
      {isActive && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2 -left-7 h-5 w-[3px] rounded-full bg-accent"
        />
      )}

      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-current={isActive ? 'page' : undefined}
          className={`${shared} transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        >
          {content}
        </button>
      ) : (
        <div className={shared}>{content}</div>
      )}
    </li>
  );
};

export default IndexRow;
