import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import sampleImage from '../../assets/me.jpeg';
import { JELLY_ATLAS, JELLY_FPS } from '../../data/jelly-atlas';
import { type Atlas, loadAtlas } from '../../utils/atlas';
import {
  applyTexture,
  TEXTURE_NAMES,
  TEXTURES,
  type TextureName,
  type TextureOptions,
} from '../../utils/textures';
import { useFrameClock } from '../../utils/useFrameClock';
import { ControlStack, Segmented, Select, Slider, Swatch } from '../ui/Controls';

/**
 * Textures over an image, a video, or the camera — all of it in the tab.
 *
 * The reason one pipeline serves all three is that `drawImage` accepts any
 * `CanvasImageSource`, so a video element goes in exactly where an image does.
 * What changes between them is only the clock: a still is drawn once and again
 * whenever a control moves, while a video is driven by
 * `requestVideoFrameCallback`, which fires per decoded frame rather than per
 * display refresh — so the texture never runs twice on the same frame, and
 * never misses one.
 *
 * The filters here are the half that survive real time. Measured against a
 * reference implementation, the painterly ones cost 75–258ms on a third of a
 * megapixel; these cost single-digit milliseconds on a full frame.
 */

const WORK_WIDTH = 480;
const BTN =
  'shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60';

type Source =
  /** The pre-baked jellyfish: frames of luminance, not an image file. */
  | { kind: 'atlas' }
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string }
  | { kind: 'camera' };

