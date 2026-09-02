import { DialRoot, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  JELLY_ATLAS,
  JELLY_SPEED_DEFAULT,
  JELLY_SPEED_NAMES,
  JELLY_SPEEDS,
  type JellySpeed,
} from '../../data/jelly-atlas';
import { loadAtlas } from '../../utils/atlas';
import { useFrameClock } from '../../utils/useFrameClock';
import {
  type Baked,
  bake,
  type Crop,
  DEFAULT_SETTINGS,
  DENSITIES,
  DENSITY_NAMES,
  type DensityName,
  decode,
  FRAME_COUNT,
  findSubject,
  type Progress,
  type Sampled,
  sample,
} from '../../utils/videoToAscii';
import CompareSlider from './CompareSlider';
import Pipeline from './Pipeline';

/**
 * A short clip played back as ASCII, with the mapping exposed as controls.
 *
 * The frames are pre-baked: a sprite sheet of luminance tiles, decoded once at
 * load into plain arrays of densities. Everything after that — which characters
 * the densities land on, how hard the curve is, what colour they come out —
 * happens per frame in the browser, which is why the sliders move the picture
 * rather than reloading it.
 *
 * An earlier version took uploads, a URL and the camera, and sampled them
 * through a canvas. That is in `archive/ascii-sources/` with notes on bringing
 * it back; the controls are the point of this one.
 */

const RAMPS = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  minimal: ' .:*#',
  line: ' .,:;i1tfLCG08@',
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
 * the ramp starts and `ink2` where it ends, so a preset carries a gradient as
 * well as a flat colour.
 */
const PALETTES = {
  mono: { ink: '#f1f1f0', ink2: '#8a8a88', bg: '#0d0d0f' },
  paper: { ink: '#15151a', ink2: '#6b6b78', bg: '#f4f4f3' },
  phosphor: { ink: '#5eead4', ink2: '#0f766e', bg: '#04100d' },
  amber: { ink: '#fbbf24', ink2: '#b45309', bg: '#140d02' },
  ultra: { ink: '#c4b5fd', ink2: '#7c3aed', bg: '#0f0b1a' },
  blueprint: { ink: '#93c5fd', ink2: '#1d4ed8', bg: '#050b16' },
} as const;

const BTN =
  'shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-muted text-xs outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60';

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

