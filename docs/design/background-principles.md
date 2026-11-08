# Background principles

How this site treats page backgrounds. Distilled from a sweep of Paper Shaders, ShaderGradient, Unicorn Studio, React Bits, Aceternity, Magic UI, Vanta and the sites of Linear, Vercel, Rauno, Emil Kowalski, Paco Coursey and Family (2026-11-06).

The target feeling is **confident restraint**: the page should look expensive because of what it leaves out.

## Rules

1. **Flat is the top tier.** Rauno, Emil, Paco and Family ship solid backgrounds. Any effect has to beat flat, not just be prettier than other effects.
2. **Static by default.** One frame (`speed 0`). If something moves, a feature takes 20s or more to cross the viewport and the loop has no visible seam.
3. **Low contrast.** Background tones stay within 6–8% lightness of the base. Body text contrast must be identical with the effect on or off.
4. **Bounded placement.** Effects live in the hero box (Vercel), on cards (Linear), or on one object. Never full-page behind long-form text. Fade out at the bottom edge.
5. **One hue.** One warm family, saturation 15% or less, no complementary accents.
6. **No interaction.** No cursor or click response. `pointer-events: none`, `aria-hidden`.
7. **Texture is physical.** Grain and fibre blend in at 10% or less, tiles 256px or larger so no pattern repeats visibly.
8. **Cheap and polite.** 30 KB gzipped or less per effect, pause off-screen, one animated canvas per view at most, a still frame under `prefers-reduced-motion`.

## Never

- Anything that reacts to the cursor: spotlights, dot grids that swell, constellations, particle repulsion.
- Particles, starfields, meteors, beams, shooting stars, flow-field lines.
- Library presets at shipped speed or colour (Silk speed 5, Warp presets 2.5–20, purple/cyan defaults).
- 3D camera gradients, scan lines, glitch, CRT, lightning.
- Several animated canvases at once, or WebGL behind paragraphs.

## Library of record

[Paper Shaders](https://shaders.paper.design) (`@paper-design/shaders-react`, pin the exact version: it is still 0.0.x and ships breaking changes). Zero dependencies, about 8–27 KB gzipped per shader, pauses when hidden, and `speed={0}` renders once with no animation loop. The effects that pass the rules above: `GrainGradient` (shape `wave`), `Dithering` (shape `warp`, type `8x8`), `StaticMeshGradient`, `PaperTexture`, and `Warp` at speed 0.3 or less.

The existing `GemShader` on project cards already follows rules 2, 4 and 8: slow enough that "you notice it over a few seconds, never at a glance".

## Decision (2026-11-06)

Home page background: **Paper `GrainGradient`, shape `wave`, speed 0**, confined to the hero (about 820px tall, fading out over the bottom 45%), colours a few % lighter than the page in the same hue (`#1b1918` → `#211e1c`, `#282421`, `#302a26`), `softness 0.7`, `intensity 0.15`, `noise 0.5`. Chosen in the design mixer over flat, mesh, dither, marble and card grain.
