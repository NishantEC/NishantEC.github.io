/**
 * The sidebar toggle's glyph: a pane with its left column filled while the
 * sidebar is showing, hollow once it's collapsed.
 *
 * It replaced `heroicons/bars-3-bottom-left`, which was wrong twice. The three
 * ragged lines are the text-align icon everywhere else they appear, so the
 * button read as a formatting control rather than a pane; and it drew the same
 * marks in both states, which left `aria-expanded` as the only thing saying
 * whether the sidebar was there. A sighted user had to click it to find out
 * which way it went.
 *
 * The filled column is the state. It is a picture of the layout, so it says
 * what the button does *and* what the button already did, without a second
 * icon to swap to or a rotation to read.
 *
 * Drawn to the same spec as the heroicons around it — 24 box, 1.5 stroke,
 * round joins — because it sits beside them in the same strip and any
 * difference in weight would show.
 */
const SidebarToggleIcon = ({
  collapsed,
  ...props
}: { collapsed: boolean } & { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Drawn before the strokes so the outline and the divider sit on top of
        the fill rather than being half-covered by it. Its own rounded left
        corners follow the pane's, so the two curves are concentric where they
        overlap instead of one cutting a flat edge across the other. */}
    <path
      d="M9.5 5H5.5A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19h4z"
      fill="currentColor"
      stroke="none"
      className={`transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}
    />
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M9.5 5v14" />
  </svg>
);

export default SidebarToggleIcon;
