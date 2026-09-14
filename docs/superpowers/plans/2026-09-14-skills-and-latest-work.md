# Skills and Latest Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate two agent skills from three latest-work projects on the home page.

**Architecture:** MDX remains the content source. One pure selection helper resolves named content in display order, and the existing sections use it while retaining all compact/sidebar behavior.

**Tech Stack:** React, TypeScript, Vite, Tailwind, Motion, Node test runner, Biome.

---

### Task 1: Define curated content

**Files:**
- Create: `src/content/featured.ts`
- Create: `tests/featured-content.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
assert.deepEqual(selectBySlug([{ slug: 'neko' }, { slug: 'cterm' }], ['cterm', 'missing']).map((v) => v.slug), ['cterm']);
```

- [ ] **Step 2: Run the test**

Run: `node --test tests/featured-content.test.mjs`

Expected: FAIL because the helper is absent.

- [ ] **Step 3: Implement the helper and curated slugs**

```ts
export const selectBySlug = <T extends { slug: string }>(entries: T[], slugs: string[]) =>
  slugs.flatMap((slug) => entries.find((entry) => entry.slug === slug) ?? []);
export const FEATURED_SKILL_SLUGS = ['video2ascii', 'creating-logos'];
export const LATEST_WORK_SLUGS = ['enform', 'cterm', 'neko'];
```

- [ ] **Step 4: Verify and commit**

Run: `node --test tests/featured-content.test.mjs`

Expected: PASS.

```bash
git add src/content/featured.ts tests/featured-content.test.mjs
git commit -m "feat: define curated portfolio content"
```

### Task 2: Add content routes

**Files:**
- Create: `src/content/skills/creating-logos.mdx`
- Create: `src/content/projects/enform.mdx`
- Create: `src/content/projects/neko.mdx`

- [ ] **Step 1: Add creating-logos as a published skill**

```yaml
title: creating-logos
slug: creating-logos
blurb: Turns a product brief into distinct, usable logo directions with clear rationale.
date: '2026-09-14'
```

- [ ] **Step 2: Add Enform and Neko as projects**

Use Paper-sourced descriptions only: Enform creates branded branching forms and source-linked themes; Neko launches apps, files, agent sessions, and Codex tasks with approvals, follow-ups, scheduling, and activity views. Set their slugs to `enform` and `neko`, with `wip` status and no invented repository URL.

- [ ] **Step 3: Verify MDX schema and commit**

Run: `yarn tsc --noEmit`

Expected: PASS.

```bash
git add src/content/skills/creating-logos.mdx src/content/projects/enform.mdx src/content/projects/neko.mdx
git commit -m "feat: add featured portfolio content"
```

### Task 3: Render separate home sections

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/sections/Skills.tsx`
- Modify: `src/components/sections/SelectedWork.tsx`
- Modify: `src/components/skills/SkillThumb.tsx`
- Modify: `src/components/projects/ProjectThumb.tsx`

- [ ] **Step 1: Preserve the failing missing-entry assertion from Task 1**

Use the same Node test as the regression signal; it proves no empty UI card is created when curated MDX is unavailable.

- [ ] **Step 2: Render only named skills in the full-width Skills slice**

```ts
const featuredSkills = selectBySlug(skills, FEATURED_SKILL_SLUGS);
```

Keep `skills.map` for the compact split-sidebar view. Add a static logo preview for skills with no `demo`.

- [ ] **Step 3: Render Latest Work from named projects only**

```ts
const latestWork = selectBySlug(projects, LATEST_WORK_SLUGS);
```

Replace the hard-coded cards and remove the `Also building` row. Each card opens the existing `project:${project.slug}` panel tab. Add compact Enform and Neko previews to the project thumb map.

- [ ] **Step 4: Place Skills before Latest Work**

```tsx
<Skills />
<SelectedWork />
<Experience />
```

Keep the split sidebar path unchanged.

- [ ] **Step 5: Verify the browser and commit**

Run: `node --test tests/*.test.mjs && yarn tsc --noEmit && yarn biome check src/App.tsx src/components/sections/Skills.tsx src/components/sections/SelectedWork.tsx src/components/skills/SkillThumb.tsx src/components/projects/ProjectThumb.tsx src/content/featured.ts tests/featured-content.test.mjs && git diff --check`

Expected: all checks pass.

At `http://localhost:5175/`, confirm Skills precedes Latest Work; skills shows `video2ascii` and `creating-logos`; Latest Work shows Enform, cterm, and Neko only; each card opens its matching split-panel route.

```bash
git add src/App.tsx src/components/sections/Skills.tsx src/components/sections/SelectedWork.tsx src/components/skills/SkillThumb.tsx src/components/projects/ProjectThumb.tsx
git commit -m "feat: separate skills from latest work"
```

## Self-review

The tasks cover every approved requirement: content routes, ordered separate sections, panel navigation, static or animated previews, missing-content safety, responsive reuse, automated checks, and live-page verification. Names and slugs are consistent with the existing `ProjectMeta` and `SkillMeta` contracts.
