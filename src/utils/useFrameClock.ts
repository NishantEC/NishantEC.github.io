import { useEffect, useRef } from 'react';

/** Refreshes to average before committing to a cadence. */
const CALIBRATION_FRAMES = 10;

/**
 * Calls `onFrame` at a target rate, quantised to whole display refreshes.
 *
 * A frame can only ever be shown for a whole number of refreshes, so a timer
 * asking for an interval that isn't a multiple of one gets rounded — and
 * rounded inconsistently, a refresh short on one frame and a refresh long on
 * the next. At 8fps on a 60Hz screen that is 7.5 refreshes per frame, which
 * measured here as a steady 133/117/133/117ms alternation and read as a stutter
 * on every single frame.
 *
 * Counting refreshes instead makes every frame the same length by construction.
 * The cadence comes from the display's own measured rate rather than an assumed
 * 60Hz, so the same target resolves to twice as many refreshes on a 120Hz panel
 * and the wall-clock rate holds.
 *
 * Pick a target that divides the refresh rate to avoid rounding at all: 12fps
 * is exactly five refreshes at 60Hz, where 8fps cannot be anything but uneven.
 */
export const useFrameClock = (fps: number, active: boolean, onFrame: () => void) => {
  const callback = useRef(onFrame);
  callback.current = onFrame;

  useEffect(() => {
    if (!active) return;

    const targetMs = 1000 / fps;
    let raf = 0;
    let last = 0;
    let measured = 0;
    let samples = 0;
    let everyNRefreshes = 0;
    let sinceAdvance = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      if (last === 0) {
        last = now;
        return;
      }
      const delta = now - last;
      last = now;

      if (samples < CALIBRATION_FRAMES) {
        measured += delta;
        samples += 1;
        if (samples === CALIBRATION_FRAMES) {
          everyNRefreshes = Math.max(1, Math.round(targetMs / (measured / CALIBRATION_FRAMES)));
        }
        return;
      }

      sinceAdvance += 1;
      if (sinceAdvance < everyNRefreshes) return;
      sinceAdvance = 0;
      callback.current();
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps, active]);
};
