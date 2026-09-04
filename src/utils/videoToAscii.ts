/**
 * The `video2ascii` pipeline, in the browser.
 *
 * The skill does this with ffmpeg and python: sample frames, find the subject,
 * crop to it, normalise to a density grid, then let a human approve before
 * baking. Every one of those steps has a browser equivalent — `<video>` seeking
 * for the sampling, a canvas for the pixels — so the whole thing runs in the
 * tab with no upload and no server.
 *
 * Written as stages that report progress rather than as one function, because
 * watching it work is the point: the sampling and the crop search are the
 * interesting part, and a spinner would hide exactly what makes this worth
 * showing.
 */

export type StageId = 'decode' | 'sample' | 'subject' | 'grid';

export type Progress = {
  stage: StageId;
  /** 0–1 through the current stage. */
  ratio: number;
  /** Something concrete to show — the frame just sampled, the box just found. */
  detail?: string;
  /**
   * The stage's actual working state, for drawing rather than describing.
   * A progress bar says a stage is running; these say what it is doing.
   */
  thumb?: string;
  /** Column and row occupancy so far, normalised 0–1 — the crop search itself. */
  colHits?: Float32Array;
  rowHits?: Float32Array;
  /** Rows of the grid built so far, as text. */
  gridRows?: string[];
};

export type Crop = { x: number; y: number; w: number; h: number };

export type Sampled = {
  /** Full-resolution-ish RGBA frames, kept only until the grid is built. */
  frames: ImageData[];
  width: number;
  height: number;
  duration: number;
};

export type Baked = {
  grids: Float32Array[];
  cols: number;
  rows: number;
  crop: Crop;
};

export type BakeSettings = {
  cols: number;
  floor: number;
  gamma: number;
  /** Bright subject on dark, or the inverse. */
  invertSource: boolean;
};

/**
 * How fine the character grid is. Discrete steps rather than a slider because
 * changing it re-bakes every frame — roughly a second of synchronous work — and
 * a continuous control would re-run that on every tick of the drag.
 */
export const DENSITIES = {
  coarse: 56,
  normal: 84,
  fine: 124,
  finest: 168,
} as const;

export type DensityName = keyof typeof DENSITIES;
export const DENSITY_NAMES = Object.keys(DENSITIES) as DensityName[];

export const DEFAULT_SETTINGS: BakeSettings = {
  cols: DENSITIES.normal,
  floor: 0.06,
  gamma: 0.85,
  invertSource: false,
};

/** A character cell is about 0.6 as wide as it is tall. */
const CELL_ASPECT = 0.6;

/** Frames sampled from the clip. Enough for smooth playback, few enough to seek in reasonable time. */
export const FRAME_COUNT = 96;

/** Sampling resolution. The grid is far smaller, so full resolution buys nothing. */
const SAMPLE_WIDTH = 320;

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Seeks a video element and resolves once the frame at that time is painted. */
const seekTo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    video.currentTime = time;
  });

export const decode = (file: File) =>
  new Promise<{ video: HTMLVideoElement; url: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    video.onloadedmetadata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be decoded as video."));
    };
  });

/**
 * Steps through the clip, seeking rather than playing.
 *
 * Playing and grabbing whatever the decoder happens to show is faster but gives
 * unevenly spaced frames, which shows up as uneven motion later. Seeking is
 * slower and exact.
 */
