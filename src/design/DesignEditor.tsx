import 'dialkit/styles.css';
import { useDialKitController } from 'dialkit';
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DialPanel from '../components/skills/DialPanel';
import { DESIGN, designStore, LIVE, useResolvedTheme } from './design';

/**
 * The design editor: a floating DialKit panel over the real page.
 *
 * Only mounted in dev or with `?design` in the URL (see App), so visitors never
 * load it. It renders through `DialPanel` rather than `DialRoot` because the
 * root draws every registered panel, and the ASCII skill on this page registers
 * three of its own.
 *
 * Defaults are the decided design. `View live site` swaps the whole page back
 * to what is deployed today without losing the edits, for an honest
 * before/after.
 */
const DesignEditor = () => {
  const theme = useResolvedTheme();
  const dial = useDialKitController(
    'Design',
    useMemo(
      () => ({
        palette: {
          type: 'select' as const,
          options: ['enform', 'current'],
          default: DESIGN.palette,
        },
        background: {
          type: 'select' as const,
          options: ['print', 'none'],
          default: DESIGN.background,
        },
        surface: {
          type: 'select' as const,
          options: ['glass', 'current'],
          default: DESIGN.surface,
        },
        radius: [DESIGN.radius, 8, 32, 1] as [number, number, number, number],
        statusPill: DESIGN.statusPill,
        headings: {
          type: 'select' as const,
          options: ['current', 'numbered', 'plain', 'title'],
          default: DESIGN.headings,
        },
        viewLive: false,
      }),
      [],
    ),
    useMemo(() => ({ id: 'design' }), []),
  );

  const { viewLive, ...values } = dial.values;

  useEffect(() => {
    designStore.set(
      viewLive
        ? LIVE
        : {
            palette: values.palette as typeof DESIGN.palette,
            background: values.background as typeof DESIGN.background,
            surface: values.surface as typeof DESIGN.surface,
            radius: values.radius,
            statusPill: values.statusPill,
            headings: values.headings as typeof DESIGN.headings,
          },
    );
  }, [
    viewLive,
    values.palette,
    values.background,
    values.surface,
    values.radius,
    values.statusPill,
    values.headings,
  ]);

  return createPortal(
    <div className="fixed right-4 bottom-4 z-[100] w-72 drop-shadow-2xl">
      <DialPanel id="design" title="Design" theme={theme} />
    </div>,
    document.body,
  );
};

export default DesignEditor;
