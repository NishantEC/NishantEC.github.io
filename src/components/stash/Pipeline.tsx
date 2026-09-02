import { motion } from 'motion/react';
import type { Crop, Progress, StageId } from '../../utils/videoToAscii';

/**
 * The pipeline, drawn rather than described.
 *
 * A checklist with progress bars tells you a stage is running. It does not tell
 * you what a stage *does*, which is the only interesting thing here — so each
 * one draws its own working state instead: the frames as they are collected,
 * the occupancy histograms the crop search is actually built from, the cell
 * grid the averaging happens over.
 *
 * All of it comes from the real run. Nothing here is a mock-up of the algorithm
 * playing alongside it; these are the same numbers the bake consumes.
 */

const STAGES: { id: StageId; label: string; blurb: string }[] = [
  { id: 'decode', label: 'Decode', blurb: 'Reading the container' },
  { id: 'sample', label: 'Sample', blurb: 'Seeking to evenly spaced frames, not playing them' },
  {
    id: 'subject',
    label: 'Find the subject',
    blurb: 'Counting how often each row and column is lit',
  },
  { id: 'grid', label: 'Build the grid', blurb: 'Averaging each cell, then normalising' },
];

/** Frames accumulating as the sampler seeks, with a playhead along the clip. */
const SampleView = ({ thumbs, ratio }: { thumbs: string[]; ratio: number }) => (
  <div className="flex flex-col gap-2">
    <div className="flex gap-1 overflow-hidden">
      {thumbs.slice(-11).map((src, i) => (
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
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
    <pre className="overflow-hidden rounded-md border border-border bg-bg p-2 font-mono text-[4px] leading-[1.05] text-fg">
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
}) => (
  <div className="flex w-full flex-col gap-3">
    {STAGES.map((stage, i) => {
      const state = i < current ? 'done' : i === current ? 'active' : 'waiting';
      const ratio = state === 'done' ? 1 : state === 'active' ? (progress?.ratio ?? 0) : 0;

      return (
        <section key={stage.id} className={state === 'waiting' ? 'opacity-35' : ''}>
          <header className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${state === 'waiting' ? 'bg-fg/25' : 'bg-accent'}`}
            />
            <h3 className="text-fg text-sm">{stage.label}</h3>
            {state === 'active' && progress?.detail && (
              <span className="font-mono text-muted text-xs tabular-nums">{progress.detail}</span>
            )}
            {state === 'done' && <span className="ml-auto text-muted text-xs">done</span>}
          </header>
          <p className="mb-1.5 pl-3.5 text-muted text-xs">{stage.blurb}</p>

          {/* Each stage shows its own working state, and only while it has one. */}
          <div className="pl-3.5">
            {stage.id === 'sample' && state !== 'waiting' && (
              <SampleView thumbs={thumbs} ratio={ratio} />
            )}
            {stage.id === 'subject' && state !== 'waiting' && (
              <SubjectView
                frame={frame}
                crop={crop}
                width={width}
                height={height}
                colHits={hits.col}
                rowHits={hits.row}
              />
            )}
            {stage.id === 'grid' && state !== 'waiting' && gridRows.length > 0 && (
              <GridView rows={gridRows} ratio={ratio} />
            )}
          </div>
        </section>
      );
    })}

    <p aria-live="polite" className="sr-only">
      {error ?? `${STAGES[Math.min(current, STAGES.length - 1)].label} in progress`}
    </p>
    {error && <p className="text-accent text-sm">{error}</p>}
  </div>
);

export default Pipeline;
