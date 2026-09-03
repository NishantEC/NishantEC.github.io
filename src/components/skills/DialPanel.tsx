import {
  type ControlMeta,
  ControlRenderer,
  DialStore,
  type DialTheme,
  type DialValue,
  Folder,
} from 'dialkit';
import { useEffect, useState } from 'react';

/**
 * One DialKit panel, rendered where it belongs.
 *
 * `DialRoot` renders the *whole registry* — every panel any hook on the page
 * has registered, stacked into one container. That is the right default for a
 * floating dev panel, and wrong the moment two panels are on screen at once
 * beside the things they control: this page has a demo and a playground, and
 * each `DialRoot` drew both sets of controls, so the demo's rail showed a
 * `density` select belonging to the playground — the exact control the demo is
 * meant not to have.
 *
 * There is no way to scope a root to one panel, so this rebuilds the small part
 * of it that matters, from DialKit's own exports: the same `dialkit-root` /
 * `dialkit-panel` wrappers its stylesheet targets, the same `Folder` chrome, and
 * `ControlRenderer` for the controls themselves. Nothing here reimplements a
 * control — the widgets are still DialKit's, so they stay in step with the
 * package.
 *
 * What is dropped is the preset toolbar (`Version 1`, save, reset). It belongs
 * to a tool you are configuring across sessions, not to a demo that should look
 * the same to every reader who opens it.
 */
const DialPanel = ({
  id,
  title,
  theme,
  mono = false,
}: {
  /** The `id` passed to `useDialKitController`, not its display name. */
  id: string;
  title: string;
  theme: DialTheme;
  /**
   * Sets this panel's dropdowns in the monospace stack.
   *
   * The ramp options *are* character ramps, so they have to be measured in the
   * font that will draw them — in system-ui they render proportionally and a
   * ramp stops looking like an even run. Scoped to one panel because DialKit
   * portals a dropdown into its own `.dialkit-root`, which is this element.
   */
  mono?: boolean;
}) => {
  const [controls, setControls] = useState<ControlMeta[] | null>(null);
  /**
   * Values come from the store rather than from the controller.
   *
   * `ControlRenderer` looks each control up by its *dotted path* — `colour.ink`
   * once the config is grouped into folders — and the controller hands back the
   * nested shape instead. `DialStore.getValues` is already the flat map keyed
   * that way, so reading it here is both correct and one less thing for the
   * caller to get right.
   */
  const [values, setValues] = useState<Record<string, DialValue>>({});

  // Registration happens in the controller's own effect, so the panel does not
  // exist on the first render and cannot simply be read during it. The global
  // subscription is also what picks up a config that changes shape — which is
  // how the playground gets a `density` control the demo never registers.
  useEffect(() => {
    const read = () => {
      setControls(DialStore.getPanel(id)?.controls ?? null);
      setValues(DialStore.getValues(id));
    };
    read();
    // Two subscriptions: the global one fires when a panel registers or its
    // config changes shape, the panel one when a value moves. Neither covers
    // the other.
    const stopGlobal = DialStore.subscribeGlobal(read);
    const stopPanel = DialStore.subscribe(id, read);
    return () => {
      stopGlobal();
      stopPanel();
    };
  }, [id]);

  if (!controls) return null;

  return (
    <div
      // `role="group"` with the title as its label. The heading is hidden in
      // CSS because the columns carry the grouping visually — but that only
      // groups anything for someone who can see the columns, and without this
      // the three panels read as one flat run of eleven controls.
      role="group"
      aria-label={title}
      className={`dialkit-root${mono ? ' dial-mono' : ''}`}
      data-mode="inline"
      data-theme={theme}
    >
      <div className="dialkit-panel" data-mode="inline">
        <Folder title={title} defaultOpen isRoot inline panelHeightOffset={2}>
          <ControlRenderer panelId={id} controls={controls} values={values} />
        </Folder>
      </div>
    </div>
  );
};

export default DialPanel;
