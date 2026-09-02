import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { EASE } from '../../utils/motion';
import type { Crop, Progress, StageId } from '../../utils/videoToAscii';

/**
 * The pipeline, drawn rather than described — one stage at a time.
 *
 * A checklist with progress bars tells you a stage is running. It does not tell
 * you what a stage *does*, which is the only interesting thing here — so each
 * one draws its own working state: the frames as they are collected, the
 * occupancy histograms the crop search is actually built from, the cell grid the
 * averaging happens over.
 *
 * All four used to be stacked, which made the panel a tall scrolling column
 * where the running stage was usually off-screen and the finished ones were
 * dead weight. They are tabs now: the selection follows the run on its own, and
 * a reader who wants to go back and look at the crop search properly can click
 * it and stay there. Height stops changing as stages complete, too, which is
 * what made the earlier version jump under the pointer.
 *
 * Nothing here is a mock-up of the algorithm playing alongside it; these are the
 * same numbers the bake consumes.
 */

/**
 * `tab` is one word on purpose. Four tabs share a row inside a square panel, so
 * "Find the subject" wrapped to two lines and made its tab taller than the
 * other three. The full name lives in `label`, which the panel prints under the
 * strip where there is room for it.
 */
const STAGES: { id: StageId; tab: string; label: string; blurb: string }[] = [
  { id: 'decode', tab: 'Decode', label: 'Decode', blurb: 'Reading the container' },
  {
    id: 'sample',
    tab: 'Sample',
    label: 'Sample',
    blurb: 'Seeking to evenly spaced frames, not playing them',
  },
  {
    id: 'subject',
    tab: 'Subject',
    label: 'Find the subject',
    blurb: 'Counting how often each row and column is lit',
  },
  {
    id: 'grid',
    tab: 'Grid',
    label: 'Build the grid',
    blurb: 'Averaging each cell, then normalising',
  },
];

/** What the container turned out to hold. There is nothing to animate here — the
    interesting part of decoding is that it succeeded and at what size. */
const DecodeView = ({ width, height }: { width: number; height: number }) => (
  <dl className="flex flex-col gap-1 font-mono text-xs">
    <div className="flex justify-between border-border/60 border-b py-1.5">
      <dt className="text-muted">sampled at</dt>
      <dd className="text-fg tabular-nums">
        {width}×{height}
      </dd>
    </div>
    <div className="flex justify-between border-border/60 border-b py-1.5">
      <dt className="text-muted">decoder</dt>
      <dd className="text-fg">&lt;video&gt;, in this tab</dd>
    </div>
    <div className="flex justify-between py-1.5">
      <dt className="text-muted">uploaded to</dt>
      <dd className="text-fg">nowhere</dd>
    </div>
  </dl>
);

/** Frames accumulating as the sampler seeks, with a playhead along the clip. */
const SampleView = ({ thumbs, ratio }: { thumbs: string[]; ratio: number }) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-wrap gap-1">
      {thumbs.slice(-24).map((src, i) => (
        <motion.img
          // biome-ignore lint/suspicious/noArrayIndexKey: a strip, not a list — position is the identity
          key={i}
          src={src}
          alt=""
          initial={{ opacity: 0, scaleY: 0.7 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.18 }}
          className="h-9 w-auto shrink-0 rounded-[3px] border border-border/60 object-cover"
        />
      ))}
    </div>
    {/* The clip's own timeline, with the seek head where the sampler is. */}
    <div className="relative h-1 w-full rounded-full bg-fg/10">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-accent"
        initial={false}
        animate={{ width: `${ratio * 100}%` }}
        transition={{ duration: 0.12 }}
      />
    </div>
  </div>
);

/**
 * The crop search, made literal: the frame with occupancy histograms along the
 * bottom and left, and the box closing in on what clears the threshold.
 */
const SubjectView = ({
  frame,
  crop,
  width,
  height,
  colHits,
  rowHits,
}: {
  frame: string | null;
  crop: Crop | null;
  width: number;
  height: number;
  colHits?: Float32Array;
  rowHits?: Float32Array;
}) => (
  <div className="flex gap-1">
    {/* Row occupancy, running down the left edge beside the frame it describes. */}
    <div className="flex w-6 shrink-0 flex-col justify-stretch gap-px">
      {rowHits
        ? Array.from({ length: Math.min(40, rowHits.length) }, (_, i) => {
            const v = rowHits[Math.floor((i / 40) * rowHits.length)] ?? 0;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length histogram; index is the bucket
                key={i}
                className="flex-1"
              >
                <div className="h-full rounded-[1px] bg-accent" style={{ width: `${v * 100}%` }} />
              </div>
            );
          })
        : null}
    </div>

    <div className="min-w-0 flex-1">
      <div className="relative overflow-hidden rounded-md border border-border">
        {frame && <img src={frame} alt="" className="block w-full" />}
        {crop && (
          <motion.div
            aria-hidden="true"
            className="absolute border border-accent bg-accent/10"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: `${(crop.x / width) * 100}%`,
              top: `${(crop.y / height) * 100}%`,
              width: `${(crop.w / width) * 100}%`,
              height: `${(crop.h / height) * 100}%`,
            }}
            transition={{ duration: 0.45, ease: EASE }}
          />
        )}
      </div>

      {/* Column occupancy, under the columns it counts. */}
      <div className="mt-1 flex h-6 items-end gap-px">
        {colHits
          ? Array.from({ length: 60 }, (_, i) => {
              const v = colHits[Math.floor((i / 60) * colHits.length)] ?? 0;
              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length histogram; index is the bucket
                  key={i}
                  className="flex-1 rounded-[1px] bg-accent"
                  style={{ height: `${Math.max(2, v * 100)}%` }}
                />
              );
            })
          : null}
      </div>
    </div>
  </div>
);

