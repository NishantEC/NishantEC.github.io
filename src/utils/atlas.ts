/**
 * Decodes a grayscale ASCII atlas — one sprite sheet holding every frame's
 * luminance grid, laid out row-major.
 *
 * The point of the format is that the sheet stores *raw* luminance and the
 * shaping happens here at load. Contrast is then a one-number change rather than
 * a re-export, and 48 frames cost about 60KB instead of the megabytes the source
 * video would.
 *
 * Format and constants are the ones produced by the video-to-ascii pipeline.
 */
export type AtlasSpec = {
  url: string;
  cols: number;
  rows: number;
  /** Tiles per row in the sheet. */
  tileX: number;
  count: number;
  /** Values below this are cleared — kills sensor noise in dark areas. */
  floor: number;
  gamma: number;
};

export type Atlas = {
  cols: number;
  rows: number;
  count: number;
  /** Null until the sheet has decoded; callers render nothing until then. */
  frames: Float32Array[] | null;
};

const slice = (spec: AtlasSpec, pixels: Uint8ClampedArray, sheetW: number) => {
  const { cols, rows, tileX, count, floor, gamma } = spec;
  const raw: Float32Array[] = [];

  // Normalise against the brightest pixel across *every* frame, not per frame,
  // or the animation flickers as each frame rescales to its own peak.
  let peak = 0.0001;

  for (let f = 0; f < count; f++) {
    const ox = (f % tileX) * cols;
    const oy = Math.floor(f / tileX) * rows;
    const buf = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = pixels[((oy + y) * sheetW + ox + x) * 4] / 255;
        buf[y * cols + x] = v;
        if (v > peak) peak = v;
      }
    }
    raw.push(buf);
  }

  for (const buf of raw) {
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / peak;
      buf[i] = v < floor ? 0 : ((v - floor) / (1 - floor)) ** gamma;
    }
  }

  return raw;
};

/**
 * Trims every frame to the region that actually holds content.
 *
 * A source shot on black leaves most of the grid empty, which wastes the card's
 * width and leaves isolated lit cells stranded far from the subject — they read
 * as the art bleeding rather than as part of it. The box is the union across all
 * frames so the subject never clips as it moves, and `MIN_INK` ignores single
 * dim cells so one noise pixel can't veto the crop.
 */
const MIN_INK = 0.12;

/** A row or column must be lit this often across the sheet to count as content. */
const MIN_OCCUPANCY = 3;

const cropToContent = (frames: Float32Array[], cols: number, rows: number) => {
  // Counting how often each column and row is lit, rather than taking a union
  // bounding box. A union keeps a single stray pixel in a single frame, which is
  // precisely the mark that reads as the art bleeding — it stretches the box to
  // the edge while everything else sits in the middle.
  const colHits = new Uint32Array(cols);
  const rowHits = new Uint32Array(rows);

  for (const f of frames) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (f[y * cols + x] < MIN_INK) continue;
        colHits[x] += 1;
        rowHits[y] += 1;
      }
    }
  }

  const span = (hits: Uint32Array) => {
    let lo = 0;
    let hi = hits.length - 1;
    while (lo < hits.length && hits[lo] < MIN_OCCUPANCY) lo++;
    while (hi >= 0 && hits[hi] < MIN_OCCUPANCY) hi--;
    return [lo, hi] as const;
  };

  const [x0raw, x1raw] = span(colHits);
  const [y0raw, y1raw] = span(rowHits);
  if (x1raw < x0raw || y1raw < y0raw) return { frames, cols, rows };

  const pad = 1;
  const x0 = Math.max(0, x0raw - pad);
  const y0 = Math.max(0, y0raw - pad);
  const x1 = Math.min(cols - 1, x1raw + pad);
  const y1 = Math.min(rows - 1, y1raw + pad);

  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;

  const cropped = frames.map((f) => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = f[(y0 + y) * cols + (x0 + x)];
        // Anything left outside the busy region is noise, not subject.
        out[y * w + x] = colHits[x0 + x] < MIN_OCCUPANCY || rowHits[y0 + y] < MIN_OCCUPANCY ? 0 : v;
      }
    }
    return out;
  });

  return { frames: cropped, cols: w, rows: h };
};

/*
 * There was a `centreEachFrame` here, re-centring every frame on its own ink
 * bounding box. It is gone, and should not come back in that form.
 *
 * It was written to remove what looked like drift, and measurement showed the
 * drift was the subject swimming: frame-to-frame centroid movement in the raw
 * frames is 1.16 cells at worst and 0.41 on average, which is smooth motion.
 * Re-centring took that to 5.66 and 1.36 — three times worse — because it
 * aligned on the bounding box, and the jellyfish's faint tentacles fade in and
 * out at the edges. That swings the box by up to 21 columns between
 * consecutive frames, so the correction yanked the whole subject sideways and
 * read as the animation glitching.
 *
 * If per-frame alignment is ever wanted, align on the luminance centroid, which
 * is mass-weighted and doesn't care where a threshold happens to fall. But the
 * source motion is worth keeping: it is what the clip actually does.
 */

export const loadAtlas = async (spec: AtlasSpec): Promise<Atlas> => {
  const atlas: Atlas = { cols: spec.cols, rows: spec.rows, count: spec.count, frames: null };

  const img = new Image();
  img.src = spec.url;
  try {
    await img.decode();
  } catch {
    return atlas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return atlas;

  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const trimmed = cropToContent(slice(spec, data, canvas.width), spec.cols, spec.rows);
  atlas.frames = trimmed.frames;
  atlas.cols = trimmed.cols;
  atlas.rows = trimmed.rows;
  return atlas;
};
