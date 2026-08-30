import { useEffect } from 'react';
import { usePanel } from './usePanel';

/**
 * Keyboard control for the pane.
 *
 *   1…9   focus the nth tab
 *   w     close the active tab
 *   Esc   close every tab and return to the page
 *
 * Deliberately unmodified keys. The editor-native choices — ⌘W, ⌘1-9 — are
 * reserved by the browser itself and `preventDefault` does not reclaim them, so
 * binding them would produce a shortcut that silently closes the browser tab
 * instead. Single letters are what Linear, GitHub and Superhuman use for the
 * same reason, and they cost nothing as long as typing is excluded.
 */
const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  );
};

export const usePanelShortcuts = () => {
  const { tabs, activeId, close, closeAll, focus } = usePanel();

  useEffect(() => {
    if (tabs.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // A modifier means the user is reaching for something else — a browser
      // shortcut, or ⌘K for the palette, which owns its own handler.
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      // The palette is modal; while it's up it owns the keyboard.
      if (document.querySelector('[role="dialog"]')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeAll();
        return;
      }

      if (e.key === 'w' && activeId) {
        e.preventDefault();
        close(activeId);
        return;
      }

      if (e.key >= '1' && e.key <= '9') {
        const tab = tabs[Number(e.key) - 1];
        if (!tab) return;
        e.preventDefault();
        focus(tab.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tabs, activeId, close, closeAll, focus]);
};
