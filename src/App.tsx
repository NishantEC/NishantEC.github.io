import { useRef } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router';
import CommandPalette from './components/palette/CommandPalette';
import PanelRouteSync, { tabFromPath } from './components/panel/PanelRouteSync';
import Experience from './components/sections/Experience';
import Hero from './components/sections/Hero';
import HomeFooter from './components/sections/HomeFooter';
import SelectedWork from './components/sections/SelectedWork';
import Skills from './components/sections/Skills';
import StandaloneItem from './components/standalone/StandaloneItem';
import BlurGradient from './components/ui/BlurGradient';
import { projects, skills } from './content/collections';
import NotFound from './pages/NotFound';

const Page = () => (
  <>
    <Hero />
    <Skills />
    <SelectedWork />
    <Experience />
    <HomeFooter />
  </>
);

/**
 * Renders the page only when the slug actually resolves to something. An
 * unknown slug is a 404, and NotFound then suggests the nearest real routes —
 * which is what someone arriving from a stale link needs.
 */
const ItemRoute = ({ kind }: { kind: 'project' | 'skill' }) => {
  const { slug } = useParams();

  const exists =
    kind === 'project'
      ? projects.some((project) => project.slug === slug)
      : skills.some((item) => item.slug === slug);

  return exists ? <Page /> : <NotFound />;
};

/**
 * Whether this URL should render as a shared document rather than as the app.
 * True for an item path with nothing open — which is every fresh load, since
 * the tab set is no longer restored.
 */
const useStandalone = () => {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  return tabFromPath(pathname);
};

function App() {
  const pageScrollerRef = useRef<HTMLDivElement>(null);
  const standalone = useStandalone();

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

      <div
        ref={pageScrollerRef}
        className="min-w-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-fg/20 scrollbar-track-transparent"
      >
        <BlurGradient scrollContainerRef={pageScrollerRef} />

        {/* The landing top padding is tuned for a full-width composition and is
            far too much in a 340px column, so the sidebar pulls itself up by a
            negative margin rather than overriding the padding — that keeps the
            responsive `sm:` step intact and still animates. */}
        <main
          className="flex flex-col items-center px-8 pt-20 pb-12 sm:pt-28"
          style={{ gap: '4.5rem' }}
        >
          <Routes>
            {/* The item routes are guarded, not just matched. `/project/:slug`
                accepts any slug, so without the guard a typo returned the home
                page under a wrong URL instead of a 404. */}
            <Route path="/" element={<Page />} />
            <Route path="/project/:slug" element={<ItemRoute kind="project" />} />
            <Route path="/skills/:slug" element={<ItemRoute kind="skill" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

export default App;
