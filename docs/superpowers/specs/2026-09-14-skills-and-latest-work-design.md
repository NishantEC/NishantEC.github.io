# Skills and latest work

## Goal

Make the homepage distinguish reusable agent skills from portfolio projects.
Skills come first as a small, dedicated slice; latest work follows as a separate project showcase.

## Source and visual language

Use the existing portfolio's section labels, surface/border tokens, interactive previews, and split-panel navigation. The local Paper resume's V2 latest-work inventory supplies the project grouping: Enform, cterm, the skills collection, and Neko. The website does not reproduce the resume layout.

## Page structure

Home page order becomes:

1. Hero
2. Skills
3. Latest work
4. Experience
5. Footer

The split-sidebar view keeps its compact skills index behavior; only the full-width home composition changes.

## Skills section

- Rename the existing home-grid presentation to a compact featured Skills slice.
- Show exactly two cards: `video2ascii` and `creating-logos`.
- Each card opens the existing split-panel skill route.
- `creating-logos` is a real content entry with its own MDX route and install command, not an external link or a project card.
- Cards use a shared visual frame; `video2ascii` keeps its real interactive demo. The logo skill gets a lightweight static preview until it has an interactive demo.

## Latest work section

- Replace the current two-item "A few things I've made" section with "Latest work".
- Feature Enform, cterm, and Neko as project cards that open the split panel.
- Use authored MDX project metadata for titles, descriptions, statuses, stacks, and links.
- Do not include skills in this section.
- Retire the inline "Also building" link row because its projects are represented by the portfolio's existing content navigation rather than this curated latest-work set.

## Data and component boundaries

- `src/content/skills/*.mdx` remains the source of truth for skills.
- `src/content/projects/*.mdx` remains the source of truth for projects.
- The Skills section owns selecting the two named skills and rendering their cards.
- The Latest work section owns selecting its named project slugs and rendering project cards.
- Missing or draft content must not leave an empty card or broken opener; each section omits unavailable entries and remains valid with the available cards.

## Accessibility and responsive behavior

- Cards remain semantic buttons with names and descriptions, keyboard-operable through the existing panel opener.
- The two Skills cards stack below the small breakpoint; Latest work uses the existing responsive card grid.
- Preview regions stay decorative (`aria-hidden`) and the card's visible title/description carries its accessible name.

## Verification

- Add focused tests for the curated skill and project selection, including missing-entry behavior.
- Run the repository test suite, TypeScript, targeted Biome checks, and `git diff --check`.
- Verify the full-width home page at the local dev URL: Skills is before Latest work, skills are absent from Latest work, and each visible card opens the expected panel.
