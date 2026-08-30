# gyro-tetris — archived

Pulled out of the app, not deleted. Neither file was ever committed, so removing
them would have been permanent.

A Tetris variant where gravity is pinned to world-down and the *well* rotates,
dragged by a bubble on a ring. Built on matter-js: a falling tetromino is one
compound body that becomes four loose cubes the moment it lands, so rows can be
taken apart.

## Why it was pulled

Not bugs — the physics was measured and working. Two design problems:

- **No pressure.** Free 360° rotation means you can always turn the well so a
  piece lands where you want, and flatten a dangerous stack by spinning.
- **Rows rarely complete.** Loose physics cubes never align to a grid, so the
  "row is ≥9 of 10 columns covered" rule fires unpredictably. Line clearing may
  be the wrong goal for a physics stack at all.

A game designer's verdict was to cut the top wall and turn it into a
containment game — keep a bucket under a tap without spilling — replacing line
clears with Puyo-style same-colour groups. That was never built.

## Restoring it

```sh
mv archive/gyro-tetris/GyroTetris.tsx src/components/stash/
mv archive/gyro-tetris/gyro-tetris.mdx src/content/stash/
```

Then re-add three bits of wiring:

1. `src/content/schema.ts` — put `'gyro'` back in `StashMeta['demo']`.
2. `src/components/panel/PanelContent.tsx` — lazy-import the component and
   render it for `entry.demo === 'gyro'`, inside `-mx-6 sm:-mx-10` so the dial
   escapes the reading column.
3. `src/components/stash/StashThumb.tsx` — a preview for the `gyro` case.

`matter-js` is still in `package.json`. It is unreferenced while this is
archived, so nothing bundles it — but it is also the only thing that needs it.
`yarn remove matter-js @types/matter-js` if you want it gone, and
`yarn add matter-js && yarn add -D @types/matter-js` to bring it back.
