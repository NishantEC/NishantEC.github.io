import { usePanel } from './usePanel';

/**
 * True while the pane is open. Sections use it to swap their full-width prose
 * for a condensed index, since the sidebar is far too narrow to read paragraphs in.
 */
export const useCompact = () => usePanel().tabs.length > 0;
