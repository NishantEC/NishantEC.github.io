/**
 * Texture filters over a canvas, in the two shapes the technique comes in.
 *
 * `pixel` rewrites the buffer in place — read `getImageData`, transform the
 * bytes, write it back. `marks` throws the pixels away and redraws the frame as
 * a grid of shapes or glyphs, which is why its output is resolution-independent
 * in a way a filtered photograph isn't.
 *
 * Everything here is deliberately cheap. Measured against a reference
 * implementation of the painterly filters — watercolour, ink wash, full CMYK
 * risograph — those run 75–258ms on a third of a megapixel, which is 4–13fps
 * and no use over video. A flat per-pixel pass over 1080p costs about 4ms. So
 * the set below is the half that survives being asked for 30 frames a second,
 * and the expensive half is left for a fragment shader to do properly.
 */

export type TextureKind = 'pixel' | 'marks';

export type TextureOptions = {
  /** Cell size for `marks`, and screen size for the halftones. */
  scale: number;
  /** Applied as a gamma before anything else looks at the luminance. */
  contrast: number;
  /** 0 leaves the source alone, 1 is the texture at full strength. */
  intensity: number;
  invert: boolean;
  ink: string;
  paper: string;
};

/**
 * The 8×8 ordered-dither threshold map. Its whole point is that neighbouring
 * values are far apart in the matrix, so the dots it turns on scatter instead
 * of clumping — which is what separates ordered dithering from a plain
 * threshold, and it costs one array lookup per pixel.
 */
const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63, 32, 16, 44, 28, 35, 19, 47, 31, 8, 56, 4, 52, 11, 59, 7, 55, 40, 24,
  36, 20, 43, 27, 39, 23, 2, 50, 14, 62, 1, 49, 13, 61, 34, 18, 46, 30, 33, 17, 45, 29, 10, 58, 6,
  54, 9, 57, 5, 53, 42, 26, 38, 22, 41, 25, 37, 21,
];

const RAMPS = {
  glyph: ' .:-=+*#%@',
  block: ' ░▒▓█',
  braille: ' ⠁⠃⠇⠧⠷⠿⣿',
} as const;

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const hexToRgb = (hex: string): [number, number, number] => {
  const v = Number.parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

/** Deterministic value noise. A hash, not `Math.random`, so a still frame doesn't crawl. */
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Pixel filters
// ---------------------------------------------------------------------------

type PixelFilter = (data: Uint8ClampedArray, w: number, h: number, o: TextureOptions) => void;

/** Ordered dither to one bit, in two chosen colours. */
const bitgrain: PixelFilter = (data, w, h, o) => {
  const [ir, ig, ib] = hexToRgb(o.ink);
  const [pr, pg, pb] = hexToRgb(o.paper);
  // Scale the matrix so the pattern coarsens with `scale` rather than staying
  // locked to the pixel grid — at 1:1 on a big frame it reads as flat noise.
  const step = Math.max(1, Math.round(o.scale / 2));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let t = luminance(data[i], data[i + 1], data[i + 2]) / 255;
      t = t ** o.contrast;
      if (o.invert) t = 1 - t;
      const threshold = BAYER_8[((y / step) & 7) * 8 + ((x / step) & 7)] / 64;
      const on = t > threshold;
      data[i] = mix(data[i], on ? ir : pr, o.intensity);
      data[i + 1] = mix(data[i + 1], on ? ig : pg, o.intensity);
      data[i + 2] = mix(data[i + 2], on ? ib : pb, o.intensity);
    }
  }
};

/** Per-pixel value noise, the cheap half of what makes print look printed. */
const grain: PixelFilter = (data, w, h, o) => {
  const amount = 90 * o.intensity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n = (hash(x, y) - 0.5) * amount;
      data[i] += n;
      data[i + 1] += n;
      data[i + 2] += n;
    }
  }
};

/** Duotone: map luminance onto a paper→ink ramp. Cyanotype is this with blue ink. */
const duotone: PixelFilter = (data, w, h, o) => {
  const [ir, ig, ib] = hexToRgb(o.ink);
  const [pr, pg, pb] = hexToRgb(o.paper);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let t = luminance(data[i], data[i + 1], data[i + 2]) / 255;
      t = t ** o.contrast;
      if (o.invert) t = 1 - t;
      data[i] = mix(data[i], mix(pr, ir, t), o.intensity);
      data[i + 1] = mix(data[i + 1], mix(pg, ig, t), o.intensity);
      data[i + 2] = mix(data[i + 2], mix(pb, ib, t), o.intensity);
    }
  }
};

