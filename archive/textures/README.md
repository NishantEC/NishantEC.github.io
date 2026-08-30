# Textures — image/video filters over a canvas

Pulled out of `src/` while the ASCII demo stands on its own. Nothing here is
broken; it worked, was measured, and was cut for fit rather than for quality.

## What's here

- `textures.ts` — seven filters in the two shapes the technique comes in.
  `pixel` rewrites the buffer (Bitgrain, an 8×8 Bayer ordered dither; Duotone;
  Grain). `marks` throws the pixels away and redraws the frame as shapes
  (Glyphfield, Typeblocks, Halftone, Mosaic).
- `TextureLab.tsx` — the component: image, video, camera and the jellyfish
  atlas as sources, with ink/paper, scale, contrast, intensity and invert.
- `textures.mdx` — the stash entry.

## Restoring it

1. Move all three back (`textures.ts` → `src/utils/`, `TextureLab.tsx` →
   `src/components/stash/`, `textures.mdx` → `src/content/stash/`).
2. Add `'texture'` back to the `demo` union in `src/content/schema.ts`.
3. Re-add the dispatch line in `src/components/panel/PanelContent.tsx`.

It depends on `src/components/ui/Controls.tsx`, `src/utils/useFrameClock.ts` and
`src/data/jelly-atlas.ts`, all of which are still in place.

## What was learned, so it isn't re-derived

**Video needs no special path.** `drawImage` accepts any `CanvasImageSource`, so
a video element goes exactly where an image does. The clock is the only
difference: use `requestVideoFrameCallback`, which fires once per decoded frame,
rather than a timer that will run twice on one frame and skip the next.

**Only half the filters survive real time.** Measured against the reference
implementation at texture.fayaz.workers.dev, its painterly filters cost 75–258ms
on a third of a megapixel — 4 to 13fps. The ones here cost single-digit
milliseconds on a whole frame and held 60fps on live camera for all seven.
Watercolour, ink wash and a full CMYK risograph want a fragment shader; a JS
per-pixel loop is the wrong tool for them.

**Why it was pulled: the atlas doesn't belong in a pixel pipeline.** The jellyfish
sheet is already a density grid, 84×50, baked by the `video-to-ascii` skill.
Feeding it through this lab paints that grid into a bitmap, upscales it to
480px, then re-samples it back down to about 80 cells — quantising an
already-quantised thing, slightly out of alignment. It came out a soft grey blob
where the ASCII entry keeps it crisp. The `<pre>` matters too: that renders real
selectable text, while `glyphfield` draws characters into a bitmap.

**If these are ever merged properly**, unify on the *density grid*, not the
canvas. Every source — atlas, image, video, camera — can produce a grid of
densities; the renderer is then a separate choice of text, marks, or a pixel
filter. The atlas would feed the text renderer with no pixel round-trip, and an
uploaded video would gain real ASCII output. The shared abstraction was never a
canvas.