/** The grid itself, appearing a row at a time as the averaging fills it in. */
const GridView = ({ rows, ratio }: { rows: string[]; ratio: number }) => {
  const shown = Math.max(1, Math.ceil(rows.length * Math.min(1, ratio * 3)));
  return (
    <pre className="overflow-hidden rounded-md border border-border bg-bg p-2 font-mono text-[5px] leading-[1.05] text-fg">
      {rows.slice(0, shown).join('\n')}
    </pre>
  );
};

const Pipeline = ({
  current,
  progress,
  frame,
  crop,
  width,
  height,
  error,
  thumbs,
  gridRows,
  hits,
}: {
  current: number;
  progress: Progress | null;
  frame: string | null;
  crop: Crop | null;
  width: number;
  height: number;
  error: string | null;
  thumbs: string[];
  gridRows: string[];
  hits: { col?: Float32Array; row?: Float32Array };
}) => {
  /**
   * `null` means "follow the run". A click pins the selection instead, so a
   * reader who opens the crop search is not yanked to the next stage a moment
   * later — the run is fast enough that it would otherwise be impossible to
   * look at anything on the way past.
   */
  const [pinned, setPinned] = useState<number | null>(null);
  const shown = pinned ?? Math.min(current, STAGES.length - 1);

  // A new file starts a new run, and a pin from the last one would open it on a
  // stage this one has not reached.
  useEffect(() => {
    if (current === 0) setPinned(null);
  }, [current]);

  const stage = STAGES[shown];
  const state = shown < current ? 'done' : shown === current ? 'active' : 'waiting';
  const ratio = state === 'done' ? 1 : state === 'active' ? (progress?.ratio ?? 0) : 0;

  return (
    <div className="flex h-full w-full flex-col gap-3">
      {/* Reached stages only. A tab for something that has not run yet is an
          affordance with nothing behind it. */}
      <div role="tablist" aria-label="Pipeline stages" className="flex gap-1">
        {STAGES.map((s, i) => {
          const reached = i <= current;
          const selected = i === shown;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={!reached}
              onClick={() => setPinned(i)}
              className={`relative flex-1 rounded-md px-1.5 py-1.5 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 ${
                selected
                  ? 'bg-fg/10 text-fg'
                  : reached
                    ? 'text-muted hover:bg-fg/5 hover:text-fg'
                    : 'cursor-default text-muted/35'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {/* Running, done, or not yet — said with the dot, so the label
                    stays a label rather than growing a status suffix. */}
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${
                    i < current
                      ? 'bg-accent'
                      : i === current
                        ? 'bg-accent animate-pulse'
                        : 'bg-fg/20'
                  }`}
                />
                {s.tab}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline gap-2">
        <h3 className="shrink-0 text-fg text-xs">{stage.label}</h3>
        <p className="min-w-0 truncate text-muted text-xs">{stage.blurb}</p>
        {state === 'active' && progress?.detail && (
          <span className="ml-auto font-mono text-muted text-xs tabular-nums">
            {progress.detail}
          </span>
        )}
        {state === 'done' && <span className="ml-auto text-muted text-xs">done</span>}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
          >
            {stage.id === 'decode' && <DecodeView width={width} height={height} />}
            {stage.id === 'sample' && <SampleView thumbs={thumbs} ratio={ratio} />}
            {stage.id === 'subject' && (
              <SubjectView
                frame={frame}
                crop={crop}
                width={width}
                height={height}
                colHits={hits.col}
                rowHits={hits.row}
              />
            )}
            {stage.id === 'grid' &&
              (gridRows.length > 0 ? (
                <GridView rows={gridRows} ratio={ratio} />
              ) : (
                <p className="font-mono text-muted text-xs">waiting for the crop</p>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <p aria-live="polite" className="sr-only">
        {error ?? `${STAGES[Math.min(current, STAGES.length - 1)].label} in progress`}
      </p>
      {error && <p className="text-accent text-sm">{error}</p>}
    </div>
  );
};

export default Pipeline;
