/**
 * A pot with steam, for the wait while a clip is being baked.
 *
 * It replaced a determinate progress bar, which is a downgrade in information
 * and was the right call anyway: the bar advanced in four jumps — decode,
 * sample, find the subject, bake — so it spent most of its life apparently
 * stuck, and a bar that does not move is worse than no bar. This makes no claim
 * about how far along anything is. It only says the tab is busy, which is the
 * one thing that was ever true between those jumps.
 *
 * Stroke-only and `currentColor`, so it inherits whatever the label beside it
 * is set in and needs no palette of its own.
 *
 * The three wisps are staggered rather than synchronised — steam that pulses in
 * unison reads as a blinking icon rather than something rising.
 */
const CookingGlyph = () => (
  <svg
    viewBox="0 0 32 32"
    className="size-8 text-muted"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    // Decorative. The band beside it is an `aria-live` region already
    // announcing the state, and a `role="img"` labelled "Working" made a screen
    // reader say the wait twice, in two different words.
    aria-hidden="true"
  >
    {/* Drawn behind the pot so a wisp leaving the top passes under the rim
        rather than crossing it. */}
    <g className="steam">
      <path className="steam-1" d="M12 13c1.6-1.2-1.6-2.8 0-4" />
      <path className="steam-2" d="M16 12c1.6-1.2-1.6-3.2 0-4.6" />
      <path className="steam-3" d="M20 13c1.6-1.2-1.6-2.8 0-4" />
    </g>

    {/* Rim wider than the body, which is what makes it read as a pot at 32px
        rather than a bucket. */}
    <path d="M5 18h22" />
    <path d="M7.5 18v4.5A4.5 4.5 0 0 0 12 27h8a4.5 4.5 0 0 0 4.5-4.5V18" />
    {/* Handles. */}
    <path d="M7.5 20.5h-2M24.5 20.5h2" />
  </svg>
);

export default CookingGlyph;
