import jellyAtlas from '../assets/ascii/jelly-b.png';
import type { AtlasSpec } from '../utils/atlas';

/**
 * The pre-baked jellyfish: 120 frames of luminance tiles on one sheet.
 *
 * The original bake by the `video-to-ascii` skill was 48 frames at 12fps. The
 * source clip is long gone, so the extra frames are motion-compensated
 * interpolation of those 48 rather than new footage — `ffmpeg minterpolate`
 * with `mci`/`aobmc`, run over three concatenated copies of the loop so the
 * wrap point has real neighbours on both sides, taking the middle pass.
 *
 * It is genuine intermediate motion, not frame doubling: per-frame centroid
 * movement measured 0.415 cells at 48 frames and 0.161 at 120, a ratio of 0.39
 * against a theoretical 0.40 for 2.5× the samples, with no duplicate steps.
 *
 * Length still needs the source. Interpolation adds frames between the ones
 * that exist; it cannot add seconds.
 *
 * Shared rather than declared where it is used, because two demos now play it —
 * the ASCII entry and the texture lab, which takes it as one source among
 * uploads and the camera. The numbers are the skill's output and mean nothing
 * on their own; changing one without rebaking the sheet just breaks it.
 */
export const JELLY_ATLAS: AtlasSpec = {
  url: jellyAtlas,
  cols: 84,
  rows: 50,
  tileX: 8,
  count: 120,
  /**
   * Higher than the 0.06 the 48-frame sheet used. Motion-compensated
   * interpolation leaves faint ghosts along the edges of a moving subject, and
   * at 0.06 those pass the content test — the crop opened out to 80×39 and left
   * stray marks floating beside the jellyfish. 0.14 is the measured point where
   * the crop returns to exactly 64×38, matching the original.
   */
  floor: 0.14,
  gamma: 0.578,
};

/**
 * The two rates offered to the reader, as labels so they can be a `Select`.
 *
 * Both divide 60Hz exactly — 15 is four refreshes per frame, 30 is two — so neither
 * judders. See `useFrameClock` for why that matters more than the number itself.
 *
 * They are a speed choice as much as a smoothness one. The sheet holds 120 frames of a
 * loop that was originally 48, so 15 stretches it to 8 seconds and the jellyfish swims
 * at half the speed while still showing more distinct frames per second than the 12 the
 * original managed. Slower and smoother at once, which is only possible because the
 * extra frames are real interpolated motion rather than held ones.
 */
export const JELLY_SPEEDS = { '15 fps': 15, '30 fps': 30 } as const;

export type JellySpeed = keyof typeof JELLY_SPEEDS;

export const JELLY_SPEED_NAMES = Object.keys(JELLY_SPEEDS) as JellySpeed[];

export const JELLY_SPEED_DEFAULT: JellySpeed = '30 fps';
