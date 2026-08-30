import { useCallback, useEffect, useRef, useState } from 'react';
import jellyAtlas from '../../assets/ascii/jelly-a.png';
import { type Atlas, loadAtlas } from '../../utils/atlas';
import { ControlStack, Segmented, Select, Slider } from '../ui/Controls';

/**
 * A video played back as ASCII, entirely in the browser.
 *
 * The usual way to build one of these is offline — ffmpeg crops and downscales,
 * a script bakes a sprite sheet, the page just plays it back. For a still that
 * is all avoidable: a canvas can do the downscale, `getImageData` gives you the
 * luminance, and the whole thing re-renders faster than you can drag a slider.
 *
 * An uploaded video, a direct video URL and the camera are all just "something
 * you can draw to a canvas", so one sampling path serves all three; a still
 * image is the same path that never advances. What it cannot read is a YouTube
 * link — an embed is a cross-origin iframe and a page may not read pixels out of
 * one, so that genuinely needs a server. Nothing here has one.
 */

const RAMPS = {
  standard: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  minimal: ' .:*#',
  line: ' .,:;i1tfLCG08@',
} as const;

type RampName = keyof typeof RAMPS;

type Source =
  /** Pre-baked frames — the pipeline's own output, played straight back. */
  | { kind: 'atlas' }
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string }
  | { kind: 'camera' };

/**
 * Fallback only. The real advance width is measured from the rendered font at
 * mount — "monospace is 0.6em wide" is a rule of thumb, and this stack actually
 * measures 0.75, which both overflowed the container and stretched the aspect
 * of anything sampled from a video.
 */
const FALLBACK_RATIO = 0.6;

/** Grid height used for the fit calculation; the atlas is the common case. */
const ROWS_HINT = 50;

/**
 * Ink and background pairs. Every one is checked to keep the glyphs legible
 * against their own background — a low-contrast pair turns the art to mush long
 * before it looks moody.
 */
const THEMES = [
  { name: 'mono', ink: '#f1f1f0', bg: '#0d0d0f' },
  { name: 'paper', ink: '#15151a', bg: '#f4f4f3' },
  { name: 'phosphor', ink: '#5eead4', bg: '#04100d' },
  { name: 'amber', ink: '#fbbf24', bg: '#140d02' },
  { name: 'ultra', ink: '#c4b5fd', bg: '#0f0b1a' },
  { name: 'blueprint', ink: '#93c5fd', bg: '#050b16' },
] as const;

/** Live sources resample at this rate. The cost is rebuilding a ~10k character
 *  string, which is cheap but not free, and the eye reads no difference. */
const RAMPS_LIST = Object.keys(RAMPS) as RampName[];
const THEME_NAMES = THEMES.map((t) => t.name);

const LIVE_FPS = 12;

/** Extensions a browser will actually play. Anything else is treated as a still. */
const BTN =
  'shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-fg';

/** Extensions a browser will actually play. */
const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

/** Fixed rather than adjustable: at a monospace cell this is about as wide as
 *  the pane can show without the art wrapping or the glyphs going illegible. */
const COLS = 84;

/**
 * The default demo is a baked atlas rather than a video: 48 frames of luminance
 * in a 60KB greyscale sheet, which animates the moment it decodes and costs a
 * fraction of what the source clip would. The constants match what produced it.
 */
const ATLAS = {
  url: jellyAtlas,
  cols: COLS,
  rows: 50,
  tileX: 8,
  count: 48,
  floor: 0.06,
  gamma: 0.578,
} as const;

