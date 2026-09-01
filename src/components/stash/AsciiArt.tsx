import { DialRoot, useDialKitController } from 'dialkit';
import 'dialkit/styles.css';
import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  JELLY_ATLAS,
  JELLY_SPEED_DEFAULT,
  JELLY_SPEED_NAMES,
  JELLY_SPEEDS,
  type JellySpeed,
} from '../../data/jelly-atlas';
import { type Atlas, loadAtlas } from '../../utils/atlas';
import { useFrameClock } from '../../utils/useFrameClock';

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

const RAMPS_LIST = Object.keys(RAMPS) as RampName[];
const PALETTE_LIST = [...(Object.keys(PALETTES) as (keyof typeof PALETTES)[]), 'custom' as const];

const AsciiArt = () => {
  const reduceMotion = useReducedMotion();

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
    animation: true as boolean,
  });

  const v = dial.values;
  const ramp = v.ramp as RampName;
  const speed = v.speed as JellySpeed;
  const { contrast, zoom, invert, gradient, ink, ink2 } = v;
  const bg = v.background;
  const playing = v.animation;

  // biome-ignore lint/correctness/useExhaustiveDependencies: applies the preference once; adding `dial` would re-fire it and override the reader turning playback back on.
  useEffect(() => {
    if (reduceMotion) dial.setValues({ animation: false });
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
  const atlasRef = useRef<Atlas | null>(null);
  const frameRef = useRef(0);

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
    const atlas = atlasRef.current;
    if (!atlas?.frames) return;

    const frame = atlas.frames[frameRef.current % atlas.count];
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
      if (cancelled) return;
      atlasRef.current = atlas;
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
    frameRef.current = (frameRef.current + 1) % JELLY_ATLAS.count;
    draw();
  });

  // Redraw the current frame when a control changes, without touching playback.
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    // One ring around the whole instrument. The art gets its own border inside
    // it, and the radii are concentric — the inner 10px plus the 6px of padding
    // equals the outer 16px, so the two curves stay parallel instead of the
    // inner one looking too tight. The gap between art and controls is that
    // same 6px, so the spacing reads as one grid.
    //
    // The max width is tuned so the square lands at the natural height of the
    // control column beside it and the two ends line up. Add or remove a
    // control and this wants re-measuring; being a few pixels out only costs a
    // ragged bottom edge, not a broken layout.
    <div className="mx-auto w-full max-w-[598px] rounded-2xl border border-border bg-fg/2 p-1.5">
      <div className="flex flex-col gap-1.5 sm:flex-row">
        {/* The width is what's definite here, not the height: the controls take
            a fixed column and the art takes the rest, so `aspect-square` has a
            real width to square off. Sizing it from the height instead doesn't
            work — a flex item resolves its width from its content before the
            aspect ratio applies, and the art collapses to the width of the
            text. */}
        <div
          ref={stageRef}
          className="grid aspect-square w-full min-w-0 place-items-center self-start overflow-hidden rounded-[10px] border border-border/60 sm:flex-1"
          style={{ background: bg }}
        >
          <pre
            role="img"
            aria-label="Animated ASCII rendering of a jellyfish, drawn from the selected character ramp"
            className="font-mono leading-[1.02] tracking-normal"
            style={
              gradient
                ? {
                    fontSize: `${fontPx * zoom}px`,
                    // Painted through the glyphs rather than mapped per
                    // character: colouring by ramp position would need a span
                    // per cell, which is ~2,400 elements rebuilt eight times a
                    // second. This costs nothing and reads the same.
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
        </div>

        {/* DialKit's own panel, rendered inline rather than as the floating
            popover it defaults to. `productionEnabled` because these controls
            are the point of the piece, not a debug affordance to strip. */}
        <div className="flex min-w-0 flex-col gap-1.5 sm:w-[230px] sm:shrink-0">
          <DialRoot mode="inline" theme="dark" productionEnabled defaultOpen />

          <p className="mt-auto px-0.5 text-muted text-xs">
            {grid.cols}×{grid.rows} · {(JELLY_ATLAS.count / JELLY_SPEEDS[speed]).toFixed(1)}s loop
          </p>
        </div>
      </div>
    </div>
  );
};

export default AsciiArt;
