import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import flight from '../../assets/skills/butterfly-flight.json';
import { useFrameClock } from '../../utils/useFrameClock';

/**
 * The video2ascii butterfly, large, flying across its card.
 *
 * The frames come from butterfly.mp4, tracked on a smoothed path so the
 * butterfly sits still in its own box and only its wings move. The source
 * butterfly drifts across the clip; the card animation supplies that flight
 * instead, so it can be paced to the slide. Source frames 32 to 81 loop with
 * almost no seam, which is where the wingbeat is taken from.
 */
const ROWS = flight.frames[0].split('\n').length;

const FlyingAscii = ({ active, duration }: { active: boolean; duration: number }) => {
  const reducedMotion = useReducedMotion();
  const text = useRef<HTMLPreElement>(null);
  const frame = useRef(0);
  // Each time the slide comes back, the flight starts again from the left.
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (active) setRun((n) => n + 1);
  }, [active]);

  useFrameClock(flight.fps, active && !reducedMotion, () => {
    frame.current = (frame.current + 1) % flight.frames.length;
    if (text.current) text.current.textContent = flight.frames[frame.current];
  });

  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]" aria-hidden="true">
      <div
        key={run}
        className={
          'absolute top-[44%] left-0 ' +
          (reducedMotion || !active
            ? 'translate-x-[calc(50cqw-50%)] -translate-y-1/2'
            : 'animate-[ascii-fly_var(--fly)_linear_both]')
        }
        style={{ '--fly': duration + 'ms' } as React.CSSProperties}
      >
        <pre
          ref={text}
          className={
            'm-0 font-mono leading-none text-cyan-100 ' +
            (reducedMotion ? '' : 'animate-[ascii-bob_2.4s_ease-in-out_infinite]')
          }
          style={{
            fontSize: 'calc(70cqh / ' + ROWS + ')',
            textShadow: '0 0 0.6em oklch(0.8 0.14 200 / 0.8)',
          }}
        >
          {flight.frames[0]}
        </pre>
      </div>
    </div>
  );
};

export default FlyingAscii;
