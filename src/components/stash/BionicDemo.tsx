import { useId, useState } from 'react';
import { Button } from '../ui/Button';

const SAMPLE =
  'Reading is a trained reflex. Your eye lands near the front of a word, takes in enough of its shape to guess the rest, and jumps on before the word is fully resolved. The claim behind half-bolding is that thickening that leading fragment gives the reflex a bigger landing pad.';

const WORDS = SAMPLE.split(' ');

/** Live playground for bionic reading — self-contained to this stash item. */
const BionicDemo = () => {
  const [ratio, setRatio] = useState(0.5);
  const [on, setOn] = useState(true);
  const ratioId = useId();

  return (
    <div className="flex flex-col gap-4">
      <div className="squircle-sm border border-border bg-surface p-5">
        <p className="leading-[26px] text-muted">
          {on
            ? WORDS.map((word, i) => {
                const chars = Array.from(word);
                const cut = Math.ceil(chars.length * ratio);
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: words repeat, position is the identity
                  <span key={`${word}-${i}`}>
                    <b className="font-semibold text-fg">{chars.slice(0, cut).join('')}</b>
                    {chars.slice(cut).join('')}{' '}
                  </span>
                );
              })
            : SAMPLE}
        </p>
      </div>

      <label
        className="squircle-xs flex items-center gap-4 border border-border px-4 py-2.5 text-sm text-muted"
        htmlFor={ratioId}
      >
        <span className="w-20 shrink-0">Bold ratio</span>
        <input
          id={ratioId}
          type="range"
          min={0}
          max={100}
          value={Math.round(ratio * 100)}
          onChange={(e) => setRatio(Number(e.target.value) / 100)}
          className="h-1 w-full appearance-none rounded-full bg-border accent-[var(--fg)]"
          disabled={!on}
        />
        <span className="w-12 shrink-0 text-right tabular-nums text-fg">
          {Math.round(ratio * 100)}%
        </span>
      </label>

      <Button size="sm" variant="outline" onClick={() => setOn((v) => !v)}>
        {on ? 'Show plain text' : 'Show bionic text'}
      </Button>
    </div>
  );
};

export default BionicDemo;
