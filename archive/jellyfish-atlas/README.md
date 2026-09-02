# The jellyfish sprite sheet

What the ASCII entry used to open with: 120 frames of luminance tiles on one
PNG, decoded once at load into arrays of densities. `atlas.ts` decodes it,
`jelly-atlas.ts` is the spec, `jelly-b.png` is the sheet.

Retired when the page collapsed into a single panel that really bakes. The sheet
was the smaller thing to ship — 143KB against the 145KB clip that replaced it —
but it had two problems the bake does not:

- **No source.** The compare slider needs a video to sit beside the characters,
  and the sheet is the output with the input thrown away.
- **No density.** The grid was cut at 84 columns when the sheet was made, so the
  control could not do anything and was shown anyway.

Still the right shape for a page that only wants to *show* an ASCII loop and
never re-bake it: no decode cost, no pipeline, no `<video>`. The numbers in
`jelly-atlas.ts` (floor 0.14, gamma 0.578) are the skill's output for that sheet
and mean nothing on their own — changing one without re-baking just breaks it.