const TextureLab = () => {
  const reduceMotion = useReducedMotion();

  const [source, setSource] = useState<Source>({ kind: 'atlas' });
  const [texture, setTexture] = useState<TextureName>('bitgrain');
  const [scale, setScale] = useState(6);
  const [contrast, setContrast] = useState(1);
  const [intensity, setIntensity] = useState(1);
  const [invert, setInvert] = useState(false);
  const [ink, setInk] = useState('#101010');
  const [paper, setPaper] = useState('#f4f4f3');
  const [playing, setPlaying] = useState(!reduceMotion);
  const [note, setNote] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atlasRef = useRef<Atlas | null>(null);
  const atlasFrameRef = useRef(0);
  /**
   * The atlas frames are density grids, not pictures, so they have to become a
   * `CanvasImageSource` before the shared pipeline will take them. This offscreen
   * canvas is that bridge: one frame painted as greyscale at the sheet's own
   * resolution, which `drawImage` then scales up like any other source.
   */
  const atlasCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Read through a ref inside the frame loop: the loop is started once per
  // source and must see the current settings without being torn down and
  // restarted every time a slider moves.
  const sourceKindRef = useRef<Source['kind']>(source.kind);
  sourceKindRef.current = source.kind;

  const optionsRef = useRef<TextureOptions & { texture: TextureName }>({
    scale,
    contrast,
    intensity,
    invert,
    ink,
    paper,
    texture,
  });
  optionsRef.current = { scale, contrast, intensity, invert, ink, paper, texture };

  /** Paints the current atlas frame onto the bridge canvas and returns it. */
  const atlasSource = useCallback(() => {
    const atlas = atlasRef.current;
    if (!atlas?.frames) return null;

    let bridge = atlasCanvasRef.current;
    if (!bridge) {
      bridge = document.createElement('canvas');
      atlasCanvasRef.current = bridge;
    }
    bridge.width = atlas.cols;
    bridge.height = atlas.rows;

    const ctx = bridge.getContext('2d', { alpha: false });
    if (!ctx) return null;

    const frame = atlas.frames[atlasFrameRef.current % atlas.count];
    const image = ctx.createImageData(atlas.cols, atlas.rows);
    for (let i = 0; i < frame.length; i++) {
      const v = Math.round(frame[i] * 255);
      const p4 = i * 4;
      image.data[p4] = v;
      image.data[p4 + 1] = v;
      image.data[p4 + 2] = v;
      image.data[p4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return bridge;
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const media = sourceKindRef.current === 'atlas' ? atlasSource() : mediaRef.current;
    if (!canvas || !media) return;

    const sw =
      media instanceof HTMLVideoElement
        ? media.videoWidth
        : media instanceof HTMLCanvasElement
          ? media.width
          : media.naturalWidth;
    const sh =
      media instanceof HTMLVideoElement
        ? media.videoHeight
        : media instanceof HTMLCanvasElement
          ? media.height
          : media.naturalHeight;
    if (!sw || !sh) return;

    // Work at a fixed width and let CSS scale the result up. The cost of every
    // filter here is per pixel, so this is the one number that decides whether
    // a 4K phone video is realtime or a slideshow.
    const w = WORK_WIDTH;
    const h = Math.max(1, Math.round((sh / sw) * WORK_WIDTH));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { texture: name, ...options } = optionsRef.current;
    try {
      applyTexture(ctx, media, w, h, name, options);
    } catch {
      // A cross-origin frame with no CORS headers taints the canvas and
      // `getImageData` throws rather than returning anything.
      setNote("That source won't allow its pixels to be read.");
    }
  }, [atlasSource]);

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    mediaRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  // Load whichever source is selected.
  useEffect(() => {
    let cancelled = false;
    loadAtlas(JELLY_ATLAS).then((atlas) => {
      if (cancelled) return;
      atlasRef.current = atlas;
      paint();
    });
    return () => {
      cancelled = true;
    };
  }, [paint]);

  useFrameClock(JELLY_FPS, source.kind === 'atlas' && playing, () => {
    atlasFrameRef.current = (atlasFrameRef.current + 1) % JELLY_ATLAS.count;
    paint();
  });

  useEffect(() => {
    let cancelled = false;
    setNote(null);

    if (source.kind === 'atlas') return;

    if (source.kind === 'image') {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => {
        if (cancelled) return;
        mediaRef.current = el;
        paint();
      };
      el.onerror = () => setNote("That image wouldn't load.");
      el.src = source.url;
      return () => {
        cancelled = true;
      };
    }

    const el = document.createElement('video');
    el.muted = true;
    el.loop = true;
    el.playsInline = true;

    if (source.kind === 'video') {
      el.crossOrigin = 'anonymous';
      el.src = source.url;
      el.onerror = () => setNote("That video wouldn't load.");
      el.onloadeddata = () => {
        if (!cancelled) {
          mediaRef.current = el;
          el.play().catch(() => {});
        }
      };
    } else {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720 } })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => {
              t.stop();
            });
            return;
          }
          streamRef.current = stream;
          el.srcObject = stream;
          mediaRef.current = el;
          el.play().catch(() => {});
        })
        .catch(() => setNote('The camera was blocked, or there isn’t one.'));
    }

    return () => {
      cancelled = true;
    };
  }, [source, paint]);

  // Stills repaint on any control change; moving sources have their own clock.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the settings are read through a ref inside `paint`, so they have to be listed here explicitly for a still to repaint when one moves.
  useEffect(() => {
    if (source.kind === 'image') paint();
  }, [source.kind, paint, texture, scale, contrast, intensity, invert, ink, paper]);

  /**
   * The video clock. `requestVideoFrameCallback` hands us each decoded frame
   * with its own timestamp, so the texture runs once per real frame — a
   * `setInterval` would either run twice on one frame or skip one, which is
   * exactly the judder it produces on any rate that isn't a whole number of
   * display refreshes.
   */
  useEffect(() => {
    if (source.kind === 'image' || source.kind === 'atlas' || !playing) return;
    let handle = 0;
    let raf = 0;
    let frames = 0;
    let since = performance.now();

    const measure = () => {
      frames += 1;
      const now = performance.now();
      if (now - since >= 500) {
        setFps(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
      }
    };

    const el = mediaRef.current as HTMLVideoElement | null;
    const supported = el && 'requestVideoFrameCallback' in el;

    const onFrame = () => {
      paint();
      measure();
      const video = mediaRef.current as HTMLVideoElement | null;
      if (video) handle = video.requestVideoFrameCallback(onFrame);
    };

    const onRaf = () => {
      paint();
      measure();
      raf = requestAnimationFrame(onRaf);
    };

    // Safari only shipped `requestVideoFrameCallback` recently, so the fallback
    // is a plain rAF loop — it repaints frames the decoder hasn't changed, which
    // costs work but never stalls.
    if (supported) handle = el.requestVideoFrameCallback(onFrame);
    else raf = requestAnimationFrame(onRaf);

    return () => {
      const video = mediaRef.current as HTMLVideoElement | null;
      if (handle && video?.cancelVideoFrameCallback) video.cancelVideoFrameCallback(handle);
      if (raf) cancelAnimationFrame(raf);
      setFps(null);
    };
  }, [source.kind, playing, paint]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    if (!isVideo && !file.type.startsWith('image/')) return;
    release();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setSource({ kind: isVideo ? 'video' : 'image', url });
  };

  const pick = (next: Source) => {
    release();
    setSource(next);
  };

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${texture}.png`;
      a.click();
      URL.revokeObjectURL(href);
    });
  };

  const isMoving = source.kind !== 'image';

  return (
    <div className="mx-auto w-full max-w-[624px] rounded-2xl border border-border bg-fg/2 p-1.5">
      <div className="flex flex-col gap-1.5 sm:flex-row">
        <div
          /* The letterbox is not part of the picture, so it stays the panel's
             own colour rather than the texture's paper — painting it `paper`
             put a white border around a black frame on the source-colour
             textures, which read as a bug in the image. */
          className="grid aspect-square w-full min-w-0 place-items-center self-start overflow-hidden rounded-[10px] border border-border/60 bg-bg sm:flex-1"
        >
          {/* Scaled by CSS, not by the canvas: the filters cost per pixel, so
              the buffer stays small and the display size is free. */}
          <canvas
            ref={canvasRef}
            aria-label={`${TEXTURES[texture].label} texture applied to the ${source.kind} source`}
            role="img"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 sm:w-[230px] sm:shrink-0">
          <ControlStack>
            <Select label="texture" value={texture} options={TEXTURE_NAMES} onChange={setTexture} />
            <Swatch
              label="ink / paper"
              values={[
                { title: 'Ink colour', value: ink },
                { title: 'Paper colour', value: paper },
              ]}
              onChange={(i, v) => (i === 0 ? setInk(v) : setPaper(v))}
            />
            <Slider label="scale" value={scale} min={2} max={24} step={1} onChange={setScale} />
            <Slider
              label="contrast"
              value={contrast}
              min={0.3}
              max={3}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={setContrast}
            />
            <Slider
              label="intensity"
              value={intensity}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={setIntensity}
            />
            <Segmented label="invert" value={invert} onChange={setInvert} />
            {isMoving && <Segmented label="playing" value={playing} onChange={setPlaying} />}
          </ControlStack>

          <div className="grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()} className={BTN}>
              file
            </button>
            <button type="button" onClick={() => pick({ kind: 'camera' })} className={BTN}>
              camera
            </button>
            <button type="button" onClick={() => pick({ kind: 'atlas' })} className={BTN}>
              jellyfish
            </button>
            <button
              type="button"
              onClick={() => pick({ kind: 'image', url: sampleImage })}
              className={`${BTN} col-span-2`}
            >
              sample photo
            </button>
            <button type="button" onClick={download} className={`${BTN} col-span-3`}>
              save .png
            </button>
          </div>

          <p className="mt-auto px-0.5 text-muted text-xs">
            {note ?? (
              <>
                {source.kind === 'atlas' ? `${JELLY_ATLAS.count} baked frames` : `${WORK_WIDTH}px`}{' '}
                · {TEXTURES[texture].kind}
                {fps !== null && ` · ${fps} fps`}
              </>
            )}
          </p>

          <input
            ref={fileRef}
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

export default TextureLab;
