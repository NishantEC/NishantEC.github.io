import { AnimatePresence, motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { type Contributions, toWeeks } from '../../utils/github-contributions';

const LEVELS = [
  'bg-fg/10',
  'bg-green-600/20 dark:bg-green-400/20',
  'bg-green-600/40 dark:bg-green-400/40',
  'bg-green-600/65 dark:bg-green-400/65',
  'bg-green-600/90 dark:bg-green-400/90',
];

const formatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

type Hovered = { count: number; date: string; left: number; top: number };

const GithubGraph = ({ contributions }: { contributions: Contributions }) => {
  const [hovered, setHovered] = useState<Hovered>();
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltipWidth, setTooltipWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (tooltipRef.current) setTooltipWidth(tooltipRef.current.offsetWidth);
  }, []);

  const weeks = toWeeks(contributions);
  if (weeks.length === 0) return null;

  const label = hovered
    ? `${hovered.count} contribution${hovered.count > 1 ? 's' : ''} · ${formatter.format(
        new Date(hovered.date),
      )}`
    : '';

  // Keep the tooltip inside the graph instead of letting it hang off either end.
  const left = hovered
    ? Math.min(Math.max(hovered.left, tooltipWidth / 2), containerWidth - tooltipWidth / 2)
    : 0;

  const onPointerOver = (event: React.PointerEvent) => {
    const target = event.target as HTMLElement;
    const { date, count } = target.dataset;
    if (!date) {
      setHovered(undefined);
      return;
    }
    setHovered({
      count: Number(count),
      date,
      left: target.offsetLeft + target.offsetWidth / 2,
      top: target.offsetTop,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative flex w-[min(22rem,calc(100vw-6rem))] flex-col gap-2"
      onPointerOver={onPointerOver}
      onPointerLeave={() => setHovered(undefined)}
    >
      <div
        className="grid grid-flow-col grid-rows-7 gap-[1.5px]"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: grid cells are positional
              key={`${weekIndex}-${dayIndex}`}
              className={`aspect-square w-full rounded-[1.5px] ${day ? LEVELS[day.level] : ''}`}
              data-date={day?.date}
              data-count={day?.count}
            />
          )),
        )}
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="squircle-xs pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+0.25rem)] bg-stone-900 px-2 py-1 text-xs text-nowrap text-stone-100 shadow-xl/30 dark:bg-stone-950"
            style={{ left: `${left}px`, top: `${hovered.top}px` }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GithubGraph;
