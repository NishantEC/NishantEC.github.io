# nishantec.github.io

Personal site — React 19, Vite, Tailwind 4, framer-motion.

```bash
yarn install
yarn dev      # dev server
yarn build    # typecheck + production build
yarn lint     # biome check
yarn lint:fix # biome check --write
```

## Structure

- `src/data/` — profile, experience, projects, vault entries. Content lives here, not in components.
- `src/components/sections/` — the page sections (hero, experience, vault, open source, stack).
- `src/components/vault/` — the interactive playgrounds each vault entry renders.
- `src/components/menu/` — the ⌘K menu, its status rotator and theme/reading controls.
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge).

## Credits

The layout and design system are adapted from [colinlienard.com](https://github.com/colinlienard/colinlienard.com)
by Colin Lienard, used under the MIT License:

```
MIT License

Copyright (c) 2026 Colin Lienard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The inline hover-reveal in the hero was inspired by [arlan.me](https://www.arlan.me).
The `Button` component is adapted from the in-house `@workspace/ui` package.

The control rows used by the stash demos (`src/components/ui/Controls.tsx`) adopt
the visual language of [DialKit](https://github.com/joshpuckett/dialkit) by Josh
Puckett, used under the MIT License:

```
MIT License

Copyright (c) 2026 Josh Puckett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Only the shapes are taken — the row height, the full-bleed track with the value as
a filled proportion of it, the bar handle, the segmented Off/On. The palette is
this site's own tokens, and the components are sized to span a content column
rather than a 280px floating panel. The library itself is not a dependency.
