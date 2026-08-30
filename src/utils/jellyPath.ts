/**
 * A travel path for a subject that doesn't travel.
 *
 * The baked frames pulse in place — measured across all 120, the horizontal
 * centroid only moves between 31.9 and 33.9 cells, about two columns. So a
 * jellyfish that swims in from one side and back out again cannot be found in
 * the sheet; it has to be composed, by drawing the same frames at a moving
 * offset.
 *
 * Kept as a pure function of normalised time, deliberately separate from both
 * the atlas and the renderer. It is additive in every sense: delete this file
 * and the `drift` branch in `AsciiArt`, and the demo is exactly what it was.
 *
 * The path cycle is independent of the pulse loop, and deliberately not a
 * multiple of it. The pulse is 4s at 30fps; a 14s journey means the bell is at
 * a different phase on each pass, so the loop doesn't announce itself.
 */

/** Cells of horizontal room beyond the subject's own width. */
export const TRAVEL_COLS = 46;

/** Cells of vertical room, so the bob doesn't clip. */
export const TRAVEL_ROWS = 6;

/** One full entrance-to-exit journey. */
export const PATH_SECONDS = 14;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 3;

/** Fractions of the cycle spent entering and leaving. */
const ENTER = 0.24;
const EXIT = 0.76;

export type PathOffset = { dx: number; dy: number };

/**
 * Where to draw the subject at time `t` (0–1 through the cycle), in cells.
 *
 * `subjectCols` is the frame's own width. Returning `dx` in the range
 * `-subjectCols … gridCols` lets the caller treat off-screen as an ordinary
 * position rather than a special case.
 */
export const offsetAt = (t: number, subjectCols: number): PathOffset => {
  const gridCols = subjectCols + TRAVEL_COLS;
  // Fully clear of the right edge, so it is genuinely absent before it arrives.
  const offRight = gridCols + 2;
  const dwell = TRAVEL_COLS / 2;

  let dx: number;
  if (t < ENTER) {
    dx = offRight + (dwell - offRight) * easeOut(t / ENTER);
  } else if (t < EXIT) {
    // Drifting, not parked: it keeps sculling while it is in view.
    const u = (t - ENTER) / (EXIT - ENTER);
    dx = dwell + Math.sin(u * Math.PI * 2) * 6 - u * 8;
  } else {
    const u = (t - EXIT) / (1 - EXIT);
    const from = dwell + Math.sin(Math.PI * 2) * 6 - 8;
    dx = from + (offRight - from) * easeIn(u);
  }

  // Rises slightly as it crosses, then settles — two cycles over the journey so
  // it reads as swimming rather than as a sine wave.
  const dy = Math.sin(t * Math.PI * 4) * (TRAVEL_ROWS / 2 - 1);

  return { dx, dy };
};

/**
 * Blits one frame into a larger grid at an offset, leaving the rest empty.
 * Rounded to whole cells because a character grid has no sub-cell position —
 * interpolating between columns would just blur the subject.
 */
export const compose = (
  frame: Float32Array,
  cols: number,
  rows: number,
  offset: PathOffset,
): Float32Array => {
  const gridCols = cols + TRAVEL_COLS;
  const gridRows = rows + TRAVEL_ROWS;
  const out = new Float32Array(gridCols * gridRows);

  const dx = Math.round(offset.dx);
  const dy = Math.round(offset.dy) + TRAVEL_ROWS / 2;

  for (let y = 0; y < rows; y++) {
    const ty = y + dy;
    if (ty < 0 || ty >= gridRows) continue;
    for (let x = 0; x < cols; x++) {
      const tx = x + dx;
      if (tx < 0 || tx >= gridCols) continue;
      out[ty * gridCols + tx] = frame[y * cols + x];
    }
  }
  return out;
};
