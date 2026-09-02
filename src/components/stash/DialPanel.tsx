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
  values,
  theme,
}: {
  /** The `id` passed to `useDialKitController`, not its display name. */
  id: string;
  title: string;
  /** The controller's live values — already reactive, so this needs no second subscription. */
  values: Record<string, DialValue>;
  theme: DialTheme;
}) => {
  const [controls, setControls] = useState<ControlMeta[] | null>(null);

  // Registration happens in the controller's own effect, so the panel does not
  // exist on the first render and cannot simply be read during it. The global
  // subscription is also what picks up a config that changes shape — which is
  // how the playground gets a `density` control the demo never registers.
  useEffect(() => {
    const read = () => setControls(DialStore.getPanel(id)?.controls ?? null);
    read();
    return DialStore.subscribeGlobal(read);
  }, [id]);

  if (!controls) return null;

  return (
    <div className="dialkit-root" data-mode="inline" data-theme={theme}>
      <div className="dialkit-panel" data-mode="inline">
        <Folder title={title} defaultOpen isRoot inline panelHeightOffset={2}>
          <ControlRenderer panelId={id} controls={controls} values={values} />
        </Folder>
      </div>
    </div>
  );
};

export default DialPanel;
