import { useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import butterflyClip from '../../assets/skills/butterfly.mp4';
import { useFrameClock } from '../../utils/useFrameClock';
import {
  bake,
  type Crop,
  DEFAULT_SETTINGS,
  DENSITIES,
  DENSITY_NAMES,
  type DensityName,
  decode,
  FRAME_COUNT,
  findSubject,
  type Sampled,
  sample,
} from '../../utils/videoToAscii';
import ClipActions from './ClipActions';
import CompareSlider from './CompareSlider';
import CookingGlyph from './CookingGlyph';
import CopyPreset from './CopyPreset';
import DialPanel from './DialPanel';

/**
 * A clip played back as ASCII, with the mapping exposed as controls.
 *
 * It opens on a bundled clip and runs the skill's own pipeline over it — sample
 * by seeking, find the subject by occupancy, bake — then plays the result. Any
 * file the reader picks goes through exactly the same path, which is the point:
 * there is no privileged demo that was prepared differently from what you get.
 *
 * That is a change. This used to be two panels: a demo playing a pre-baked
 * sprite sheet, and a playground for your own file. The sheet was smaller to
 * ship but it could not be compared against its source — the source was not
 * there — and it could not honour `density`, because the grid was cut before it
 * reached the page. So the demo had controls the playground had and the
 * playground had controls the demo could not, over the same picture. One panel
 * that really bakes has neither problem, and the clip costs less than the sheet
 * did: 145KB of H.264 against 143KB of PNG.
 */

/**
 * Playback rates, as a slider that lands only on values dividing 60Hz.
 *
 * A frame is held for a whole number of display refreshes, so a rate that does
 * not divide the display's is held for an uneven number and judders by
 * construction — 8fps is 7.5 refreshes and measured 70ms of jitter, which is
 * what `useFrameClock` exists to avoid. A free slider would offer those rates
 * and then look wrong for reasons the reader cannot see, so the value snaps to
 * the nearest one that works. Dragging feels continuous; where it settles is
 * always honest.
 */
const SPEEDS = [6, 10, 12, 15, 20, 30, 60];
const SPEED_DEFAULT = 30;
const snapSpeed = (fps: number) =>
  SPEEDS.reduce((best, n) => (Math.abs(n - fps) < Math.abs(best - fps) ? n : best), SPEEDS[0]);

const RAMPS = {
  standard: ' .:-=+*#%@',
  /** Paul Bourke's 70-level ramp — the most tonal resolution ASCII can carry. */
  dense: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  line: ' .,:;i1tfLCG08@',
  minimal: ' .:*#',
  blocks: ' ░▒▓█',
  shades: ' ·░▒▓█',
  /** Directional rather than even — the subject picks up a grain. */
  quadrant: ' ▖▄▟█',
  stipple: ' .·•●',
  /** Two levels and a space. Everything becomes a threshold. */
  binary: ' 01',
} as const;

type RampName = keyof typeof RAMPS;

/**
 * Fallback only. The real advance width is measured from the rendered font at
 * mount — "monospace is 0.6em wide" is a rule of thumb, and this stack actually
 * measures 0.75, which overflowed the container until it was measured properly.
 */
const FALLBACK_RATIO = 0.6;

/** Grid height used for the fit calculation before the atlas reports its own. */
const ROWS_HINT = 50;

const COLS = 84;

/**
 * Starting points, not the whole choice — every colour here is also editable
 * directly, and touching one switches the palette to `custom`. `ink` is where
 * the ramp starts and `ink2` where it ends — literally: the faintest characters
 * are drawn in one and the densest in the other, with `BANDS` steps between.
 * Setting the two the same is how you get a flat colour.
 *
 * Which way round matters, and these were the wrong way round at first. `ink`
 * is the sparse speckle — a stray `.` or `:` — and `ink2` is the subject's own
 * mass. Giving the speckle the high-contrast colour made weight and colour
 * cancel: blueprint's densest band measured 2.94:1 while its faintest sat at
 * 14.5:1, so the loudest thing on screen was noise. Reversed, they compound.
 */
const PALETTES = {
  /**
   * Resolved from the page rather than written down — see `themePalette`. It is
   * the default, so the piece arrives wearing the site's own colours and turns
   * with the light/dark toggle instead of sitting in its own permanent night.
   */
  theme: null,
  mono: { ink: '#8a8a88', ink2: '#f1f1f0', bg: '#0d0d0f' },
  paper: { ink: '#6b6b78', ink2: '#15151a', bg: '#f4f4f3' },
  phosphor: { ink: '#0f766e', ink2: '#5eead4', bg: '#04100d' },
  amber: { ink: '#b45309', ink2: '#fbbf24', bg: '#140d02' },
  ultra: { ink: '#7c3aed', ink2: '#c4b5fd', bg: '#0f0b1a' },
  blueprint: { ink: '#1d4ed8', ink2: '#93c5fd', bg: '#050b16' },
} as const;

/**
 * Any CSS colour to `#rrggbb`, by painting one pixel and reading it back.
 *
 * The theme's variables are `oklch()` and `hsl()`; the colour control stores and
 * compares hex. Handing it either meant the value written never equalled the
 * value read, so the palette effect wrote it again on every render. A canvas is
 * the only converter that already knows every colour space the browser does.
 */
const toHex = (css: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return css;
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((n) => (n ?? 0).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * The site's own colours, read off the document.
 *
 * Computed rather than written down twice: these are the same custom properties
 * the rest of the page is painted with, so the palette cannot drift from the
 * theme it is named after.
 */
const themePalette = () => {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const raw = style.getPropertyValue(name).trim();
    return raw ? toHex(raw) : fallback;
  };
  return {
    ink: read('--muted', '#8a8a88'),
    ink2: read('--fg', '#f1f1f0'),
    bg: read('--bg', '#0d0d0f'),
  };
};

/**
 * The theme DialKit should wear, resolved rather than preferred.
 *
 * `useTheme` hands back `'light' | 'dark' | 'system'`, and DialKit's `system`
 * follows the OS rather than this site's toggle — so picking Light here while
 * the OS is dark would leave the panel dark inside a light card. The `dark`
 * class the provider toggles on `<html>` is the resolved answer, so that is
 * what gets watched.
 */
const useResolvedTheme = () =>
  useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    },
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'dark' as const,
  );

