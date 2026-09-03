import { type DialTheme, Toggle } from 'dialkit';

/**
 * The strip under the clip: what to show, and what to replace it with.
 *
 * These were rows inside the control panel, which put them wherever the panel
 * happened to be — to the right of a portrait clip, underneath a landscape one.
 * They are not settings for the render though; they are what you do to the clip
 * itself, so they belong to the clip and stay directly under it in both
 * layouts, above everything that only changes how it is drawn.
 *
 * The surface is DialKit's, not an approximation of it. `Toggle` is imported
 * straight from the package, and the two buttons carry `dialkit-button` — the
 * `dialkit-root` wrapper is what puts `--dial-surface` and friends in scope for
 * them, since the package defines its variables there rather than globally.
 */
const ClipActions = ({
  theme,
  roundBottomLeft,
  showSource,
  onShowSource,
  onChoose,
  onClear,
}: {
  theme: DialTheme;
  /**
   * True when the rail is laid out beside the clip rather than under it.
   *
   * Only then is this strip the last thing in its column and carrying the
   * card's bottom-left corner. The box around both is deliberately not
   * `overflow-hidden` — that would clip DialKit's select menus — so a square
   * corner here really does poke out of the rounded parent.
   *
   * The rounding is still gated on `sm:` below, because below that breakpoint
   * the card stacks whatever the clip's shape is and the rail lands underneath
   * the strip again.
   */
  roundBottomLeft: boolean;
  showSource: boolean;
  onShowSource: (next: boolean) => void;
  onChoose: () => void;
  onClear: () => void;
}) => (
  <div className="dialkit-root" data-theme={theme}>
    <div
      /* No background of its own. It used to paint `--dial-glass-bg` (#212121),
         which was correct while the panels below were also DialKit cards — they
         are not any more; their own background was stripped so the columns read
         as one surface, and this strip was left as the only lighter band on the
         card. The border stays: it is the only thing that needs to separate the
         clip's own controls from the render's. */
      className={`clip-actions border-border/60 border-t p-2 ${
        roundBottomLeft ? 'sm:rounded-bl-[10px]' : ''
      }`}
    >
      {/* `clip-actions` is the same grid the control panels use — same columns,
          same 6px gutter, one definition in `index.css`. It was a flex row with
          its own gap before, so the three of them lined up with nothing
          underneath. */}
      <Toggle label="Show source" checked={showSource} onChange={onShowSource} />
      {/* "Replace", not "Choose another". By the time this strip exists there
          is already a clip, so the shorter word is not less clear — and the two
          of them fit one line beside a portrait video, where the longer label
          broke across two. `whitespace-nowrap` so neither can break mid-label
          however narrow the column gets; they wrap as whole buttons instead. */}
      <button type="button" className="dialkit-button whitespace-nowrap" onClick={onChoose}>
        Replace
      </button>
      <button type="button" className="dialkit-button whitespace-nowrap" onClick={onClear}>
        Clear
      </button>
    </div>
  </div>
);

export default ClipActions;