const RAMPS_LIST = Object.keys(RAMPS) as RampName[];
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
  const dial = useDialKitController('ASCII', {
    ramp: { type: 'select' as const, options: [...RAMPS_LIST], default: 'standard' },
    palette: { type: 'select' as const, options: [...PALETTE_LIST], default: 'mono' },
    ink: { type: 'color' as const, default: PALETTES.mono.ink },
    ink2: { type: 'color' as const, default: PALETTES.mono.ink2 },
    background: { type: 'color' as const, default: PALETTES.mono.bg },
    gradient: false as boolean,
    contrast: [0.85, 0.3, 2.5, 0.05] as [number, number, number, number],
    zoom: [1, 0.5, 2.5, 0.05] as [number, number, number, number],
    invert: false as boolean,
    speed: {
      type: 'select' as const,
      options: [...JELLY_SPEED_NAMES],
      default: JELLY_SPEED_DEFAULT,
    },
    playback: true as boolean,
    density: { type: 'select' as const, options: [...DENSITY_NAMES], default: 'normal' },
  });

  const v = dial.values;
  const ramp = v.ramp as RampName;
  const speed = v.speed as JellySpeed;
  const { contrast, zoom, invert, gradient, ink, ink2 } = v;
  const bg = v.background;
  const playing = v.playback;
  const density = v.density as DensityName;

  // biome-ignore lint/correctness/useExhaustiveDependencies: applies the preference once; adding `dial` would re-fire it and override the reader turning playback back on.
  useEffect(() => {
    if (reduceMotion) dial.setValues({ playback: false });
  }, [reduceMotion]);

  // A preset is a starting point: it writes its colours in, and editing one
  // afterwards is what makes the palette read `custom`.
  const lastPalette = useRef(v.palette);
  useEffect(() => {
    if (v.palette === lastPalette.current) return;
    lastPalette.current = v.palette;
    const preset = PALETTES[v.palette as keyof typeof PALETTES];
    if (preset) dial.setValues({ ink: preset.ink, ink2: preset.ink2, background: preset.bg });
  }, [v.palette, dial]);

  const [art, setArt] = useState('');
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

  /** `atlas` until someone uploads; then their clip, through the stages. */
  const [mode, setMode] = useState<'atlas' | 'working' | 'approve' | 'custom'>('atlas');
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [sampled, setSampled] = useState<Sampled | null>(null);
  const [baked, setBaked] = useState<Baked | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Accumulated so the strip and the grid persist past the tick that made them. */
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [gridRows, setGridRows] = useState<string[]>([]);
  const [hits, setHits] = useState<{ col?: Float32Array; row?: Float32Array }>({});
  const [compare, setCompare] = useState(true);

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

  const draw = useCallback(() => {
    const atlas = clipRef.current;
    if (!atlas) return;

    const frame = atlas.grids[frameRef.current % atlas.grids.length];
    const chars = RAMPS[ramp];
    const last = chars.length - 1;

    const lines: string[] = [];
    for (let y = 0; y < atlas.rows; y++) {
      let line = '';
      for (let x = 0; x < atlas.cols; x++) {
        let t = frame[y * atlas.cols + x];
        if (invert) t = 1 - t;
        line += chars[Math.min(last, Math.max(0, Math.round(t ** contrast * last)))];
      }
      lines.push(line);
    }
    setArt(lines.join('\n'));
  }, [ramp, contrast, invert]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only — `draw` changes with every control, and reloading the sheet on each one would be absurd. Playback lives in its own effect below.
  useEffect(() => {
    let cancelled = false;

    loadAtlas(JELLY_ATLAS).then((atlas) => {
      if (!atlas.frames) return;
      if (cancelled) return;
      clipRef.current = { grids: atlas.frames, cols: atlas.cols, rows: atlas.rows };
      // The atlas is cropped to its subject, so it is narrower than COLS and the
      // fit has to work from what it actually reports.
      setGrid({ cols: atlas.cols, rows: atlas.rows });
      setReady(true);
      draw();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Playback, separate from loading so pausing doesn't re-decode the sheet and
  // resuming continues from the frame it stopped on.
  useFrameClock(JELLY_SPEEDS[speed], ready && playing, () => {
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

  const runPipeline = async (file: File) => {
    release();
    const signal = { cancelled: false };
    cancelRef.current = signal;

    setError(null);
    setBaked(null);
    setCrop(null);
    setPreviewFrame(null);
    setMode('working');
    setStage(0);
    setProgress(null);
    setThumbs([]);
    setGridRows([]);
    setHits({});

    // `onProgress` fires per frame; the drawable state has to outlive the tick
    // that produced it, so it is lifted out of the transient progress object.
    const onProgress = (next: Progress) => {
      setProgress(next);
      if (next.thumb) setThumbs((prev) => [...prev, next.thumb as string]);
      if (next.gridRows) setGridRows(next.gridRows);
      // Held past the stage that produced them: the histograms *are* the crop
      // search, so they should stay legible once it has finished, not blink out.
      if (next.colHits) setHits({ col: next.colHits, row: next.rowHits });
    };

    try {
      const { video, url } = await decode(file);
      if (signal.cancelled) return;
      objectUrlRef.current = url;
      videoRef.current = video;

      setStage(1);
      const shot = await sample(video, onProgress, signal);
      if (signal.cancelled || shot.frames.length === 0) return;
      setSampled(shot);

      // A real frame to draw the crop box over, so the search is legible.
      const preview = document.createElement('canvas');
      preview.width = shot.width;
      preview.height = shot.height;
      preview.getContext('2d')?.putImageData(shot.frames[Math.floor(shot.frames.length / 2)], 0, 0);
      setPreviewFrame(preview.toDataURL('image/png'));

      setStage(2);
      // Yield so the crop frame paints before the search blocks the thread.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const box = findSubject(shot, DEFAULT_SETTINGS, onProgress);
      if (signal.cancelled) return;
      setCrop(box);

      setStage(3);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const result = bake(shot, box, DEFAULT_SETTINGS, onProgress);
      if (signal.cancelled) return;

      setBaked(result);
      setStage(4);
      setMode('approve');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be processed.');
      setMode('working');
    }
  };

  /** Commits the baked clip to the renderer. Nothing downstream changes. */
  const approve = () => {
    if (!baked) return;
    clipRef.current = { grids: baked.grids, cols: baked.cols, rows: baked.rows };
    frameRef.current = 0;
    setGrid({ cols: baked.cols, rows: baked.rows });
    // The sampled frames are kept rather than freed: changing density re-bakes
    // from them, and re-seeking the clip to get them back would cost seconds.
    // ~22MB for 96 frames at the sampling resolution, which is the price of
    // making density a live control instead of a re-upload.
    setMode('custom');
    videoRef.current?.play().catch(() => {});
    draw();
  };

  /**
   * Re-bakes at a new density. Only for uploads — the jellyfish is a baked
   * sheet whose grid was fixed when it was made, so there is nothing finer to
   * resolve to.
   */
  useEffect(() => {
    if (mode !== 'custom' || !sampled || !crop) return;
    const result = bake(sampled, crop, { ...DEFAULT_SETTINGS, cols: DENSITIES[density] }, () => {});
    clipRef.current = { grids: result.grids, cols: result.cols, rows: result.rows };
    frameRef.current = 0;
    setGrid({ cols: result.cols, rows: result.rows });
    draw();
  }, [density, mode, sampled, crop, draw]);

  const backToJellyfish = () => {
    release();
    setBaked(null);
    setSampled(null);
    setMode('atlas');
    loadAtlas(JELLY_ATLAS).then((atlas) => {
      if (!atlas.frames) return;
      clipRef.current = { grids: atlas.frames, cols: atlas.cols, rows: atlas.rows };
      frameRef.current = 0;
      setGrid({ cols: atlas.cols, rows: atlas.rows });
      draw();
    });
  };

  const artNode = (
    <pre
      role="img"
      aria-label={
        mode === 'custom'
          ? 'Animated ASCII rendering of the uploaded clip'
          : 'Animated ASCII rendering of a jellyfish, drawn from the selected character ramp'
      }
      className="font-mono leading-[1.02] tracking-normal"
      style={
        gradient
          ? {
              fontSize: `${fontPx * zoom}px`,
              // Painted through the glyphs rather than mapped per character:
              // colouring by ramp position would need a span per cell, which is
              // thousands of elements rebuilt many times a second.
              backgroundImage: `linear-gradient(160deg, ${ink}, ${ink2})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }
          : { fontSize: `${fontPx * zoom}px`, color: ink }
      }
    >
      {art}
    </pre>
  );

  return (
    // No width of its own: the parent in `PanelContent` is already `max-w-2xl`,
    // and matching the prose means filling that rather than picking a number
    // beside it. A second cap here is how the card ended up narrower than the
    // paragraphs under it.
    <div className="flex w-full flex-col gap-3">
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
        <div className="flex flex-col rounded-[10px] border border-border/60 sm:flex-row">
          <div
            ref={stageRef}
            className={`grid w-full min-w-0 place-items-center overflow-hidden rounded-t-[10px] sm:flex-1 sm:rounded-tr-none sm:rounded-l-[10px] ${
              mode === 'working' || mode === 'approve' ? 'items-start' : 'aspect-square'
            }`}
            style={{ background: bg }}
          >
            {mode === 'working' || mode === 'approve' ? (
              <div className="h-full w-full overflow-y-auto p-3">
                <Pipeline
                  current={stage}
                  progress={progress}
                  frame={previewFrame}
                  crop={crop}
                  width={sampled?.width ?? 1}
                  height={sampled?.height ?? 1}
                  error={error}
                  thumbs={thumbs}
                  gridRows={gridRows}
                  hits={hits}
                />
              </div>
            ) : mode === 'custom' && compare ? (
              <CompareSlider
                labelLeft="source"
                labelRight="ascii"
                left={
                  /*
                  This element *is* the one the frame clock seeks. Rendering a
                  second video and syncing the offscreen one left two clocks
                  running: the divider then compared different instants, which
                  is the one thing a compare slider must not do.
                */
                  <video
                    ref={(el) => {
                      if (el) videoRef.current = el;
                    }}
                    src={objectUrlRef.current ?? undefined}
                    muted
                    playsInline
                    loop
                    autoPlay
                    className="max-h-full max-w-full object-contain"
                  />
                }
                right={
                  <div className="grid h-full w-full place-items-center" style={{ background: bg }}>
                    {artNode}
                  </div>
                }
              />
            ) : (
              artNode
            )}
          </div>

          {/* Beside the art, not floating over the page. DialKit's popover is
              its default, but a panel that hovers over the whole viewport reads
              as a dev tool; inline in the card it reads as part of the piece.
              `productionEnabled` because these controls ship. */}
          <div className="min-w-0 rounded-b-[10px] border-border/60 sm:w-[240px] sm:shrink-0 sm:rounded-r-[10px] sm:rounded-bl-none sm:border-l">
            <DialRoot mode="inline" theme={resolvedTheme} productionEnabled defaultOpen />
          </div>
        </div>
      </div>

      {/* Outside the ring: the ring frames the output, not the controls for
          getting one. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => fileRef.current?.click()} className={BTN}>
          upload a video
        </button>

        {mode !== 'atlas' && (
          <button type="button" onClick={backToJellyfish} className={BTN}>
            jellyfish
          </button>
        )}

        {mode === 'approve' && (
          <button
            type="button"
            onClick={approve}
            className="rounded-lg bg-fg px-3 py-1.5 text-bg text-xs outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            Approve {baked?.cols}×{baked?.rows}
          </button>
        )}

        {mode === 'custom' && (
          <button
            type="button"
            onClick={() => setCompare((c) => !c)}
            aria-pressed={compare}
            className={BTN}
          >
            {compare ? 'hide source' : 'compare with source'}
          </button>
        )}

        <p className="ml-auto px-0.5 text-muted text-xs">
          {grid.cols}×{grid.rows} ·{' '}
          {mode === 'custom'
            ? `${(FRAME_COUNT / JELLY_SPEEDS[speed]).toFixed(1)}s loop`
            : `${(JELLY_ATLAS.count / JELLY_SPEEDS[speed]).toFixed(1)}s loop`}
        </p>

        {/* Nothing is uploaded anywhere: the file becomes an object URL and is
            decoded by the tab that opened it. */}
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
      </div>
    </div>
  );
};

export default AsciiArt;