/**
 * The pipeline reports per frame and nothing listens any more — the wait is a
 * glyph, not a measurement. Worth stating rather than passing an inline arrow:
 * this used to be `setProgress`, which meant ~96 renders during sampling to
 * update a bar, and dropping it took the re-render with it. The callback stays
 * because it is the skill's own reporting surface, not the site's to remove.
 */
const NO_PROGRESS = () => {};

/**
 * How many colour steps the ramp is painted in.
 *
 * One layer is rendered per band, so this is a real cost — but only in the pass
 * that already visits every cell, and 10 is enough that the steps are not
 * visible as banding. Ramps shorter than this use one band per character, which
 * is the truest version: the character and its colour change together.
 */
const BANDS = 10;

/** sRGB mix of two `#rrggbb` colours. Hex in, hex out — the ramp layers are
    plain `color` values, so nothing here needs a colour space wider than the
    one the swatches already store. */
const mixHex = (a: string, b: string, t: number) => {
  const parse = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const chan = (x = 0, y = 0) => Math.round(x + (y - x) * t);
  return `#${[chan(ar, br), chan(ag, bg), chan(ab, bb)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
};

/** Only ever shown to `decode`, which wants a `File`; never displayed. */
const BUNDLED_NAME = 'butterfly.mp4';

const RAMPS_LIST = Object.keys(RAMPS) as RampName[];

/**
 * A ramp shown as itself.
 *
 * "Standard" and "Line" say nothing about what you are about to get; the
 * characters do, and they also make the *number* of steps visible — `binary`
 * has three, `dense` has seventy. Long ramps are sampled evenly rather than
 * truncated, so a 70-step ramp still reads as a smooth run from empty to solid
 * instead of as its first fourteen punctuation marks.
 */
const LABEL_STEPS = 14;
const rampLabel = (chars: string) => {
  if (chars.length <= LABEL_STEPS) return chars;
  return Array.from(
    { length: LABEL_STEPS },
    (_, i) => chars[Math.round((i * (chars.length - 1)) / (LABEL_STEPS - 1))],
  ).join('');
};

const RAMP_OPTIONS = RAMPS_LIST.map((name) => ({ value: name, label: rampLabel(RAMPS[name]) }));

/**
 * A density shown as its column count.
 *
 * `coarse` and `finest` are a scale with no units — you cannot tell what you
 * are asking for or what it costs. The number is the thing being chosen, and it
 * is also a bake parameter, so seeing it change quietly explains why this one
 * control takes a moment when the others are instant.
 */
const DENSITY_OPTIONS = DENSITY_NAMES.map((name) => ({
  value: name,
  label: `${name} · ${DENSITIES[name]}`,
}));
const PALETTE_LIST = [...(Object.keys(PALETTES) as (keyof typeof PALETTES)[]), 'custom' as const];

const AsciiArt = () => {
  const reduceMotion = useReducedMotion();
  const resolvedTheme = useResolvedTheme();

  /**
   * Every control is DialKit's, declared once as a config object rather than as
   * a state hook plus a row of markup each. `useDialKitController` is the
   * variant that also hands back a setter, which the palette presets need —
   * choosing one has to push its colours into the panel's own values, and
   * `useDialKit` alone is read-only.
   *
   * Playback starts stopped under `prefers-reduced-motion`. The config's
   * defaults are static, so the preference is applied through `setValues` on
   * mount instead. Motion has to be opt-in there, and auto-playing content
   * needs a visible stop whatever the preference is — which is what the
   * `animation` toggle is for.
   */
  /**
   * Three panels, one subject each, rather than one panel of everything.
   *
   * DialKit does have folders — a nested config object becomes one — and they
   * are not usable here: nesting makes the store re-register the panel on every
   * render, which notifies, which re-renders, and React stops it at "maximum
   * update depth exceeded". Three flat panels get the same grouping through a
   * mechanism that works, and each one's `Folder` header names its subject.
   *
   * Configs and options are memoised for the same reason a nested one is not
   * safe: a fresh object each render is a fresh registration.
   */
  const characters = useDialKitController(
    'Characters',
    useMemo(
      () => ({
        ramp: { type: 'select' as const, options: [...RAMP_OPTIONS], default: 'standard' },
        density: { type: 'select' as const, options: [...DENSITY_OPTIONS], default: 'fine' },
        contrast: [0.85, 0.3, 2.5, 0.05] as [number, number, number, number],
        invert: false as boolean,
      }),
      [],
    ),
    useMemo(() => ({ id: 'ascii-characters' }), []),
  );

  const colour = useDialKitController(
    'Colour',
    useMemo(
      () => ({
        /* `paper`, not `theme`. The trade is deliberate: `theme` follows the
           site's light/dark toggle, and `paper` does not — but it is the look
           that was chosen, and a piece that reads as ink on paper says what the
           skill makes more clearly than one that dissolves into the page. */
        palette: { type: 'select' as const, options: [...PALETTE_LIST], default: 'paper' },
        /* `inkStart`/`inkEnd`, not `ink`/`ink2`. DialKit derives a control's
           label from its key by splitting on capitals, so `ink2` rendered as
           the non-word "Ink2" beside "Ink" — and `ColorConfig` has no `label`
           field to override it with. These are what the comment on `PALETTES`
           has always called them anyway. */
        inkStart: { type: 'color' as const, default: PALETTES.paper.ink },
        inkEnd: { type: 'color' as const, default: PALETTES.paper.ink2 },
        background: { type: 'color' as const, default: PALETTES.paper.bg },
      }),
      [],
    ),
    useMemo(() => ({ id: 'ascii-colour' }), []),
  );

  const motion = useDialKitController(
    'Playback',
    useMemo(
      () => ({
        /* A slider now rather than a two-option select. It snaps — see `SPEEDS`. */
        speed: [SPEED_DEFAULT, 6, 60, 1] as [number, number, number, number],
        playing: true as boolean,
        zoom: [1, 0.5, 2.5, 0.05] as [number, number, number, number],
      }),
      [],
    ),
    useMemo(() => ({ id: 'ascii-playback' }), []),
  );

  const ramp = characters.values.ramp as RampName;
  const density = characters.values.density as DensityName;
  const { contrast, invert } = characters.values;
  const { inkStart: ink, inkEnd: ink2 } = colour.values;
  const bg = colour.values.background;
  const palette = colour.values.palette;
  const { zoom, playing } = motion.values;
  const speed = snapSpeed(motion.values.speed);

  /**
   * The slider moves in steps of 1 and only some of those play smoothly, so the
   * value is written back to whichever of them is nearest.
   */
  useEffect(() => {
    if (motion.values.speed === speed) return;
    motion.setValues({ speed });
  }, [motion, speed]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: applies the preference once; adding `dial` would re-fire it and override the reader turning playback back on.
  useEffect(() => {
    if (reduceMotion) motion.setValues({ playing: false });
  }, [reduceMotion]);

  /**
   * A named palette writes its colours in; editing one by hand switches the
   * palette to `custom`.
   *
   * Both halves live here because they are the same comparison read two ways.
   * The colours not matching the palette means one of two things — the palette
   * just changed and the colours have not caught up, or the colours were
   * edited and the palette has not. `appliedKey` is what tells them apart: it
   * records the palette this effect last wrote out.
   *
   * Without that distinction only the first case was handled, so editing a
   * swatch was undone in the same render — the OS picker opened, you chose a
   * colour, and the palette wrote its own straight back over it. The comment
   * here claimed the `custom` behaviour for weeks; nothing implemented it.
   *
   * The key carries `resolvedTheme` as well, because the `theme` palette reads
   * the page's own custom properties and has to be rewritten when the site's
   * light/dark toggle changes them — a new value for the same palette name.
   */
  const paletteKey = `${palette}:${resolvedTheme}`;
  const appliedKey = useRef<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `resolvedTheme` is not read directly — it is folded into `paletteKey`, which is the dependency. `themePalette()` reads document custom properties that change with the site's light/dark class, and nothing else here can observe that.
  useEffect(() => {
    if (palette === 'custom') {
      appliedKey.current = paletteKey;
      return;
    }

    const preset =
      palette === 'theme' ? themePalette() : PALETTES[palette as keyof typeof PALETTES];
    if (!preset) return;

    const matches = preset.ink === ink && preset.ink2 === ink2 && preset.bg === bg;

    // The palette changed. Its colours win.
    if (appliedKey.current !== paletteKey) {
      appliedKey.current = paletteKey;
      if (!matches) {
        colour.setValues({ inkStart: preset.ink, inkEnd: preset.ink2, background: preset.bg });
      }
      return;
    }

    // Same palette, different colours: someone edited a swatch. Their choice
    // wins, and the palette stops claiming to be one of the named ones.
    if (!matches) colour.setValues({ palette: 'custom' });
  }, [paletteKey, palette, colour, ink, ink2, bg]);

  const [art, setArt] = useState<string[]>([]);
  const [fontPx, setFontPx] = useState(7);
  const [cellRatio, setCellRatio] = useState(FALLBACK_RATIO);
  const [grid, setGrid] = useState({ cols: COLS, rows: ROWS_HINT });
  const [ready, setReady] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  /**
   * One shape for both sources. The jellyfish arrives as a decoded sprite
   * sheet and an upload as freshly baked grids, but past this point nothing
   * downstream knows or cares which — the renderer only ever sees densities.
   */
  const clipRef = useRef<{ grids: Float32Array[]; cols: number; rows: number } | null>(null);
  const frameRef = useRef(0);

  /**
   * `working` while a clip is being baked, `ready` once it plays. It starts
   * working, because the bundled clip is baked on mount like any other.
   *
   * There is no empty state any more and no `approve` step. `empty` existed for
   * a panel that opened with nothing; this one always has a clip. Approve
   * existed while the panel drew the pipeline stage by stage and you were
   * confirming a crop you had watched being chosen — with the stages gone it
   * was a button asking you to accept something you had not been shown.
   */
  const [mode, setMode] = useState<'empty' | 'working' | 'ready'>('working');
  const [crop, setCrop] = useState<Crop | null>(null);
  const [sampled, setSampled] = useState<Sampled | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * True while the clip on screen is the one the page ships with.
   *
   * Only used to decide whether "use default" has anything to do — on the
   * bundled clip it would re-bake the same file and flash the cooking state for
   * a result identical to what is already there.
   */
  const [isBundled, setIsBundled] = useState(true);

  /**
   * Whether the source video is drawn beside the characters.
   *
   * On to begin with. The first question anyone asks about ASCII art is whether
   * it came from something or was drawn — and the answer is the whole claim of
   * the skill. Opening on the divider answers it before it is asked; the toggle
   * then takes the video away for anyone who wants to just watch the output.
   */
  const [showSource, setShowSource] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef({ cancelled: false });

  // Measure the font's real advance width rather than assuming 0.6em, so the
  // fit below is working from the width the characters actually occupy.
  useEffect(() => {
    const probe = document.createElement('span');
    probe.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;font-family:ui-monospace,monospace;font-size:100px';
    probe.textContent = '0'.repeat(100);
    document.body.appendChild(probe);
    const ratio = probe.getBoundingClientRect().width / 100 / 100;
    probe.remove();
    if (ratio > 0.1) setCellRatio(ratio);
  }, []);

  // Fit on whichever axis runs out first; zoom then scales on top of the fit.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setFontPx(Math.max(1, Math.min(width / grid.cols / cellRatio, height / grid.rows / 1.02)));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [cellRatio, grid]);

  /**
   * Builds one string per colour band instead of one string for everything.
   *
   * The comment on `PALETTES` has always said `ink` is where the ramp starts and
   * `ink2` where it ends. The renderer did not do that — it painted a
   * `linear-gradient(160deg)` across the block, a diagonal wash unrelated to the
   * characters — because colouring by ramp position "would need a span per cell,
   * which is thousands of elements rebuilt many times a second". That was the
   * right thing to avoid and the wrong conclusion to draw from it: it needs one
   * element per *band*, not per cell. Ten layers, each holding only the
   * characters at its own density and spaces everywhere else, stacked exactly on
   * top of one another.
   *
   * Cost is one extra write per cell in a loop that already visits every cell,
   * and ten row-joins instead of one. What it buys is colour that means
   * something: a character's colour and its weight now move together, so the
   * image has depth instead of a gradient laid over it at an angle.
   */
  const draw = useCallback(() => {
    const clip = clipRef.current;
    if (!clip) return;

    const frame = clip.grids[frameRef.current % clip.grids.length];
    const chars = RAMPS[ramp];
    const last = chars.length - 1;
    const bands = Math.min(chars.length, BANDS);

    const layers: string[][] = Array.from({ length: bands }, () => []);

    for (let y = 0; y < clip.rows; y++) {
      // Pre-filled with spaces so only the band that owns a cell writes to it.
      const row = Array.from({ length: bands }, () => new Array<string>(clip.cols).fill(' '));

      for (let x = 0; x < clip.cols; x++) {
        let t = frame[y * clip.cols + x];
        if (invert) t = 1 - t;
        const index = Math.min(last, Math.max(0, Math.round((t ?? 0) ** contrast * last)));
        const band = last === 0 ? 0 : Math.min(bands - 1, Math.round((index / last) * (bands - 1)));
        const target = row[band];
        if (target) target[x] = chars[index] ?? ' ';
      }

      for (let b = 0; b < bands; b++) layers[b]?.push(row[b]?.join('') ?? '');
    }

    setArt(layers.map((l) => l.join('\n')));
  }, [ramp, contrast, invert]);

  /**
   * The clip the page opens with, baked on mount through the same pipeline a
   * chosen file goes through. Fetched rather than imported as data because it
   * is a real video the compare slider plays back beside the characters — a
   * pre-baked sheet would be smaller but has no source to compare against.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only. `runPipeline` closes over state that changes constantly and re-running it would re-decode the clip on every keystroke.
  useEffect(() => {
    let cancelled = false;
    fetch(butterflyClip)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        runPipeline(new File([blob], BUNDLED_NAME, { type: blob.type || 'video/mp4' }), true);
      })
      .catch(() => setError('The bundled clip could not be loaded.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Playback, separate from loading so pausing doesn't re-decode the sheet and
  // resuming continues from the frame it stopped on.
  useFrameClock(speed, ready && playing, () => {
    const clip = clipRef.current;
    if (!clip) return;
    frameRef.current = (frameRef.current + 1) % clip.grids.length;
    draw();
    // Keep the source video in step with the ASCII, so the compare divider
    // shows the same instant on both sides rather than two drifting clocks.
    const video = videoRef.current;
    if (video?.duration) {
      const want = (frameRef.current / clip.grids.length) * video.duration * 0.98;
      if (Math.abs(video.currentTime - want) > 0.12) video.currentTime = want;
    }
  });

  // Redraw the current frame when a control changes, without touching playback.
  useEffect(() => {
    draw();
  }, [draw]);

  /**
   * Play/pause is one control over both clocks. The ASCII stops because
   * `useFrameClock` is gated on it; the video has to be told separately, and
   * without this the source kept running behind a frozen grid — which is
   * exactly the two-clock problem the compare slider exists to avoid.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.play().catch(() => {});
    else video.pause();
  }, [playing]);

  /** Frees the decoded video and its object URL. */
  const release = useCallback(() => {
    cancelRef.current.cancelled = true;
    videoRef.current?.pause();
    videoRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => release, [release]);

  /** `bundled` is passed rather than sniffed from the filename: a reader could
      upload something called butterfly.mp4 and it would not be the same file. */
  const runPipeline = async (file: File, bundled = false) => {
    setIsBundled(bundled);
    release();
    const signal = { cancelled: false };
    cancelRef.current = signal;

    setError(null);
    setCrop(null);
    setMode('working');

    try {
      const { video, url } = await decode(file);
      if (signal.cancelled) return;
      objectUrlRef.current = url;
      videoRef.current = video;

      const shot = await sample(video, NO_PROGRESS, signal);
      if (signal.cancelled || shot.frames.length === 0) return;
      setSampled(shot);

      // Yield between the blocking passes so the progress line can repaint;
      // both `findSubject` and `bake` hold the thread for their whole run.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const box = findSubject(shot, DEFAULT_SETTINGS, NO_PROGRESS);
      if (signal.cancelled) return;
      setCrop(box);

      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const result = bake(shot, box, DEFAULT_SETTINGS, NO_PROGRESS);
      if (signal.cancelled) return;

      // Straight onto the screen. There was an approve step here, which made
      // sense while the panel was showing its working — you were confirming a
      // crop you had watched being chosen. With the stages gone it was a button
      // asking you to accept something you had not been shown.
      clipRef.current = { grids: result.grids, cols: result.cols, rows: result.rows };
      frameRef.current = 0;
      setGrid({ cols: result.cols, rows: result.rows });
      // The sampled frames are kept rather than freed: changing density re-bakes
      // from them, and re-seeking the clip to get them back would cost seconds.
      // ~22MB for 96 frames at the sampling resolution, which is the price of
      // making density a live control instead of a re-upload.
      setMode('ready');
      // The frame clock is gated on `ready`, which the demo gets from the atlas
      // load. The playground never runs that, so this is what starts it.
      setReady(true);
      // Only if playback is actually on. Under `prefers-reduced-motion` the
      // mount effect has already set it off, and playing here anyway left the
      // source running behind a frozen grid with the toggle reading Off — a
      // pause control lying about what is on screen.
      if (playing) videoRef.current?.play().catch(() => {});
      draw();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be processed.');
      setMode('working');
    }
  };

  /**
   * Re-bakes at a new density. Only ever runs in the playground, because it is
   * the only place with the sampled frames to re-cut.
   *
   * `draw` is read through a ref rather than listed as a dependency. It is a
   * `useCallback` over ramp, contrast and invert, so depending on it re-ran
   * this effect on every tick of the contrast slider — re-baking all 96 frames
   * per pointer move to produce a grid identical to the one already on screen.
   * The redraw below is only so the new grid appears without waiting for the
   * next animation frame; it is not what the effect is keyed on.
   */
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    if (mode !== 'ready' || !sampled || !crop) return;
    const result = bake(sampled, crop, { ...DEFAULT_SETTINGS, cols: DENSITIES[density] }, () => {});
    clipRef.current = { grids: result.grids, cols: result.cols, rows: result.rows };
    frameRef.current = 0;
    setGrid({ cols: result.cols, rows: result.rows });
    drawRef.current();
  }, [density, mode, sampled, crop]);

  /** Drops the current clip. The demo goes back to the sheet; the playground
      goes back to waiting, because there is nothing else for it to show. */
  /**
   * Back to the clip the page ships with. Re-fetched rather than held onto:
   * the response is in the HTTP cache by now, and keeping the decoded `File`
   * alive for a button most readers never press is 145KB that never frees.
   */
  /** Loads the clip the page ships with. */
  const useDefault = () => {
    fetch(butterflyClip)
      .then((r) => r.blob())
      .then((blob) =>
        runPipeline(new File([blob], BUNDLED_NAME, { type: blob.type || 'video/mp4' }), true),
      )
      .catch(() => setError('The bundled clip could not be loaded.'));
  };

  /**
   * Throws the clip away — the bundled one as readily as your own.
   *
   * This used to reload the default, which meant clearing did not clear: on the
   * bundled clip it re-baked the same file to arrive where you already were, and
   * on your own it swapped one clip for another. Now the panel can genuinely be
   * empty, and the card that appears offers both ways back.
   */
  const clear = () => {
    release();
    setSampled(null);
    setCrop(null);
    setError(null);
    clipRef.current = null;
    frameRef.current = 0;
    setReady(false);
    setArt([]);
    setIsBundled(false);
    setMode('empty');
  };

  /**
   * The box the character grid actually occupies, in CSS pixels.
   *
   * `fontPx` is the fit at zoom 1 and the `<pre>` renders at `fontPx * zoom`,
   * so this is what both layers of the compare have to agree on. It is computed
   * here rather than measured because the source layer needs it before the
   * ASCII has laid out.
   */
  /**
   * Which way round the panel sits, taken from the clip rather than fixed.
   *
   * A 240px rail beside a 16:9 clip squeezes the video into a strip; the same
   * rail beside a portrait or square one is the better shape, because the
   * stage is tall and there is width going spare. So landscape puts the
   * controls underneath and lets the clip have the full column.
   *
   * Only in the playground. The demo's sheet never changes, and its layout was
   * chosen for it.
   */
  const clipAspect = crop && crop.w > 0 && crop.h > 0 ? crop.w / crop.h : null;
  const sizedToClip = mode === 'ready' && clipAspect !== null;
  const railBelow = sizedToClip && (clipAspect as number) > 1.2;

  const cellPx = fontPx * zoom;
  const artW = grid.cols * cellPx * cellRatio;
  const artH = grid.rows * cellPx * 1.02;

  /**
   * The grid's own aspect, which is not the clip's.
   *
   * A 16:9 crop sampled at 124 columns comes back 124x42, and 124 cells wide by
   * 42 tall is 1.742 rather than 1.778 — the row count is a whole number and
   * absorbs the difference. Giving the stage the clip's ratio made the grid fit
   * to whichever axis was tighter and leave a gap on the other: 13px down the
   * side, which `object-contain` then matched on the video, so the source sat
   * in a 6.5px pillarbox.
   *
   * `fontPx` cancels out of this, so it is safe to feed back into the box that
   * `fontPx` is measured from.
   */
  const gridAspect = (grid.cols * cellRatio) / (grid.rows * 1.02);

  /**
   * The source, framed to match the ASCII exactly.
   *
   * Two things were wrong with showing the raw `<video>` beside it. The bake
   * crops to the subject, so the ASCII is a crop of the clip while the video
   * was the whole frame — the divider compared a detail against a wide shot.
   * And `zoom` only ever scaled the `<pre>`, so moving it slid one side of the
   * comparison out from under the other.
   *
   * So the video is scaled until the crop region measures the same as the
   * character grid, then offset so that region sits at the origin, inside a
   * window of exactly the grid's size. Both layers are then the same rectangle
   * showing the same part of the same frame, and `zoom` moves them together.
   *
   * The window is rounded up rather than exact. `fontPx` is fitted from a
   * measured width, so the grid can land a tenth of a pixel inside the stage —
   * and a tenth of a pixel of paper behind a black clip is a visible hairline
   * once the display scales it up. Rounding up overruns into the stage's own
   * `overflow-hidden` instead, which costs less than a pixel of alignment.
   */
  const sourceNode =
    crop && sampled ? (
      <div
        className="relative overflow-hidden"
        style={{ width: `${Math.ceil(artW)}px`, height: `${Math.ceil(artH)}px` }}
      >
        {/*
          This element *is* the one the frame clock seeks. Rendering a second
          video and syncing the offscreen one left two clocks running: the
          divider then compared different instants, which is the one thing a
          compare slider must not do.
        */}
        <video
          ref={(el) => {
            if (!el) return;
            videoRef.current = el;
            // The `[playing]` effect below cannot start this: it runs before
            // the element exists. `autoPlay` used to cover that and could not
            // be told no.
            if (playing) el.play().catch(() => {});
            else el.pause();
          }}
          src={objectUrlRef.current ?? undefined}
          muted
          playsInline
          loop
          /*
            `object-fill`, not the default `contain`. The box below is computed
            to put the crop region exactly over the character grid, and the grid
            quantises rows to a whole number — 124x42 for a 16:9 crop is 1.743,
            not 1.778. `contain` answered that 2% by letterboxing inside its own
            box: 3.9px of stage showing through above and below a black clip.
            Filling makes the video take the same 2% the characters already did,
            which is what puts the two layers on the same geometry.
          */
          className="absolute max-w-none object-fill"
          style={{
            width: `${(sampled.width / crop.w) * artW}px`,
            height: `${(sampled.height / crop.h) * artH}px`,
            left: `${-(crop.x / crop.w) * artW}px`,
            top: `${-(crop.y / crop.h) * artH}px`,
          }}
        />
      </div>
    ) : null;

  /**
   * The layers, stacked exactly on top of one another.
   *
   * The first is in normal flow and sets the size; the rest are absolutely
   * positioned over it. They hold identical whitespace, so every character
   * lands in the same cell it would have in a single `<pre>` — the stack is
   * only a way to give each density its own `color`.
   *
   * One `role="img"` on the container with one label, and every layer hidden
   * from the accessibility tree: to a screen reader this is one picture, not
   * ten sheets of punctuation.
   */
  const artNode = (
    <div
      role="img"
      aria-label="Animated ASCII rendering of the clip, drawn from the selected character ramp"
      className="relative"
      style={{ fontSize: `${cellPx}px` }}
    >
      {art.map((layer, i) => (
        <pre
          // biome-ignore lint/suspicious/noArrayIndexKey: the band *is* the identity — layer i is always the i-th density
          key={i}
          aria-hidden="true"
          className={`font-mono leading-[1.02] tracking-normal ${i === 0 ? '' : 'absolute inset-0'}`}
          style={{ color: mixHex(ink, ink2, art.length < 2 ? 0 : i / (art.length - 1)) }}
        >
          {layer}
        </pre>
      ))}
    </div>
  );

  /* Nothing is uploaded anywhere: the file becomes an object URL and is decoded
     by the tab that opened it. Declared once and used by both returns below. */
  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="video/*"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) runPipeline(file);
        e.target.value = '';
      }}
      className="hidden"
    />
  );

  /**
   * Before there is a clip, the playground is a band rather than a panel.
   *
   * It used to be the full square with an empty stage and a control rail beside
   * it — a set of controls for a thing that does not exist, taking the height of
   * the finished piece to say so. There is exactly one thing to do here, so the
   * card is the size of that one thing.
   *
   * The bake keeps the same band. Growing to the full panel and showing the
   * rail the moment a file is picked put a dozen controls on screen that could
   * not do anything yet, around a square that was almost entirely empty. The
   * work is a progress bar; it should look like one.
   */
  if (mode === 'empty') {
    /* Two ways out, ranked. Choosing a file is the point of the panel; the
       bundled clip is there so clearing is not a one-way door. */
    return (
      <div className="my-6 flex w-full flex-col gap-3">
        <div className="rounded-2xl border border-border bg-fg/2 p-1.5">
          <div className="flex flex-col items-center gap-3 rounded-[10px] border border-border/60 px-6 py-9 text-center">
            <p className="max-w-[42ch] text-muted text-xs leading-relaxed">
              Choose a video and it is rendered here, in this tab. Nothing is uploaded anywhere.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-fg px-3.5 py-2 text-bg text-xs outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.96]"
              >
                Choose a video
              </button>
              <button
                type="button"
                onClick={useDefault}
                className="rounded-lg border border-border px-3.5 py-2 text-muted text-xs outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.96]"
              >
                Use the default clip
              </button>
            </div>
          </div>
        </div>
        {fileInput}
      </div>
    );
  }

  if (mode === 'working') {
    /**
     * What distinguishes the two cards is the error, not the mode.
     *
     * This read `mode === 'working'` — the condition we are already inside — so
     * it was always true and everything in the `else` was unreachable: the
     * message, the error line, and the only file input a stuck reader could
     * reach. A failed decode sets `error` and stays in `working`, so it showed
     * the pot turning forever with nothing said and no way out.
     */
    const failed = error !== null;
    return (
      <div className="my-6 flex w-full flex-col gap-3">
        <div className="rounded-2xl border border-border bg-fg/2 p-1.5">
          <div
            className={`flex flex-col items-center gap-3 rounded-[10px] border border-border/60 px-6 py-9 text-center ${
              failed ? '' : 'shimmer'
            }`}
          >
            {failed ? (
              /* `role="alert"` rather than the `aria-live="polite"` the working
                 state uses: this interrupts, because the reader is waiting on
                 something that is not coming. */
              <>
                <p role="alert" className="max-w-[38ch] text-fg text-xs leading-relaxed">
                  {error}
                </p>
                <p className="max-w-[38ch] text-muted text-xs leading-relaxed">
                  Most formats a browser can play will work.
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg bg-fg px-3.5 py-2 text-bg text-xs outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.96]"
                >
                  Choose a video
                </button>
              </>
            ) : (
              /* No counter and no bar. The counter read "frame 84 of 96" for
                 every clip, because 96 is a fixed sample count and not a
                 property of the file. The bar was honest but jumped in four
                 steps — decode, sample, find the subject, bake — so it looked
                 stuck for most of its life. Neither was telling the truth
                 usefully; this just says the tab is busy. `aria-live` so the
                 wait is announced and not only drawn. */
              <>
                <CookingGlyph />
                <p aria-live="polite" className="font-mono text-muted text-xs">
                  cooking
                </p>
              </>
            )}
          </div>
        </div>
        {fileInput}
      </div>
    );
  }

  return (
    // No width of its own: the parent in `PanelContent` is already `max-w-2xl`,
    // and matching the prose means filling that rather than picking a number
    // beside it. A second cap here is how the card ended up narrower than the
    // paragraphs under it.
    // `mb-6` rather than nothing: every other block in `MdxBody`'s element map
    // owns its own bottom margin, and without one the panel had 0px under it —
    // making a 500px interactive card the *tightest* join on the page, with the
    // grid readout jammed against the next sentence. 24px also puts it a step
    // above a paragraph's own 16px, so the gap says "different kind of thing".
    <div className="my-6 flex w-full flex-col gap-3">
      {/* One ring, and the art is all that is inside it now. The radii stay
          concentric — the inner 10px plus the 6px of padding equals the outer
          16px — so the two curves remain parallel. The controls moved to
          DialKit's popover and the actions sit below, which is why this is a
          single column rather than the art plus a panel beside it. */}
      <div className="rounded-2xl border border-border bg-fg/2 p-1.5">
        {/* One bordered box around both, rather than two boxes with a gap.
            Deliberately *not* `overflow-hidden`: clipping the parent was the
            tidy way to round DialKit's square edges, but its select menus
            render inside the panel rather than portalling out, so the clip ate
            the dropdown. Each side rounds its own corners instead. */}
        <div
          className={`flex rounded-[10px] border border-border/60 ${
            railBelow ? 'flex-col' : 'flex-col sm:flex-row'
          }`}
        >
          {/* The stage and the strip that belongs to it, as one column. This
              is what keeps the actions under the clip in both layouts — the
              control panel takes the remaining space, to the right or below,
              and never comes between them. */}
          <div className={`flex min-w-0 flex-col ${railBelow ? '' : 'sm:flex-1'}`}>
            <div
              ref={stageRef}
              // Flush, with no inset. The stage takes the clip's own aspect, so
              // there is nothing to letterbox and padding would only shrink the
              // picture inside a box already cut to fit it.
              className={`grid w-full min-w-0 place-items-center overflow-hidden rounded-t-[10px] ${
                railBelow ? '' : 'sm:rounded-tr-none'
              }`}
              // Square until there is a clip, then the clip's own shape — so a
              // 16:9 video is not letterboxed into a square while the character
              // grid beside it is not.
              style={{ background: bg, aspectRatio: sizedToClip ? gridAspect : 1 }}
            >
              {showSource ? (
                <CompareSlider
                  labelLeft="source"
                  labelRight="ascii"
                  left={sourceNode}
                  right={
                    <div
                      className="grid h-full w-full place-items-center"
                      style={{ background: bg }}
                    >
                      {artNode}
                    </div>
                  }
                />
              ) : (
                artNode
              )}
            </div>

            {mode === 'ready' && (
              <ClipActions
                theme={resolvedTheme}
                roundBottomLeft={!railBelow}
                showSource={showSource}
                onShowSource={setShowSource}
                onChoose={() => fileRef.current?.click()}
                onClear={clear}
              />
            )}
          </div>

          {/* Beside the art, not floating over the page. DialKit's popover is
              its default, but a panel that hovers over the whole viewport reads
              as a dev tool; inline in the card it reads as part of the piece.
              `productionEnabled` because these controls ship. */}
          <div
            className={`min-w-0 rounded-b-[10px] border-border/60 ${
              railBelow
                ? 'w-full border-t'
                : 'sm:w-[240px] sm:shrink-0 sm:rounded-r-[10px] sm:rounded-bl-none sm:border-l'
            }`}
          >
            {/* One panel per subject, each a single column of rows. Side by
                side when they sit under the clip, stacked when they sit beside
                it — see the controllers above for why folders inside one panel
                are not an option. */}
            <div className="dial-panels" data-columns={railBelow}>
              <DialPanel id="ascii-characters" title="Characters" theme={resolvedTheme} mono />
              <DialPanel id="ascii-colour" title="Colour" theme={resolvedTheme} />
              {/* The preset button fills the slot Playback leaves empty — it
                  has three controls where the others have four — and it is the
                  right column for it: the last thing you do here is take the
                  settings away with you. */}
              <DialPanel
                id="ascii-playback"
                title="Playback"
                theme={resolvedTheme}
                footer={
                  <CopyPreset
                    preset={{
                      ramp,
                      columns: DENSITIES[density],
                      contrast,
                      invert,
                      ink: [ink, ink2],
                      background: bg,
                      fps: speed,
                    }}
                  />
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Outside the ring: the ring frames the output, not the controls for
          getting one. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* By here there is always a clip, so the size always belongs to
            something. The empty and working states return their own band above
            and never reach this row. */}
        <p className="ml-auto px-0.5 text-muted text-xs tabular-nums">
          {`${grid.cols}×${grid.rows} · ${(FRAME_COUNT / speed).toFixed(1)}s loop`}
        </p>

        {fileInput}
      </div>
    </div>
  );
};

export default AsciiArt;