const AsciiArt = () => {
  const [source, setSource] = useState<Source>({ kind: 'atlas' });
  const [contrast, setContrast] = useState(0.85);
  const [ramp, setRamp] = useState<RampName>('standard');
  const [invert, setInvert] = useState(false);
  const [colour, setColour] = useState(false);
  const [theme, setTheme] = useState<(typeof THEMES)[number]>(THEMES[0]);
  const [zoom, setZoom] = useState(1);

  const [mediaUrl, setMediaUrl] = useState('');
  const [art, setArt] = useState('');
  const [tinted, setTinted] = useState<{ ch: string; rgb: string }[][] | null>(null);
  const [live, setLive] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [fontPx, setFontPx] = useState(7);
  const [cellRatio, setCellRatio] = useState(FALLBACK_RATIO);
  /** What is actually on screen — a cropped atlas is smaller than COLS. */
  const [grid, setGrid] = useState({ cols: COLS, rows: ROWS_HINT });

  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atlasRef = useRef<Atlas | null>(null);
  const frameRef = useRef(0);
  const artRef = useRef('');

  // Measure the font's real advance width rather than assuming 0.6em. This stack
  // measures ~0.75, and guessing overflowed the container and stretched the
  // aspect of anything sampled from a video.
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

  // Fit inside the square on whichever axis runs out first; zoom scales on top.
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      const byWidth = width / grid.cols / cellRatio;
      const byHeight = height / grid.rows / 1.02;
      setFontPx(Math.max(1, Math.min(byWidth, byHeight)));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [cellRatio, grid]);

  const render = useCallback(() => {
    // Atlas frames are already normalised densities, so they skip the whole
    // downscale-and-sample path and go straight to glyphs.
    const atlas = atlasRef.current;
    if (atlas?.frames) {
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
      const out = lines.join('\n');
      artRef.current = out;
      setArt(out);
      setTinted(null);
      return;
    }

    const media = mediaRef.current;
    if (!media) return;

    const w = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const h = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!w || !h) return;

    const rows = Math.max(1, Math.round(COLS * cellRatio * (h / w)));
    setGrid({ cols: COLS, rows });

    const canvas = document.createElement('canvas');
    canvas.width = COLS;
    canvas.height = rows;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(media, 0, 0, COLS, rows);

    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, COLS, rows).data;
    } catch {
      // A cross-origin source without CORS headers taints the canvas, and
      // reading it back throws rather than returning anything.
      setNote("That source won't allow its pixels to be read (no CORS headers).");
      return;
    }

    // Normalise against the brightest pixel rather than a flat 255, so a dull
    // frame still uses the whole ramp.
    const lum = new Float32Array(COLS * rows);
    let peak = 0;
    for (let i = 0; i < lum.length; i++) {
      const p = i * 4;
      const v = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
      lum[i] = v;
      if (v > peak) peak = v;
    }
    if (peak === 0) peak = 1;

    const chars = RAMPS[ramp];
    const last = chars.length - 1;
    const glyph = (i: number) => {
      let t = lum[i] / peak;
      if (invert) t = 1 - t;
      return chars[Math.min(last, Math.max(0, Math.round(t ** contrast * last)))];
    };

    const lines: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < COLS; x++) line += glyph(y * COLS + x);
      lines.push(line);
    }
    const plain = lines.join('\n');
    artRef.current = plain;

    // Colour keeps the characters and tints each with its own pixel, so it still
    // reads as ASCII. It costs a span per cell — fine for a still, far too slow
    // for a live source, which falls back to plain.
    if (!colour || live) {
      setArt(plain);
      setTinted(null);
      return;
    }

    const cells: { ch: string; rgb: string }[][] = [];
    for (let y = 0; y < rows; y++) {
      const row: { ch: string; rgb: string }[] = [];
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const p4 = i * 4;
        row.push({ ch: glyph(i), rgb: `rgb(${data[p4]},${data[p4 + 1]},${data[p4 + 2]})` });
      }
      cells.push(row);
    }
    setTinted(cells);
    setArt(plain);
  }, [ramp, contrast, invert, colour, live, cellRatio]);

  /** Frees whatever the previous source held open. */
  const releaseSource = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    mediaRef.current = null;
    atlasRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    setLive(source.kind !== 'image');

    const startLive = (el: HTMLVideoElement) => {
      mediaRef.current = el;
      timer = setInterval(() => {
        if (!cancelled) render();
      }, 1000 / LIVE_FPS);
    };

    if (source.kind === 'atlas') {
      loadAtlas(ATLAS).then((atlas) => {
        if (cancelled) return;
        atlasRef.current = atlas;
        frameRef.current = 0;
        setGrid({ cols: atlas.cols, rows: atlas.rows });
        timer = setInterval(() => {
          if (cancelled) return;
          frameRef.current = (frameRef.current + 1) % ATLAS.count;
          render();
        }, 1000 / 8);
        render();
      });
    } else if (source.kind === 'camera') {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => {
              t.stop();
            });
            return;
          }
          streamRef.current = stream;
          const el = document.createElement('video');
          el.srcObject = stream;
          el.muted = true;
          el.playsInline = true;
          el.play()
            .then(() => startLive(el))
            .catch(() => {});
        })
        .catch(() => setNote('The camera was blocked, or there isn’t one.'));
    } else if (source.kind === 'video') {
      const el = document.createElement('video');
      el.src = source.url;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.crossOrigin = 'anonymous';
      el.onloadeddata = () => {
        if (!cancelled)
          el.play()
            .then(() => startLive(el))
            .catch(() => {});
      };
      el.onerror = () => setNote("That video couldn't be loaded.");
    } else {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => {
        if (cancelled) return;
        mediaRef.current = el;
        setNote(null);
        render();
      };
      // With `crossOrigin` set, a host sending no CORS headers fails to load at
      // all — a cleaner failure than a tainted canvas later.
      el.onerror = () =>
        setNote("That wouldn't load. Most sites don't allow their images to be read.");
      el.src = source.url;
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [source, render]);

  useEffect(() => releaseSource, [releaseSource]);

  // Control changes re-render a still immediately; live sources already tick.
  useEffect(() => {
    if (source.kind === 'image') render();
  }, [render, source.kind]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (!isVideo && !file.type.startsWith('image/')) return;

    releaseSource();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setNote(null);
    setSource({ kind: isVideo ? 'video' : 'image', url: objectUrl });
  };

  const act = (path: string) => {
    if (path === 'openFile') fileInputRef.current?.click();
    else if (path === 'useCamera') {
      releaseSource();
      setNote(null);
      setSource({ kind: 'camera' });
    } else if (path === 'reset') {
      releaseSource();
      setNote(null);
      setSource({ kind: 'atlas' });
    } else if (path === 'loadUrl') {
      const url = mediaUrl.trim();
      if (!url) return;
      releaseSource();
      setNote(null);
      // A direct file URL either plays or it doesn't; the extension is the only
      // hint available before fetching.
      setSource({ kind: VIDEO_EXT.test(url) ? 'video' : 'image', url });
    } else if (path === 'copyText') {
      navigator.clipboard.writeText(artRef.current).catch(() => {});
    } else if (path === 'download') {
      const blob = new Blob([artRef.current], { type: 'text/plain' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'ascii.txt';
      a.click();
      URL.revokeObjectURL(href);
    }
  };

  const sourceLabel =
    source.kind === 'atlas'
      ? 'pre-baked frames'
      : source.kind === 'camera'
        ? 'your camera'
        : source.kind;

  const rendered = tinted ? (
    <pre
      aria-hidden="true"
      className="font-mono leading-[1.02] tracking-normal"
      style={{ fontSize: `${fontPx * zoom}px` }}
    >
      {tinted.map((row, y) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid — row y is always row y
        <div key={y}>
          {row.map((cell, x) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: same, for the column
            <span key={x} style={{ color: cell.rgb }}>
              {cell.ch}
            </span>
          ))}
        </div>
      ))}
    </pre>
  ) : (
    <pre
      className="font-mono leading-[1.02] tracking-normal"
      style={{ fontSize: `${fontPx * zoom}px` }}
    >
      {art}
    </pre>
  );

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
    <div className="mx-auto w-full max-w-[624px] rounded-2xl border border-border bg-fg/2 p-1.5">
      <div className="flex flex-col gap-1.5 sm:flex-row">
        {/* The width is what's definite here, not the height: the controls
            take a fixed column and the art takes the rest, so `aspect-square`
            has a real width to square off. Sizing it from the height instead
            doesn't work — a flex item resolves its width from its content
            before the aspect ratio applies, and the art collapses to the width
            of the text. */}
        <div
          ref={stageRef}
          className="grid aspect-square w-full min-w-0 place-items-center self-start overflow-hidden rounded-[10px] border border-border/60 sm:flex-1"
          style={{ background: theme.bg, color: theme.ink }}
        >
          {rendered}
        </div>

        {/* Controls run down the right of the art, inside the same ring —
            free-standing rows rather than a second boxed group, so the ring
            stays the only frame on screen. */}
        <div className="flex min-w-0 flex-col gap-1.5 sm:w-[230px] sm:shrink-0">
          <ControlStack>
            <Select label="ramp" value={ramp} options={RAMPS_LIST} onChange={setRamp} />
            <Select
              label="palette"
              value={theme.name}
              options={THEME_NAMES}
              onChange={(name) => setTheme(THEMES.find((t) => t.name === name) ?? THEMES[0])}
            />
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
            <Segmented label="colour" value={colour} onChange={setColour} />
          </ControlStack>

          <div className="flex gap-1.5">
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && act('loadUrl')}
              placeholder="Image or video URL"
              aria-label="Image or video URL"
              className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-muted focus:border-fg/30"
            />
            <button type="button" onClick={() => act('loadUrl')} className={BTN}>
              load
            </button>
          </div>

          {/* A grid, not a wrapping row — five buttons in a fixed column wrap
              4+1 and the orphan reads as a mistake. Three across is even. */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => act('openFile')}
              className={`${BTN} w-full text-center`}
            >
              file
            </button>
            <button
              type="button"
              onClick={() => act('useCamera')}
              className={`${BTN} w-full text-center`}
            >
              camera
            </button>
            <button
              type="button"
              onClick={() => act('reset')}
              className={`${BTN} w-full text-center`}
            >
              reset
            </button>
            <button
              type="button"
              onClick={() => act('copyText')}
              className={`${BTN} w-full text-center`}
            >
              copy
            </button>
            <button
              type="button"
              onClick={() => act('download')}
              className={`${BTN} w-full text-center`}
            >
              .txt
            </button>
          </div>

          {/* Pushed to the bottom of the column so it lines up with the foot of
              the art rather than floating under the buttons. */}
          <p className="mt-auto px-0.5 text-xs text-muted">
            {note ?? (
              <>
                {grid.cols}×{grid.rows} · {sourceLabel}
                {live ? ' · live' : ''}
              </>
            )}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => loadFile(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default AsciiArt;
