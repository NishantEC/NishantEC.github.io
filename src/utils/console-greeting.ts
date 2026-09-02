import { profile } from '../data/profile';

/**
 * For the people who open devtools on a portfolio — which, for this audience, is
 * most of them. It advertises the two things that aren't discoverable by
 * scrolling: the palette, and that the site is open source.
 *
 * Guarded so it prints once even under StrictMode's double-invoke in dev.
 */
let printed = false;

export const printConsoleGreeting = () => {
  if (printed) return;
  printed = true;

  const heading = [
    'font-family: Georgia, serif',
    'font-style: italic',
    'font-size: 18px',
    'color: #a78bfa',
  ].join(';');

  const body = 'font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.6';

  console.log(
    `%c${profile.name}%c

You found the console. Two things worth knowing:

  ⌘K          search every project, skill and setting
  1…9 / w     switch and close panel tabs

Source: ${profile.socials.github}/NishantEC.github.io
Hiring, or want to build something? ${profile.email}
`,
    heading,
    body,
  );
};
