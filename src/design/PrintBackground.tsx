import { GrainGradient } from '@paper-design/shaders-react';
import { useDesign, useResolvedTheme } from './design';

/**
 * The hero's background: a still grain gradient, like a photographic print.
 *
 * Follows docs/design/background-principles.md: one frame (`speed 0`), tones a
 * few percent lighter than the page in the same hue, confined to the hero and
 * faded out at the bottom, no pointer interaction. Paper Shaders pauses when
 * hidden, and with speed 0 there is no animation loop at all.
 */
const TONES = {
  enform: {
    dark: ['#0b1222', '#0f1729', '#141d32', '#1a243c'],
    light: ['#5b9cf0', '#629ff0', '#6aa5f1', '#73abf2'],
  },
  current: {
    dark: ['#1b1918', '#211e1c', '#282421', '#302a26'],
    light: ['#fafaf9', '#f3f2f0', '#ecebe8', '#e4e2de'],
  },
} as const;

const PrintBackground = () => {
  const { background, palette } = useDesign();
  const theme = useResolvedTheme();
  if (background !== 'print') return null;

  const [back, ...colors] = TONES[palette][theme];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[820px] animate-[fade-in_700ms_linear] [mask-image:linear-gradient(#000_55%,transparent)]"
    >
      <GrainGradient
        style={{ width: '100%', height: '100%' }}
        colorBack={back}
        colors={[...colors]}
        softness={0.7}
        intensity={0.15}
        noise={0.5}
        shape="wave"
        speed={0}
      />
    </div>
  );
};

export default PrintBackground;
