/**
 * Shared motion constants.
 *
 * These used to live in `App.tsx`, which every component is reachable from —
 * so importing one created a cycle back to the app entry. A component that only
 * read `EASE` inside its render body survived that, because by then every
 * module has finished evaluating. One that used it to build a module-scope
 * object did not: its body runs part-way through the cycle, before `App.tsx`
 * has reached the `const`, and a `const` in its temporal dead zone throws
 * "Cannot access 'EASE' before initialization".
 *
 * Only dev showed it. The production bundle flattens the graph into one scope
 * and happened to order the declarations so it worked, which is exactly the
 * kind of difference that makes a cycle worth removing rather than working
 * around.
 *
 * This file imports nothing, so it can be a leaf for anyone.
 */

/**
 * Same curve the fused tabs use. Deliberately not a spring: bounce on a
 * container edge reads as cheap, and everything here is one continuous move
 * rather than an object being thrown.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** How long the page takes to compress into the sidebar when a tab opens. */
export const SPLIT_DURATION = 0.44;
