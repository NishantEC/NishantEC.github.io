import { useEffect, useState } from 'react';

/** Progressive blur strips that only appear where a page has more content. */
const LAYERS = [
  { blur: 'backdrop-blur-[1px]', mask: 'black 0%, black 85%, transparent 100%' },
  { blur: 'backdrop-blur-xs', mask: 'black 0%, black 55%, transparent 80%' },
  { blur: 'backdrop-blur-sm', mask: 'black 0%, black 30%, transparent 55%' },
  { blur: 'backdrop-blur-lg', mask: 'black 0%, black 12%, transparent 32%' },
];

type ScrollMetrics = Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'>;

export const getScrollFadeVisibility = ({
  scrollTop,
  scrollHeight,
  clientHeight,
}: ScrollMetrics) => {
  const maximumScroll = Math.max(0, scrollHeight - clientHeight);
  return { top: scrollTop > 1, bottom: scrollTop < maximumScroll - 1 };
};

/**
 * Edge fades for the document scroller. Hidden on touch screens: there the
 * browser's own bars already soften the edges (iOS 26 Safari draws the page
 * under its glass toolbar), and a fixed strip would sit on top of them.
 */
const BlurGradient = () => {
  const [visibility, setVisibility] = useState({ top: false, bottom: false });

  useEffect(() => {
    const doc = document.documentElement;
    const updateVisibility = () => setVisibility(getScrollFadeVisibility(doc));
    const resizeObserver = new ResizeObserver(updateVisibility);
    resizeObserver.observe(document.body);
    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateVisibility);
    };
  }, []);

  return (
    <>
      {visibility.top && <BlurStrip edge="top" />}
      {visibility.bottom && <BlurStrip edge="bottom" />}
    </>
  );
};

const BlurStrip = ({ edge }: { edge: 'top' | 'bottom' }) => {
  const isTop = edge === 'top';
  const direction = isTop ? 'to bottom' : 'to top';

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 pointer-coarse:hidden ${isTop ? 'top-0' : 'bottom-0'} z-40 h-16`}
    >
      <div
        className={`blur-tint absolute inset-0 ${isTop ? 'bg-linear-to-b' : 'bg-linear-to-t'} from-bg to-transparent`}
      />
      {LAYERS.map((layer) => (
        <div
          key={layer.mask}
          className={`absolute inset-0 ${layer.blur}`}
          style={{
            maskImage: `linear-gradient(${direction}, ${layer.mask})`,
            WebkitMaskImage: `linear-gradient(${direction}, ${layer.mask})`,
          }}
        />
      ))}
    </div>
  );
};

export default BlurGradient;
