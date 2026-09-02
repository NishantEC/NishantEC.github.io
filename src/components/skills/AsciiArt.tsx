import { type DialValue, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
 * The two playback rates offered, as labels so they can be a `Select`.
 *
 * Both divide 60Hz exactly — 15 is four refreshes per frame, 30 is two — so
 * neither judders. See `useFrameClock` for why that matters more than the
 * number itself: a rate that does not divide the display's is held for an
 * uneven number of refreshes and stutters by construction, whatever else is
 * correct.
 */
const SPEEDS = { '15 fps': 15, '30 fps': 30 } as const;
type Speed = keyof typeof SPEEDS;
const SPEED_NAMES = Object.keys(SPEEDS) as Speed[];
const SPEED_DEFAULT: Speed = '30 fps';

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

/** Only ever shown to `decode`, which wants a `File`; never displayed. */
const BUNDLED_NAME = 'butterfly.mp4';

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
  const panelId = 'ascii-bake';
  const panelTitle = 'ASCII';

  const dial = useDialKitController(
    panelTitle,
    {
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
        options: [...SPEED_NAMES],
        default: SPEED_DEFAULT,
      },
      playback: true as boolean,
      /* Live now that every clip is really baked. It decides how many cells a
         frame is cut into, which is a bake parameter — on the old pre-baked
         sheet it could not do anything, and was shown anyway. */
      density: { type: 'select' as const, options: [...DENSITY_NAMES], default: 'normal' },
    },
    // Explicit, because `DialPanel` addresses the panel by id and a derived one
    // would silently change if the display name ever did.
    { id: panelId },
  );

  const v = dial.values;
  const ramp = v.ramp as RampName;
  const speed = v.speed as Speed;
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
  const [mode, setMode] = useState<'working' | 'ready'>('working');
  const [crop, setCrop] = useState<Crop | null>(null);
  const [sampled, setSampled] = useState<Sampled | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Whether the source video is drawn beside the characters. */
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
        runPipeline(new File([blob], BUNDLED_NAME, { type: blob.type || 'video/mp4' }));
      })
      .catch(() => setError('The bundled clip could not be loaded.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Playback, separate from loading so pausing doesn't re-decode the sheet and
  // resuming continues from the frame it stopped on.
  useFrameClock(SPEEDS[speed], ready && playing, () => {
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
      videoRef.current?.play().catch(() => {});
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
  const reset = () => {
    fetch(butterflyClip)
      .then((r) => r.blob())
      .then((blob) =>
        runPipeline(new File([blob], BUNDLED_NAME, { type: blob.type || 'video/mp4' })),
      )
      .catch(() => setError('The bundled clip could not be loaded.'));
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
   */
  const sourceNode =
    crop && sampled ? (
      <div className="relative overflow-hidden" style={{ width: `${artW}px`, height: `${artH}px` }}>
        {/*
          This element *is* the one the frame clock seeks. Rendering a second
          video and syncing the offscreen one left two clocks running: the
          divider then compared different instants, which is the one thing a
          compare slider must not do.
        */}
        <video
          ref={(el) => {
            if (el) videoRef.current = el;
          }}
          src={objectUrlRef.current ?? undefined}
          muted
          playsInline
          loop
          autoPlay
          className="absolute max-w-none"
          style={{
            width: `${(sampled.width / crop.w) * artW}px`,
            height: `${(sampled.height / crop.h) * artH}px`,
            left: `${-(crop.x / crop.w) * artW}px`,
            top: `${-(crop.y / crop.h) * artH}px`,
          }}
        />
      </div>
    ) : null;

  const artNode = (
    <pre
      role="img"
      aria-label="Animated ASCII rendering of the clip, drawn from the selected character ramp"
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
  if (mode === 'working') {
    const working = mode === 'working';
    return (
      <div className="my-6 flex w-full flex-col gap-3">
        <div className="rounded-2xl border border-border bg-fg/2 p-1.5">
          <div
            className={`flex flex-col items-center gap-3 rounded-[10px] border border-border/60 px-6 py-9 text-center ${
              working ? 'shimmer' : ''
            }`}
          >
            {working ? (
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
            ) : (
              <>
                <p className="max-w-[38ch] text-muted text-xs leading-relaxed">
                  Choose a video and it is rendered here, in this tab. Nothing is uploaded anywhere.
                </p>
                {error && <p className="max-w-[38ch] text-accent text-xs">{error}</p>}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-lg bg-fg px-3.5 py-2 text-bg text-xs outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  Choose a video
                </button>
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
              style={{ background: bg, aspectRatio: sizedToClip ? (clipAspect as number) : 1 }}
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
                onClear={reset}
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
            <DialPanel
              layout={railBelow ? 'grid' : 'rail'}
              id={panelId}
              title={panelTitle}
              values={v as Record<string, DialValue>}
              theme={resolvedTheme}
            />
          </div>
        </div>
      </div>

      {/* Outside the ring: the ring frames the output, not the controls for
          getting one. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* By here there is always a clip, so the size always belongs to
            something. The empty and working states return their own band above
            and never reach this row. */}
        <p className="ml-auto px-0.5 text-muted text-xs">
          {`${grid.cols}×${grid.rows} · ${(FRAME_COUNT / SPEEDS[speed]).toFixed(1)}s loop`}
        </p>

        {fileInput}
      </div>
    </div>
  );
};

export default AsciiArt;