export const sample = async (
  video: HTMLVideoElement,
  onProgress: (p: Progress) => void,
  signal?: { cancelled: boolean },
): Promise<Sampled> => {
  const duration = video.duration || 1;
  const scale = SAMPLE_WIDTH / (video.videoWidth || SAMPLE_WIDTH);
  const width = SAMPLE_WIDTH;
  const height = Math.max(1, Math.round((video.videoHeight || 180) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  const frames: ImageData[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    if (signal?.cancelled) break;
    // Nudged off the exact end: seeking to `duration` lands past the last frame
    // on some decoders and paints nothing.
    await seekTo(video, (i / FRAME_COUNT) * duration * 0.98);
    ctx.drawImage(video, 0, 0, width, height);
    frames.push(ctx.getImageData(0, 0, width, height));
    onProgress({
      stage: 'sample',
      ratio: (i + 1) / FRAME_COUNT,
      detail: `frame ${i + 1} of ${FRAME_COUNT}`,
      // Every eighth, not every frame: a strip of twelve reads as a filmstrip,
      // and a data URL per frame would cost more than the sampling does.
      thumb: i % 8 === 0 ? canvas.toDataURL('image/jpeg', 0.5) : undefined,
    });
  }

  return { frames, width, height, duration };
};

/**
 * Finds the subject by occupancy, not by a union bounding box.
 *
 * A union box is stretched to the edge by a single bright speck in a single
 * frame, which is exactly the artefact it is meant to remove. Counting how often
 * each row and column is lit across the whole clip ignores the speck and keeps
 * what is consistently there.
 */
export const findSubject = (
  sampled: Sampled,
  settings: BakeSettings,
  onProgress: (p: Progress) => void,
): Crop => {
  const { frames, width, height } = sampled;
  const colHits = new Int32Array(width);
  const rowHits = new Int32Array(height);

  let peak = 1;
  for (const frame of frames) {
    for (let i = 0; i < frame.data.length; i += 4) {
      const v = luminance(frame.data[i], frame.data[i + 1], frame.data[i + 2]);
      if (v > peak) peak = v;
    }
  }

  const threshold = peak * 0.18;
  frames.forEach((frame, index) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        let v = luminance(frame.data[i], frame.data[i + 1], frame.data[i + 2]);
        if (settings.invertSource) v = peak - v;
        if (v < threshold) continue;
        colHits[x] += 1;
        rowHits[y] += 1;
      }
    }
    // Normalised copies, so the drawing can scale them without knowing the
    // frame count and without holding a reference to the live counters.
    const peakCol = Math.max(1, ...colHits);
    const peakRow = Math.max(1, ...rowHits);
    onProgress({
      stage: 'subject',
      ratio: (index + 1) / frames.length,
      colHits: Float32Array.from(colHits, (v) => v / peakCol),
      rowHits: Float32Array.from(rowHits, (v) => v / peakRow),
    });
  });

  const minHits = Math.max(2, Math.round(frames.length * 0.04));
  const span = (hits: Int32Array) => {
    let lo = 0;
    let hi = hits.length - 1;
    while (lo < hits.length && hits[lo] < minHits) lo++;
    while (hi >= 0 && hits[hi] < minHits) hi--;
    return lo > hi ? ([0, hits.length - 1] as const) : ([lo, hi] as const);
  };

  const [x0, x1] = span(colHits);
  const [y0, y1] = span(rowHits);
  return { x: x0, y: y0, w: Math.max(1, x1 - x0 + 1), h: Math.max(1, y1 - y0 + 1) };
};

/**
 * Crops, downsamples to character cells and normalises.
 *
 * The peak is taken across every frame, not per frame. Per-frame normalisation
 * makes each frame use the full range independently, so the whole clip pulses in
 * brightness as the subject moves.
 */
export const bake = (
  sampled: Sampled,
  crop: Crop,
  settings: BakeSettings,
  onProgress: (p: Progress) => void,
): Baked => {
  const { frames, width } = sampled;
  const cols = settings.cols;
  const rows = Math.max(1, Math.round(cols * CELL_ASPECT * (crop.h / crop.w)));

  const cellW = crop.w / cols;
  const cellH = crop.h / rows;

  const raw: Float32Array[] = [];
  let peak = 0.0001;

  frames.forEach((frame, index) => {
    const grid = new Float32Array(cols * rows);
    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        // Average the cell rather than sampling its centre: one pixel of a noisy
        // frame decides the whole cell and the result crawls between frames.
        const sx0 = crop.x + Math.floor(rx * cellW);
        const sy0 = crop.y + Math.floor(ry * cellH);
        const sx1 = crop.x + Math.max(sx0 + 1, Math.floor((rx + 1) * cellW));
        const sy1 = crop.y + Math.max(sy0 + 1, Math.floor((ry + 1) * cellH));
        let sum = 0;
        let n = 0;
        for (let y = sy0; y < sy1; y++) {
          for (let x = sx0; x < sx1; x++) {
            const i = (y * width + x) * 4;
            sum += luminance(frame.data[i], frame.data[i + 1], frame.data[i + 2]);
            n++;
          }
        }
        const v = n ? sum / n : 0;
        grid[ry * cols + rx] = v;
        if (v > peak) peak = v;
      }
    }
    raw.push(grid);
    // The first frame only: the grid's shape is the point, and re-rendering
    // ninety-six of them would cost more than the bake.
    let gridRows: string[] | undefined;
    if (index === 0) {
      const RAMP = ' .:-=+*#%@';
      const localPeak = Math.max(0.0001, ...grid);
      gridRows = [];
      for (let ry = 0; ry < rows; ry++) {
        let line = '';
        for (let rx = 0; rx < cols; rx++) {
          const t = grid[ry * cols + rx] / localPeak;
          line += RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(t * (RAMP.length - 1))))];
        }
        gridRows.push(line);
      }
    }
    onProgress({ stage: 'grid', ratio: (index + 1) / frames.length, gridRows });
  });

  for (const grid of raw) {
    for (let i = 0; i < grid.length; i++) {
      let t = grid[i] / peak;
      if (settings.invertSource) t = 1 - t;
      t = t < settings.floor ? 0 : (t - settings.floor) / (1 - settings.floor);
      grid[i] = t ** settings.gamma;
    }
  }

  return { grids: raw, cols, rows, crop };
};
