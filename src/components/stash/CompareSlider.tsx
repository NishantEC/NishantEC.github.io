import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Two layers, one divider: the source on the left, the ASCII on the right.
 *
 * The top layer is clipped with `clip-path: inset(...)` rather than sized, so
 * both layers stay laid out at full size and nothing reflows as the divider
 * moves — a width-based reveal would re-wrap the character grid on every frame
 * and the ASCII would crawl while you dragged.
 */
const CompareSlider = ({
  left,
  right,
  labelLeft,
  labelRight,
}: {
  left: ReactNode;
  right: ReactNode;
  labelLeft: string;
  labelRight: string;
}) => {
  const [at, setAt] = useState(50);
  const [dragging, setDragging] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  const moveTo = useCallback((clientX: number) => {
    const host = hostRef.current;
    if (!host) return;
    const box = host.getBoundingClientRect();
    setAt(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => moveTo(e.clientX);
    const stop = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
    };
  }, [dragging, moveTo]);

  return (
    <div
      ref={hostRef}
      /*
        Fills its container rather than being sized by the left layer. Both
        sides have to occupy exactly the same box or the divider compares two
        different framings — the source is letterboxed by `object-contain`
        while the character grid is sized from the stage, and they drift apart.
      */
      className="relative isolate h-full w-full touch-none select-none overflow-hidden rounded-[10px] border border-border/60"
    >
      <div className="absolute inset-0 grid place-items-center [&>*]:max-h-full [&>*]:max-w-full">
        {left}
      </div>

      {/* Clipped, not resized. Both layers keep their full geometry. */}
      <div
        className="absolute inset-0 grid place-items-center"
        style={{ clipPath: `inset(0 0 0 ${at}%)` }}
        aria-hidden="true"
      >
        {right}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-px bg-fg/60"
        style={{ left: `${at}%` }}
      />

      {/*
        A real range input, not a div with pointer handlers. It is the whole
        keyboard story for free — arrows, Home, End — and it announces as a
        slider. The visible handle is drawn separately and the input sits over
        the divider, invisible.
      */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={at}
        onChange={(e) => setAt(Number(e.target.value))}
        aria-label={`Reveal ${labelRight} over ${labelLeft}`}
        className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
        onPointerDown={(e) => {
          setDragging(true);
          moveTo(e.clientX);
        }}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 z-20 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-fg/30 bg-bg/90 text-fg text-xs transition-colors ${
          dragging ? 'border-accent' : ''
        }`}
        style={{ left: `${at}%` }}
      >
        ↔
      </div>

      <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-bg/70 px-1.5 py-0.5 text-[10px] text-muted">
        {labelLeft}
      </span>
      <span className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-bg/70 px-1.5 py-0.5 text-[10px] text-muted">
        {labelRight}
      </span>
    </div>
  );
};

export default CompareSlider;
