import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Route, Routes, useLocation, useParams } from 'react-router';
import Menu from './components/menu/Menu';
import CommandPalette from './components/palette/CommandPalette';
import PanelRouteSync, { isKnownPath, tabFromPath } from './components/panel/PanelRouteSync';
import SplitPane from './components/panel/SplitPane';
import { usePanel } from './components/panel/usePanel';
import { usePanelShortcuts } from './components/panel/usePanelShortcuts';
import Experience from './components/sections/Experience';
import Hero from './components/sections/Hero';
import OpenSource from './components/sections/OpenSource';
import Stack from './components/sections/Stack';
import Stash from './components/sections/Stash';
import StandaloneItem from './components/standalone/StandaloneItem';
import BlurGradient from './components/ui/BlurGradient';
import SectionSpine from './components/ui/SectionSpine';
import { projects, stash } from './content/collections';
import NotFound from './pages/NotFound';
import { EASE, SPLIT_DURATION } from './utils/motion';

const Page = ({ isSplit, duration }: { isSplit: boolean; duration: number }) => {
  // Numbering follows what actually renders, asked of the collections rather
  // than hardcoded. A section with no entries renders nothing, so counting it
  // anyway leaves a hole — with every entry drafted the page read "01
  // experience" and then "04 stack".
  //
  // The sidebar carries only what's navigable: Experience and Stack are
  // read-only detail that nothing in the pane links to, so at that width they
  // cost space without earning it.
  const present = [
    ...(stash.length > 0 ? ['stash'] : []),
    ...(projects.length > 0 ? ['projects'] : []),
  ];

  const numbered = isSplit ? present : ['experience', ...present, 'stack'];

  const indexOf = (id: string) => {
    const at = numbered.indexOf(id);
    return at === -1 ? undefined : at + 1;
  };

  return (
    <>
      <Hero />

      {/* Experience collapses rather than vanishing, so the sections below
          travel with the width change instead of jumping when it unmounts. */}
      <AnimatePresence initial={false}>
        {!isSplit && (
          <motion.div
            key="experience"
            className="flex w-full flex-col items-center overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration, ease: EASE },
              opacity: { duration: duration * 0.5, ease: EASE },
            }}
          >
            <Experience index={indexOf('experience')} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same order in both states, so nothing swaps places mid-animation —
          the sidebar is the page with two sections lifted out. In the sidebar
          they share one spine, which is why they need a wrapper there. */}
      {isSplit ? (
        <SectionSpine>
          <Stash index={indexOf('stash')} />
          <OpenSource index={indexOf('projects')} />
        </SectionSpine>
      ) : (
        <>
          <Stash index={indexOf('stash')} />
          <OpenSource index={indexOf('projects')} />
          <Stack index={indexOf('stack')} />
        </>
      )}
    </>
  );
};

/**
 * Renders the page only when the slug actually resolves to something. An
 * unknown slug is a 404, and NotFound then suggests the nearest real routes —
 * which is what someone arriving from a stale link needs.
 */
const ItemRoute = ({
  kind,
  ...page
}: {
  kind: 'project' | 'stash';
  isSplit: boolean;
  duration: number;
}) => {
  const { slug } = useParams();

  const exists =
    kind === 'project'
      ? projects.some((project) => project.slug === slug)
      : stash.some((item) => item.slug === slug);

  return exists ? <Page {...page} /> : <NotFound />;
};

/**
 * Whether this URL should render as a shared document rather than as the app.
 * True for an item path with nothing open — which is every fresh load, since
 * the tab set is no longer restored.
 */
const useStandalone = (isSplit: boolean) => {
  const { pathname } = useLocation();
  if (isSplit || pathname === '/') return null;
  return tabFromPath(pathname);
};

function App() {
  const { tabs, sidebar, isResizing, isSidebarCollapsed } = usePanel();
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();

  // A URL that resolves to nothing exits the split layout entirely: the 404
  // takes the full width, with no sidebar to be squeezed into and no pane
  // showing an item the URL doesn't name. The open tabs stay in state, so
  // leaving the 404 restores the split view exactly as it was.
  const isSplit = tabs.length > 0 && isKnownPath(pathname);
  const standalone = useStandalone(isSplit);

  usePanelShortcuts();

  const duration = reduceMotion ? 0 : SPLIT_DURATION;
  // Dragging must track the pointer exactly — any easing there feels like lag.
  const widthTransition = isResizing ? { duration: 0 } : { duration, ease: EASE };

  // A shared link renders as a document, not as the app. The palette stays —
  // it is how a visitor discovers there is more here than the one page — but
  // the floating menu does not, because its job is scrolling a page this view
  // doesn't have.
  if (standalone) {
    return (
      <div className="h-dvh overflow-hidden">
        <PanelRouteSync />
        <StandaloneItem tab={standalone} />
        <CommandPalette />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <PanelRouteSync />

      {/* The only element that actually moves. Everything else reflows inside
          it, which is why nothing else needs its own layout animation. */}
      {/* `inert` while collapsed, not just zero-width: a 0% column still keeps
          its links in the tab order and in the accessibility tree, so a
          keyboard user would tab through a sidebar nobody can see. */}
      <motion.div
        inert={isSplit && isSidebarCollapsed}
        className={`min-w-0 overflow-y-auto scrollbar-thin scrollbar-thumb-fg/20 scrollbar-track-transparent ${
          isSplit ? 'max-lg:hidden' : ''
        }`}
        style={{ flex: '0 0 auto' }}
        initial={false}
        animate={{ width: isSplit ? (isSidebarCollapsed ? '0%' : `${sidebar}%`) : '100%' }}
        transition={widthTransition}
      >
        {!isSplit && <BlurGradient />}

        {/* The landing top padding is tuned for a full-width composition and is
            far too much in a 340px column, so the sidebar pulls itself up by a
            negative margin rather than overriding the padding — that keeps the
            responsive `sm:` step intact and still animates. */}
        <motion.main
          className="flex flex-col items-center px-8 pt-40 pb-24 sm:pt-48"
          initial={false}
          animate={{ gap: isSplit ? '3rem' : '7rem', marginTop: isSplit ? '-6.5rem' : '0rem' }}
          transition={{ duration, ease: EASE }}
        >
          <Routes>
            {/* The item routes are guarded, not just matched. `/project/:slug`
                accepts any slug, so without the guard a typo returned the home
                page under a wrong URL instead of a 404. */}
            <Route path="/" element={<Page isSplit={isSplit} duration={duration} />} />
            <Route
              path="/project/:slug"
              element={<ItemRoute kind="project" isSplit={isSplit} duration={duration} />}
            />
            <Route
              path="/stash/:slug"
              element={<ItemRoute kind="stash" isSplit={isSplit} duration={duration} />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.main>
      </motion.div>

      <AnimatePresence>{isSplit && <SplitPane key="pane" duration={duration} />}</AnimatePresence>

      <Menu />
      <CommandPalette />
    </div>
  );
}

export default App;
