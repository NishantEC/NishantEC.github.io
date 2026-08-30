import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export const FUSED_TAB_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const FUSED_TAB_DURATION = 0.34;

export type FusedTabPosition = { left: number; width: number };

/**
 * Tracks the position and width of the active tab so an indicator can slide
 * between them. Ported from the Builder panel in hushbacks.
 *
 * The measurement trick matters: labels animate between 0 and auto, so
 * measuring mid-flight reads a width that's still moving. Before measuring,
 * every label is forced to its settled width, read synchronously, then
 * restored — so the indicator animates straight to the final geometry.
 *
 * `isLabelVisible` says which labels settle open, since that depends on
 * whether the strip has room for all of them or only the active one.
 */
export function useFusedTabIndicator(
  value: string | null,
  isLabelVisible: (id: string) => boolean,
) {
  const [position, setPosition] = useState<FusedTabPosition | null>(null);
  const positionRef = useRef<FusedTabPosition | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLElement>());
  const labelRefs = useRef(new Map<string, HTMLElement>());

  const sync = useCallback(() => {
    if (!value) return;
    const activeElement = tabRefs.current.get(value);
    if (!activeElement) return;

    const restore: Array<[HTMLElement, string]> = [];
    for (const [labelValue, labelElement] of labelRefs.current) {
      restore.push([labelElement, labelElement.style.width]);
      labelElement.style.width = isLabelVisible(labelValue) ? 'auto' : '0px';
    }

    const settled = { left: activeElement.offsetLeft, width: activeElement.offsetWidth };

    for (const [labelElement, width] of restore) {
      labelElement.style.width = width;
    }

    const previous = positionRef.current;
    if (previous && previous.left === settled.left && previous.width === settled.width) return;

    positionRef.current = settled;
    setPosition(settled);
  }, [value, isLabelVisible]);

  useLayoutEffect(() => {
    sync();

    const listElement = listRef.current;
    const activeElement = value ? tabRefs.current.get(value) : null;
    if (!listElement || !activeElement) return;

    // Re-measure when the pane is resized or a label reflows.
    const observer = new ResizeObserver(sync);
    observer.observe(listElement);
    observer.observe(activeElement);

    return () => observer.disconnect();
  }, [sync, value]);

  return { position, listRef, tabRefs, labelRefs, sync };
}
