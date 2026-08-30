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
import { compose, offsetAt, PATH_SECONDS, TRAVEL_COLS, TRAVEL_ROWS } from '../../utils/jellyPath';
import { useFrameClock } from '../../utils/useFrameClock';
import { ControlStack, Segmented, Select, Slider, Swatch } from '../ui/Controls';

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

type PaletteName = keyof typeof PALETTES | 'custom';

const RAMPS_LIST = Object.keys(RAMPS) as RampName[];
const PALETTE_LIST = [...(Object.keys(PALETTES) as (keyof typeof PALETTES)[]), 'custom' as const];

const AsciiArt = () => {
  const reduceMotion = useReducedMotion();

  /**
   * Playback is a control, not a fact of the component.
   *
   * Two separate rules land here. Motion has to be opt-in under
   * `prefers-reduced-motion`, so the loop starts stopped for anyone who asked
   * for that — they still get a rendered frame and every other control. And
   * auto-playing content needs a visible way to stop it whatever the
   * preference is, which is why this is a row in the stack rather than a bare
   * `reduceMotion` check.
   */
  const [playing, setPlaying] = useState(!reduceMotion);

  const [ramp, setRamp] = useState<RampName>('standard');
  const [speed, setSpeed] = useState<JellySpeed>(JELLY_SPEED_DEFAULT);
  /**
   * Composes a journey across the frame from frames that only pulse in place.
   * Additive and self-contained — see `jellyPath.ts`.
   */
  const [drift, setDrift] = useState(true);
  const [contrast, setContrast] = useState(0.85);
  const [zoom, setZoom] = useState(1);
  const [invert, setInvert] = useState(false);

  const [palette, setPalette] = useState<PaletteName>('mono');
  const [ink, setInk] = useState<string>(PALETTES.mono.ink);
  const [ink2, setInk2] = useState<string>(PALETTES.mono.ink2);
  const [bg, setBg] = useState<string>(PALETTES.mono.bg);
  const [gradient, setGradient] = useState(false);

  const [art, setArt] = useState('');
  const [fontPx, setFontPx] = useState(7);
  const [cellRatio, setCellRatio] = useState(FALLBACK_RATIO);
  const [grid, setGrid] = useState({ cols: COLS, rows: ROWS_HINT });
  const [ready, setReady] = useState(false);
  const atlasSizeRef = useRef({ cols: COLS, rows: ROWS_HINT });

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

    const source = atlas.frames[frameRef.current % atlas.count];

    // The path cycle runs on wall-clock time, not on the frame index, so it
    // stays the same journey whether the pulse is playing at 15 or 30fps.
    const cycle = (performance.now() / 1000 / PATH_SECONDS) % 1;
    const frame = drift
      ? compose(source, atlas.cols, atlas.rows, offsetAt(cycle, atlas.cols))
      : source;
    const cols = drift ? atlas.cols + TRAVEL_COLS : atlas.cols;
    const rows = drift ? atlas.rows + TRAVEL_ROWS : atlas.rows;

    const chars = RAMPS[ramp];
    const last = chars.length - 1;

    const lines: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        let t = frame[y * cols + x];
        if (invert) t = 1 - t;
        line += chars[Math.min(last, Math.max(0, Math.round(t ** contrast * last)))];
      }
      lines.push(line);
    }
    setArt(lines.join('\n'));
  }, [ramp, contrast, invert, drift]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount only — `draw` changes with every control, and reloading the sheet on each one would be absurd. Playback lives in its own effect below.
  useEffect(() => {
    let cancelled = false;

    loadAtlas(JELLY_ATLAS).then((atlas) => {
      if (cancelled) return;
      atlasRef.current = atlas;
      // The atlas is cropped to its subject, so it is narrower than COLS and the
      // fit has to work from what it actually reports.
      setGrid({ cols: atlas.cols, rows: atlas.rows });
      atlasSizeRef.current = { cols: atlas.cols, rows: atlas.rows };
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

  // Drifting needs a wider, taller grid to move through, so the fit follows it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `ready` is the signal that the atlas size ref has been filled, not a value read from it.
  useEffect(() => {
    const { cols, rows } = atlasSizeRef.current;
    setGrid(drift ? { cols: cols + TRAVEL_COLS, rows: rows + TRAVEL_ROWS } : { cols, rows });
  }, [drift, ready]);

  const applyPalette = (name: PaletteName) => {
    setPalette(name);
    if (name === 'custom') return;
    const preset = PALETTES[name];
    setInk(preset.ink);
    setInk2(preset.ink2);
    setBg(preset.bg);
  };

  const editColour = (index: number, value: string) => {
    // Editing a colour means these are no longer any preset's colours.
    setPalette('custom');
    if (index === 0) setInk(value);
    else setInk2(value);
  };

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

        {/* Controls run down the right of the art, inside the same ring —
            free-standing rows rather than a second boxed group, so the ring
            stays the only frame on screen. */}
        <div className="flex min-w-0 flex-col gap-1.5 sm:w-[230px] sm:shrink-0">
          <ControlStack>
            <Select label="ramp" value={ramp} options={RAMPS_LIST} onChange={setRamp} />
            <Select
              label="palette"
              value={palette}
              options={PALETTE_LIST}
              onChange={applyPalette}
            />
            <Swatch
              label={gradient ? 'ramp from → to' : 'ramp'}
              values={
                gradient
                  ? [
                      { title: 'Ramp start colour', value: ink },
                      { title: 'Ramp end colour', value: ink2 },
                    ]
                  : [{ title: 'Ramp colour', value: ink }]
              }
              onChange={editColour}
            />
            <Swatch
              label="background"
              values={[{ title: 'Background colour', value: bg }]}
              onChange={(_, value) => {
                setPalette('custom');
                setBg(value);
              }}
            />
            <Segmented label="gradient" value={gradient} onChange={setGradient} />
            <Slider
              label="contrast"
              value={contrast}
              min={0.3}
              max={2.5}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={setContrast}
            />
            <Slider
              label="zoom"
              value={zoom}
              min={0.5}
              max={2.5}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={setZoom}
            />
            <Segmented label="invert" value={invert} onChange={setInvert} />
            <Select label="speed" value={speed} options={JELLY_SPEED_NAMES} onChange={setSpeed} />
            <Segmented label="drift" value={drift} onChange={setDrift} />
            <Segmented label="animation" value={playing} onChange={setPlaying} />
          </ControlStack>

          <p className="mt-auto px-0.5 text-xs text-muted">
            {grid.cols}×{grid.rows} ·{' '}
            {drift
              ? `${PATH_SECONDS}s journey`
              : `${(JELLY_ATLAS.count / JELLY_SPEEDS[speed]).toFixed(1)}s loop`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AsciiArt;
