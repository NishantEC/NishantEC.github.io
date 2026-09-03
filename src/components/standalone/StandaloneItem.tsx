import { Link } from 'react-router';
import ArrowLeftIcon from '~icons/heroicons/arrow-left';
import { profile } from '../../data/profile';
import PanelContent from '../panel/PanelContent';
import type { PanelTab } from '../panel/PanelProvider';

/**
 * How a shared link renders: the item on its own, and nothing else.
 *
 * The split view is a workspace — several things open at once, an index down
 * the left — and it only makes sense to whoever opened those tabs. Someone
 * arriving from a link outside wants the one thing the link named, so the tabs
 * are reserved for navigation that happens inside the app and a fresh load
 * always lands here.
 *
 * There is still no header or footer. The page is the project. What it has now
 * is one way out: a page reached from a link somewhere else used to be a dead
 * end unless you knew the command palette was mounted, which nobody arriving
 * from outside does.
 *
 * The body is the same `PanelContent` the pane renders, so an item can never
 * look like two different things depending on how it was reached. Only the
 * frame around it differs — and the title is an `h1` here, where in the pane it
 * must be an `h2` because the sidebar already carries the page's `h1`.
 */
const StandaloneItem = ({ tab }: { tab: PanelTab }) => (
  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-fg/20 scrollbar-track-transparent">
    <main className="w-full px-6 pt-16 pb-24 sm:px-10 sm:pt-24">
      {/* On the reading column's left edge, so it lines up with the title and
          the prose rather than floating in the margin.

          A `Link` to `/`, not a history `back()`. Someone who opened this from
          a post or a message has no history to go back to, and the button has
          to work the same for them as for a reader who came from the home page.

          It names the destination rather than saying "back", for the same
          reason: back implies a previous page, and there often isn't one. */}
      <div className="mx-auto mb-8 w-full max-w-2xl">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-muted text-sm outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="grid size-7 place-items-center rounded-full bg-fg/6 transition-colors group-hover:bg-fg/10">
            <ArrowLeftIcon className="size-3.5" />
          </span>
          {profile.name}
        </Link>
      </div>

      <h1 className="mx-auto mb-5 w-full max-w-2xl font-display text-3xl italic leading-tight tracking-[-0.6px]">
        {tab.title}
      </h1>
      <PanelContent tab={tab} />
    </main>
  </div>
);

export default StandaloneItem;
