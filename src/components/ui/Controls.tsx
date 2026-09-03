import type { ReactNode } from 'react';
import { useId } from 'react';

/**
 * Control rows in DialKit's visual language, rebuilt here rather than depended
 * on — see Credits in the README.
 *
 * What's adopted is the shape: a fixed row height, a track that fills the whole
 * row with the value as a filled proportion of it, a thin bar for a handle
 * rather than a knob, and segmented Off/On instead of a switch. The palette is
 * this site's own tokens, and unlike the original these are built to span a
 * content column rather than a 280px floating panel — which is what made the
 * real thing look wrong here, with the label at one edge and the value at the
 * other.
 */

const ROW = 'h-9';

/**
 * Rows are free-standing rather than boxed together. Each carries its own
 * rounding and sits in its own space, so the set reads as a list of separate
 * settings instead of one compound widget.
 */
export const ControlStack = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">{children}</div>
);

const Label = ({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) => (
  <label htmlFor={htmlFor} className="shrink-0 text-xs text-muted">
    {children}
  </label>
);

export const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) => {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div
      className={`group relative flex ${ROW} items-center rounded-lg bg-fg/4 hover:bg-fg/6 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent`}
    >
      {/* The value as a filled proportion of the row — at this width it reads as
          a bar, which is the point of the shape. Its right edge is the handle:
          a separate bar on top of it landed mid-label at some values, and a
          3px mark over a letter reads as a typo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 rounded-lg border-fg/45 border-r bg-fg/8 transition-colors group-hover:border-fg/70"
        style={{ width: `${pct}%` }}
      />

      <div className="relative flex w-full items-center justify-between px-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-xs text-fg tabular-nums">
          {format ? format(value) : value}
        </span>
      </div>

      {/* The real control on top and invisible, so the whole row is the hit
          target and keyboard support comes for free. The row carries the focus
          ring via `has-[:focus-visible]`, because a ring drawn on an element at
          `opacity: 0` is a ring nobody can see. */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
};

export const Select = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) => {
  const id = useId();
  return (
    <div
      className={`flex ${ROW} items-center justify-between rounded-lg bg-fg/4 px-3 hover:bg-fg/6`}
    >
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer rounded-md bg-fg/8 px-2 py-1 font-mono text-xs text-fg outline-none hover:bg-fg/12 focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

/** Off/On as two halves rather than a switch — the state is named, not inferred. */
export const Segmented = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className={`flex ${ROW} items-center justify-between rounded-lg bg-fg/4 px-3 hover:bg-fg/6`}>
    <Label>{label}</Label>
    <div className="flex overflow-hidden rounded-md bg-fg/8 font-mono text-xs">
      {([false, true] as const).map((state) => (
        <button
          key={String(state)}
          type="button"
          aria-pressed={value === state}
          onClick={() => onChange(state)}
          className={`px-2.5 py-1 transition-colors ${
            value === state ? 'bg-fg/15 text-fg' : 'text-muted hover:text-fg'
          }`}
        >
          {state ? 'On' : 'Off'}
        </button>
      ))}
    </div>
  </div>
);

/**
 * One or two colours on a row. The native picker is the control — it is the
 * only one that opens the OS colour panel, with eyedropper and recent colours
 * for free — but its default chrome is a grey box that belongs to no design, so
 * it sits invisible on top of a swatch drawn to match the rest of these rows.
 */
export const Swatch = ({
  label,
  values,
  onChange,
}: {
  label: string;
  values: { title: string; value: string }[];
  onChange: (index: number, value: string) => void;
}) => (
  <div className={`flex ${ROW} items-center justify-between rounded-lg bg-fg/4 px-3 hover:bg-fg/6`}>
    <Label>{label}</Label>
    {/* The focus ring sits on each swatch rather than on the row: two of these
        share a row, and a row-level ring couldn't say which one has focus. */}
    <div className="flex gap-1.5">
      {values.map((swatch, index) => (
        <span
          key={swatch.title}
          className="relative block size-6 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-bg"
        >
          <span
            aria-hidden="true"
            className="block size-full rounded-md border border-fg/15"
            style={{ background: swatch.value }}
          />
          <input
            type="color"
            aria-label={swatch.title}
            value={swatch.value}
            onChange={(e) => onChange(index, e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
      ))}
    </div>
  </div>
);
