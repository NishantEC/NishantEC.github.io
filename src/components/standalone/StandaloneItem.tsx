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
 * There is deliberately no header or footer. The page is the project. The
 * trade is that a visitor has no visible route to the rest of the site; the
 * command palette is still mounted, so it is not a dead end, but it is not
 * advertised either.
 *
 * The body is the same `PanelContent` the pane renders, so an item can never
 * look like two different things depending on how it was reached. Only the
 * frame around it differs — and the title is an `h1` here, where in the pane it
 * must be an `h2` because the sidebar already carries the page's `h1`.
 */
const StandaloneItem = ({ tab }: { tab: PanelTab }) => (
  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-fg/20 scrollbar-track-transparent">
    <main className="w-full px-6 pt-16 pb-24 sm:px-10 sm:pt-24">
      <h1 className="mx-auto mb-5 w-full max-w-2xl font-display text-3xl italic leading-tight tracking-[-0.6px]">
        {tab.title}
      </h1>
      <PanelContent tab={tab} />
    </main>
  </div>
);

export default StandaloneItem;
