import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import ArrowLeftIcon from '~icons/heroicons/arrow-left';
import { EASE } from '../../utils/motion';
import FusedTabs from './FusedTabs';
import PanelContent from './PanelContent';
import SidebarToggleIcon from './SidebarToggleIcon';
import { usePanel } from './usePanel';

/**
 * The open-item pane. In split mode the landing page compresses into the
 * sidebar on the left and this takes the remaining width; closing every tab
 * returns the page to its full-width layout.
 */
const SplitPane = ({ duration }: { duration: number }) => {
  const {
    tabs,
    activeId,
    close,
    closeAll,
    focus,
    setSidebar,
    isResizing,
    setIsResizing,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = usePanel();
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[tabs.length - 1];

  const headingRef = useRef<HTMLHeadingElement>(null);

  // Changing the document title doesn't announce in a SPA, so the pane says so
  // itself and takes focus with it.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: PointerEvent) => setSidebar((e.clientX / window.innerWidth) * 100);
    const stop = () => setIsResizing(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, setSidebar, setIsResizing]);

  if (!activeTab) return null;

  return (
    // The pane doesn't slide — the sidebar is already moving, and two things
    // travelling at once is what made the earlier version feel busy. It just
    // resolves in place.
    //
    // The fade used to wait for the width to settle, but the card-to-pane morph
    // lands inside that window, so a delayed fade meant the morph happened
    // behind an invisible panel. It now arrives immediately and quickly, and the
    // morph reads through it.
    <motion.div
      className="flex min-w-0 flex-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration * 0.4, ease: EASE }}
    >
      {/* Drag handle. Hidden on small screens, where the pane goes full-width,
          and while collapsed, when there is nothing left to drag. */}
      <button
        type="button"
        aria-label="Resize sidebar"
        onPointerDown={() => setIsResizing(true)}
        className={`group relative w-px shrink-0 cursor-col-resize border-0 bg-border p-0 max-lg:hidden ${
          isSidebarCollapsed ? 'hidden' : ''
        }`}
      >
        <span className="absolute inset-y-0 -left-2 w-4" />
        <span
          className={`absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
            isResizing ? 'bg-fg/40' : 'bg-transparent group-hover:bg-fg/25'
          }`}
        />
      </button>

      <section aria-label="Open item" className="flex min-w-0 flex-1 flex-col">
        <p aria-live="polite" className="sr-only">
          {activeTab.title} opened in the panel
        </p>

        <div className="flex items-end gap-1 pr-2">
          <button
            type="button"
            onClick={closeAll}
            aria-label="Back to page"
            className="mb-1 ml-2 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-fg/6 hover:text-fg lg:hidden"
          >
            <ArrowLeftIcon className="size-4.5" />
          </button>

          {/* Sits where the mobile back arrow does, in the slot the tabs leave
              empty on wide screens. `aria-expanded` refers to the sidebar it
              controls, and the glyph carries that same state visually — its
              left column is filled while the sidebar is there — so the button
              no longer has to be clicked to find out which way it goes.

              It carries a fill at rest, which is the one thing in this strip
              that does. That is the point: tabs are transient and earn their
              fill on hover, but this is permanent chrome, and drawn the same
              way it read as a tab that had lost its label. The fill is the
              distinction. It deliberately isn't a stroke — a bordered box here
              would be a third ring around a glyph that is already a rounded
              rectangle.

              The fill is `--panel`, the exact colour the active tab is filled
              with, so the button is cut from the pane's material rather than
              the strip's. Hover is carried by the glyph alone: lightening the
              fill would break that match on the one interaction where the
              button is being compared to the tab beside it. */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            aria-expanded={!isSidebarCollapsed}
            aria-label={isSidebarCollapsed ? 'Show profile sidebar' : 'Hide profile sidebar'}
            className="mb-1 ml-2 grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--panel)] text-muted outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-accent max-lg:hidden"
          >
            <SidebarToggleIcon collapsed={isSidebarCollapsed} className="size-4.5" />
          </button>

          <FusedTabs tabs={tabs} activeId={activeTab.id} onSelect={focus} onClose={close} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-fg/20 scrollbar-track-transparent bg-[var(--panel)]">
          <motion.div
            key={activeTab.id}
            className="w-full p-6 pb-32 sm:p-10 sm:pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: [0.33, 1, 0.68, 1] }}
          >
            {/* h2, not h1 — the page's h1 is the name in the sidebar, and both
                are on screen at once in split mode.

                Focused on open: the pane mounts after the sidebar in the DOM, so
                without this a keyboard user would have to tab through every
                remaining row to reach what they just opened, with nothing said
                about it. `tabIndex={-1}` makes it programmatically focusable
                without adding a tab stop. */}
            {/* The reading width lives on the prose, not the pane, so a demo
                can use the full column and still sit centred in it. */}
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mx-auto mb-5 w-full max-w-2xl font-display text-3xl leading-tight tracking-[-0.6px] italic outline-none"
            >
              {activeTab.title}
            </h2>
            <PanelContent tab={activeTab} />
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
};

export default SplitPane;
