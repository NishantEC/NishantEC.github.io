# ASCII demo — the source-handling version

`AsciiArt.with-sources.tsx` is the demo as it stood before the controls were cut
back to the visual ones (ramp, palette, colour, contrast, zoom, invert).

## What's only in here

- File upload (`<input type=file>`, images and video, via an object URL)
- A direct image/video URL box, with `VIDEO_EXT` deciding which it is
- `getUserMedia` camera capture
- The canvas sampling path in `render` — `drawImage` downscale, `getImageData`,
  luminance, peak normalisation
- Per-pixel colour, which tinted each glyph with the pixel it came from
- `releaseSource` (revokes object URLs, stops camera tracks) and the `act`
  dispatcher for copy / .txt download

## Why it was pulled

The controls were the point of the piece and the source buttons crowded them
out. With no uploads the only source is the pre-baked atlas, which is
grayscale — so per-pixel colour had nothing to tint and went with them.

## Restoring it

Copy it back over `src/components/stash/AsciiArt.tsx`. It is self-contained and
compiled cleanly when archived; the only outside things it needs are
`src/utils/atlas.ts`, `src/components/ui/Controls.tsx` and the jelly atlas PNG,
all of which are still in place. The stash entry's copy in
`src/content/stash/video-to-ascii.mdx` was rewritten when this came out, so put
the upload/YouTube paragraphs back too.

Note the cross-origin limit it carries: a pasted URL from a host that sends no
CORS headers cannot be read, and a YouTube link can never work — an embed is a
cross-origin iframe and a page may not read pixels out of one.