// ---------------------------------------------------------------------------
// Mark filters
// ---------------------------------------------------------------------------

type MarkFilter = (
  ctx: CanvasRenderingContext2D,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  o: TextureOptions,
) => void;

/**
 * Average one cell of the source. Sampling the centre pixel instead is faster
 * and looks it — a single pixel of a noisy frame decides the whole cell, so the
 * marks flicker between neighbouring frames.
 */
const cellLuma = (
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  n: number,
) => {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < Math.min(y0 + n, h); y++) {
    for (let x = x0; x < Math.min(x0 + n, w); x++) {
      const i = (y * w + x) * 4;
      sum += luminance(data[i], data[i + 1], data[i + 2]);
      count++;
    }
  }
  return count ? sum / count / 255 : 0;
};

const makeGlyphFilter =
  (ramp: keyof typeof RAMPS): MarkFilter =>
  (ctx, data, w, h, o) => {
    const chars = RAMPS[ramp];
    const last = chars.length - 1;
    const cell = Math.max(2, Math.round(o.scale));

    ctx.fillStyle = o.paper;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = o.ink;
    // Monospace advance is ~0.6em, so the type has to be sized off the cell
    // width or the columns overlap.
    ctx.font = `${Math.round(cell / 0.6)}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';

    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        let t = cellLuma(data, w, h, x, y, cell) ** o.contrast;
        if (o.invert) t = 1 - t;
        const ch = chars[Math.min(last, Math.max(0, Math.round(t * last)))];
        if (ch !== ' ') ctx.fillText(ch, x, y);
      }
    }
  };

/** Halftone: one dot per cell, its radius carrying the tone. */
const halftone: MarkFilter = (ctx, data, w, h, o) => {
  const cell = Math.max(3, Math.round(o.scale));
  const r = cell / 2;

  ctx.fillStyle = o.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = o.ink;

  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      let t = cellLuma(data, w, h, x, y, cell) ** o.contrast;
      if (!o.invert) t = 1 - t;
      if (t <= 0.02) continue;
      ctx.beginPath();
      ctx.arc(x + r, y + r, r * Math.sqrt(t), 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

/** Mosaic: the cell's own average colour, kept in colour. */
const mosaic: MarkFilter = (ctx, data, w, h, o) => {
  const cell = Math.max(2, Math.round(o.scale));
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = y; yy < Math.min(y + cell, h); yy++) {
        for (let xx = x; xx < Math.min(x + cell, w); xx++) {
          const i = (yy * w + xx) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n++;
        }
      }
      if (!n) continue;
      ctx.fillStyle = `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
};

// ---------------------------------------------------------------------------

export const TEXTURES = {
  bitgrain: { kind: 'pixel', label: 'Bitgrain', run: bitgrain },
  duotone: { kind: 'pixel', label: 'Duotone', run: duotone },
  grain: { kind: 'pixel', label: 'Grain', run: grain },
  glyphfield: { kind: 'marks', label: 'Glyphfield', run: makeGlyphFilter('glyph') },
  typeblocks: { kind: 'marks', label: 'Typeblocks', run: makeGlyphFilter('block') },
  halftone: { kind: 'marks', label: 'Halftone', run: halftone },
  mosaic: { kind: 'marks', label: 'Mosaic', run: mosaic },
} as const;

export type TextureName = keyof typeof TEXTURES;
export const TEXTURE_NAMES = Object.keys(TEXTURES) as TextureName[];

/**
 * One frame, source to finished canvas.
 *
 * `source` is a `CanvasImageSource`, which is the whole reason this works over
 * video: `drawImage` takes an `HTMLVideoElement` exactly as it takes an image,
 * so nothing below this line knows or cares which it was handed.
 */
export const applyTexture = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  w: number,
  h: number,
  name: TextureName,
  options: TextureOptions,
) => {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  const image = ctx.getImageData(0, 0, w, h);
  const texture = TEXTURES[name];

  if (texture.kind === 'pixel') {
    texture.run(image.data, w, h, options);
    ctx.putImageData(image, 0, 0);
    return;
  }

  texture.run(ctx, image.data, w, h, options);
};
