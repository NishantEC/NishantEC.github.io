# Portfolio redesign decisions

Each decision is a value in `src/design/design.ts` (`DESIGN`), editable live through the design editor overlay (`src/design/DesignEditor.tsx`, shown in dev or with `?design`). `LIVE` keeps the pre-redesign site for comparison. Anything not listed stays as it is today.

| Section | Decision | Date |
|---|---|---|
| Background | Paper `GrainGradient` "print", static, hero only. Settings in `background-principles.md`. | 2026-11-06 |
| Theme | Dark mode: **night** (deep blue, warming to ember at the footer). Light mode: **sky** (Enform's blue to peach). Follows the system setting. | 2026-11-06 |
| Projects | Keep today's grid (skills card + gem tiles), wrapped in a glass shell instead of the 1px border. | 2026-11-06 |
| Surfaces | Glass everywhere, never an outline. Enform's recipe (`hushbacks/apps/landing/src/components/home-next/journey/window/glass.css` + `merged/sticky/app/app.css`): translucent shell with blur, two-step drop shadow, 1px top highlight, then frost + corner specular + diagonal sheen + 40px top shine + overlay grain. Highlights at full strength in light mode, ~15% in dark. | 2026-11-06 |
| Radius | Card shells at **16px** (squircle-adjusted where `corner-shape` is supported). | 2026-11-06 |
| Status pill | **Off** by default (available in the editor). | 2026-11-06 |
| Filled buttons | Text on `bg-fg` buttons uses the new `--on-fg` token: white in sky mode, page colour elsewhere. | 2026-11-06 |
| Section headings | Kept as they are today (`current`); other styles stay available in the editor. | 2026-11-08 |
| Content refresh | Project cards and descriptions rewritten from the repos and enform.co; Neko's stack corrected to Rust/Swift; hale's repo link removed (repo is private); Healthifyme bullets now lead with the UAE launch and RIA on WhatsApp, PR count corrected to 360+ (verified: 362). Open-source section skipped: public upstream record is too thin to show. | 2026-11-08 |
| Naming | "Skills" is shown as **Agent skills** (menu, palette, showcase). URLs keep `/skills/`. | 2026-11-08 |

**Locked set (2026-11-06):** palette enform, background print, surface glass, radius 16, status pill off. These are the `DESIGN` defaults visitors get.

Still open (optional, nothing blocks publishing): font, hero layout, closing.
