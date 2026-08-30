/**
 * Progressive blur strip at the top of the viewport. Each layer masks off
 * earlier than the one below it, so the blur ramps up rather than cutting in.
 */
const LAYERS = [
  { blur: 'backdrop-blur-[1px]', mask: 'black 0%, black 85%, transparent 100%' },
  { blur: 'backdrop-blur-xs', mask: 'black 0%, black 55%, transparent 80%' },
  { blur: 'backdrop-blur-sm', mask: 'black 0%, black 30%, transparent 55%' },
  { blur: 'backdrop-blur-lg', mask: 'black 0%, black 12%, transparent 32%' },
];

const BlurGradient = () => (
  <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-32">
    <div className="absolute inset-0 bg-linear-to-b from-bg to-transparent" />
    {LAYERS.map((layer) => (
      <div
        key={layer.mask}
        className={`absolute inset-0 ${layer.blur}`}
        style={{
          maskImage: `linear-gradient(to bottom, ${layer.mask})`,
          WebkitMaskImage: `linear-gradient(to bottom, ${layer.mask})`,
        }}
      />
    ))}
  </div>
);

export default BlurGradient;
