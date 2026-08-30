import Matter from 'matter-js';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Layout, in CSS pixels. The ring, the dial handle and the pointer maths all
 * work in this space.
 */
const STAGE = 520;
const C_CSS = STAGE / 2;
const RING = 225;

/**
 * The simulation runs three times larger than it is drawn.
 *
 * Matter's solver constants are absolute, not relative to body size:
 * `_restingThresh = 2`, `_restingThreshTangent = sqrt(6)`,
 * `_frictionNormalMultiplier = 5`, `_motionSleepThreshold = 0.08` and a default
 * `slop` of 0.05 are all tuned for bodies around 50px. At a 15px cube they land
 * in the wrong places — most visibly the slop, which is the penetration
 * deadband: gravity adds about 0.28px of overlap per step, so a deadband below
 * that makes every resting contact fire a correction every step, forever. That
 * is the twitch in the pile.
 *
 * Scaling the world instead of fighting the constants puts every one of them
 * back in range, and the canvas transform divides it out again — same picture,
 * settled stacks.
 */
const S = 3;

const COLS = 10;
const ROWS = 18;
const CELL = 17 * S;
const WELL_W = COLS * CELL;
const WELL_H = ROWS * CELL;
/**
 * Walls are far thicker than they look — only the inner face is drawn.
 *
 * Matter has no continuous collision detection, so a body that travels further
 * than a wall is deep in one step passes straight through it. Terminal velocity
 * here is roughly `accel / frictionAir`, about 55 units per step, so a 30-unit
 * wall leaked cubes out of the floor. Static bodies cost nothing, so the wall is
 * simply made deeper than anything can cross.
 */
const WALL = 40 * S;

/** Belt and braces: nothing may outrun the wall it is about to hit. */
const MAX_SPEED = WALL * 0.45;
/** Centre of the simulation, in world units. */
const C = C_CSS * S;
/** Past this a cube has escaped the dial and is culled. */
const CULL_R = RING * S;

/** Sideways speed a nudge gives the falling piece, in px/step. */
const NUDGE_V = 2.4 * S;
/** Below this speed for this many frames, a piece is considered landed. */
const REST_SPEED = 0.32 * S;
const REST_FRAMES = 14;

/**
 * Matter's own maximum. Past it the solver scales the friction impulse by
 * (delta / 16.667)^3 — a 32ms frame applies roughly seven times the intended
 * friction, so a variable delta means variable physics constants every frame.
 */
const STEP_MS = 1000 / 60;

/**
 * Most a static wall may turn in one step. The inner wall face is ~150px from
 * the pivot and the walls are 10px thick, so anything past this sweeps further
 * than a wall is deep and cubes tunnel straight through — Matter has no CCD.
 */
const MAX_STEP_RAD = 0.05;

/**
 * The well is not weightless. The dial sets a target and the frame springs
 * toward it, overshooting a flick and taking a moment to settle.
 *
 * This is the constraint that gives rotation a cost. Snapping instantly to the
 * pointer made turning a free undo — any dangerous stack could be levelled and
 * any piece steered exactly where you wanted. With mass, a confident correction
 * overshoots into the pile you were protecting, and fine adjustment near a full
 * well is genuinely hard. It is felt rather than displayed, which matters when
 * there is deliberately no HUD to put a meter in.
 */
const SPRING = 0.14;
const DAMPING = 0.82;

/** Contact tuning. Matter's solver constants are absolute, not scaled to body
 *  size, and these cells are small — so friction has to be pushed up and the
 *  penetration deadband widened or every resting contact corrects every step. */
const CUBE = { friction: 0.55, frictionStatic: 1.6, restitution: 0 };

/** A contact takes the *lower* friction of its two bodies, so default walls
 *  would make every piece-wall contact far slipperier than cube-on-cube. */
const WALL_MAT = { friction: 0.6, frictionStatic: 1.6, restitution: 0 };

const COLORS = ['#a78bfa', '#5eead4', '#fbbf24', '#fb7185', '#60a5fa', '#34d399', '#f472b6'];

const SHAPES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
];

type Cube = Matter.Body & { plugin: { color: string } };

/**
 * `Body.setAngle` accepts a third `updateVelocity` flag at runtime (matter-js
 * `Body.js:515`) that `@types/matter-js` does not declare. Without it the method
 * advances `anglePrev` alongside `angle`, holding `angle - anglePrev` at zero —
 * and the solver reads exactly that difference as the surface velocity. So the
 * walls would teleport and separate the pile by penetration correction instead
 * of dragging it by friction. The cast is load-bearing, not convenience.
 */
const rotateFrame = (body: Matter.Body, angle: number) =>
  (Matter.Body.setAngle as (b: Matter.Body, a: number, updateVelocity?: boolean) => void)(
    body,
    angle,
    true,
  );

/**
 * Gyro Tetris, on a real physics solver.
 *
 * The earlier version snapped gravity to four directions and re-stacked the grid
 * whenever you crossed a quadrant. This one inverts that: gravity is a constant
 * world-down vector and the *well* rotates, so the pile responds to every degree
 * of the dial rather than lurching at each 90°. Blocks slide, tip and resettle
 * continuously, which is what the dial always implied.
 *
 * A falling tetromino is one compound body. The moment it comes to rest it is
 * replaced by four independent cubes — that is what makes lines clearable at
 * all, since you cannot remove one square from a rigid compound.
 */
const GyroTetris = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const frameRef = useRef<Matter.Body | null>(null);
  const pieceRef = useRef<Matter.Body | null>(null);
  const cubesRef = useRef<Cube[]>([]);
  const angleRef = useRef(0);
  const restRef = useRef(0);
  const dragRef = useRef(false);
  /** Where the dial wants the well; the step walks the frame toward it. */
  const targetRef = useRef(0);
  /** Nudges are accumulated and applied once per step, not per pointer event. */
  const nudgeRef = useRef(0);
  const visibleRef = useRef(true);
  /** Angular velocity of the well itself, so it carries momentum. */
  const spinRef = useRef(0);

  const [hud, setHud] = useState({ angle: 0, cleared: 0, over: false });
  const clearedRef = useRef(0);
  const overRef = useRef(false);

  /** World position → well-local coordinates, undoing the frame's rotation. */
  const toLocal = useCallback((x: number, y: number) => {
    const a = (angleRef.current * Math.PI) / 180;
    const dx = x - C;
    const dy = y - C;
    return {
      x: dx * Math.cos(a) + dy * Math.sin(a),
      y: -dx * Math.sin(a) + dy * Math.cos(a),
    };
  }, []);

  const spawn = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || overRef.current) return;

    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Placed in the well's own frame, then carried into world space. Computing
    // this in world coordinates put the spawn point outside the wall beyond
    // about 40 degrees of tilt, where pieces fell into the void, never came to
    // rest, and the game silently stalled.
    const a = (angleRef.current * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const toWorld = (lx: number, ly: number) => ({
      x: C + lx * cos - ly * sin,
      y: C + lx * sin + ly * cos,
    });

    const parts = shape.map(([sx, sy]) => {
      const at = toWorld((sx - 1.5) * CELL, -WELL_H / 2 + (sy + 1.2) * CELL);
      return Matter.Bodies.rectangle(at.x, at.y, CELL - 1.6, CELL - 1.6, CUBE);
    });

    const piece = Matter.Body.create({ parts, ...CUBE });
    // Square cells hide a part's own rotation, but the compound has to carry the
    // well's angle or a tilted piece lands on its corner.
    Matter.Body.setAngle(piece, a);
    (piece as Cube).plugin = { color };

    // `Query.region` compares axis-aligned boxes, so a rotated piece reports
    // collisions it does not have. `collides` runs real SAT, and the frame is in
    // the list so a piece spawned inside a wall is caught too.
    const frame = frameRef.current;
    const hit = Matter.Query.collides(piece, [...cubesRef.current, ...(frame ? [frame] : [])]);
    if (hit.length > 0) {
      overRef.current = true;
      setHud((h) => ({ ...h, over: true }));
      return;
    }

    Matter.Composite.add(engine.world, piece);
    pieceRef.current = piece;
    restRef.current = 0;
  }, []);

  /** A landed compound becomes four loose cubes, so rows can be taken apart. */
  const land = useCallback(() => {
    const engine = engineRef.current;
    const piece = pieceRef.current;
    if (!engine || !piece) return;

    const color = (piece as Cube).plugin?.color ?? COLORS[0];
    for (const part of piece.parts.slice(1)) {
      const cube = Matter.Bodies.rectangle(
        part.position.x,
        part.position.y,
        CELL - 1.6,
        CELL - 1.6,
        {
          ...CUBE,
          angle: part.angle,
        },
      ) as Cube;
      cube.plugin = { color };

      // Carry the compound's motion across, or the stack visibly ticks as the
      // piece's remaining energy vanishes at the swap. v = v_com + w x r.
      Matter.Body.setVelocity(cube, {
        x: piece.velocity.x - (part.position.y - piece.position.y) * piece.angularVelocity,
        y: piece.velocity.y + (part.position.x - piece.position.x) * piece.angularVelocity,
      });
      Matter.Body.setAngularVelocity(cube, piece.angularVelocity);
      cubesRef.current.push(cube);
      Matter.Composite.add(engine.world, cube);
    }

    Matter.Composite.remove(engine.world, piece);
    pieceRef.current = null;

    // Rows run across the well, whatever angle it is currently held at.
    const rows = new Map<number, { cubes: Cube[]; cols: Set<number>; ys: number[] }>();
    for (const cube of cubesRef.current) {
      const local = toLocal(cube.position.x, cube.position.y);
      // Rounding on the centre rather than flooring on the edge, so a cube
      // sitting a pixel proud of a boundary still bins with its own row.
      const row = Math.round((local.y + WELL_H / 2 - CELL / 2) / CELL);
      const col = Math.round((local.x + WELL_W / 2 - CELL / 2) / CELL);
      if (col < 0 || col >= COLS) continue;
      const bucket = rows.get(row) ?? { cubes: [], cols: new Set<number>(), ys: [] };
      bucket.cubes.push(cube);
      bucket.cols.add(col);
      bucket.ys.push(local.y);
      rows.set(row, bucket);
    }

    let cleared = 0;
    for (const [, bucket] of rows) {
      // Loose cubes never line up perfectly, so a row counts as full a shade
      // under complete rather than demanding all ten columns.
      if (bucket.cols.size < COLS - 1) continue;
      // ...but a "row" whose cubes are spread over more than half a cell is two
      // levels of a sloped pile that happened to share a bin, not a line. Without
      // this the fudge above fires phantom clears on a leaning stack.
      const spread = Math.max(...bucket.ys) - Math.min(...bucket.ys);
      if (spread > CELL * 0.6) continue;
      for (const cube of bucket.cubes) {
        Matter.Composite.remove(engine.world, cube);
        cubesRef.current = cubesRef.current.filter((c) => c !== cube);
      }
      cleared += 1;
    }

    if (cleared) {
      clearedRef.current += cleared;
      // Classic Tetris pressure, and the only kind that needs no readout: the
      // longer you last the harder gravity pulls, so the well you could casually
      // re-level ten rows ago no longer gives you time to.
      engine.gravity.y = Math.min(4, 2 + clearedRef.current * 0.15);
      setHud((h) => ({ ...h, cleared: clearedRef.current }));
    }

    spawn();
  }, [spawn, toLocal]);

  const reset = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    for (const cube of cubesRef.current) Matter.Composite.remove(engine.world, cube);
    if (pieceRef.current) Matter.Composite.remove(engine.world, pieceRef.current);
    cubesRef.current = [];
    pieceRef.current = null;
    clearedRef.current = 0;
    overRef.current = false;
    restRef.current = 0;
    setHud({ angle: hud.angle, cleared: 0, over: false });
    spawn();
  }, [spawn, hud.angle]);

  // ── engine, loop and renderer ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Match the backing store to the display, or the whole board is drawn at 1×
    // and stretched — which is exactly what made the cubes look soft.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = STAGE * dpr;
    canvas.height = STAGE * dpr;
    // Draw in world units and let the transform undo the 3x, so the simulation
    // stays large for the solver while the picture stays 520 CSS px.
    ctx.setTransform(dpr / S, 0, 0, dpr / S, 0, 0);

    // A settled pile is skipped entirely once asleep. This only behaves at a
    // sane body size, which is the second reason the world is scaled up.
    // One baked sprite per colour. The previous renderer did a save, a clip, a
    // createLinearGradient, a fillRect and a restore for every cube on every
    // frame — 150 clips and 150 fresh gradient objects a frame, which is a lot
    // of layers to composite and a lot of garbage to collect.
    const sprites = new Map<string, HTMLCanvasElement>();
    const spriteFor = (color: string) => {
      const cached = sprites.get(color);
      if (cached) return cached;

      const size = CELL;
      const tile = document.createElement('canvas');
      tile.width = size;
      tile.height = size;
      const tctx = tile.getContext('2d');
      if (!tctx) return tile;

      const inset = 1.6 * S;
      const box = size - inset;
      tctx.beginPath();
      tctx.roundRect(inset / 2, inset / 2, box, box, 3 * S);
      tctx.fillStyle = color;
      tctx.fill();

      // Lit from above. Baked in, so it costs nothing at draw time.
      const grad = tctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, 'rgba(255,255,255,.34)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(0,0,0,.34)');
      tctx.fillStyle = grad;
      tctx.fill();

      tctx.strokeStyle = 'rgba(0,0,0,.45)';
      tctx.lineWidth = 1 * S;
      tctx.stroke();

      sprites.set(color, tile);
      return tile;
    };

    const engine = Matter.Engine.create({ enableSleeping: true });
    // positionDamping clamps to 1 below 20 iterations, so extra position passes
    // are free quality; deep stacks need the velocity passes to propagate
    // friction down to the bottom of the pile.
    engine.positionIterations = 10;
    engine.velocityIterations = 6;
    engine.gravity.x = 0;
    engine.gravity.y = 2;
    engineRef.current = engine;

    const half = WALL / 2;
    const frame = Matter.Body.create({
      isStatic: true,
      parts: [
        Matter.Bodies.rectangle(C - WELL_W / 2 - half, C, WALL, WELL_H + WALL * 2, WALL_MAT),
        Matter.Bodies.rectangle(C + WELL_W / 2 + half, C, WALL, WELL_H + WALL * 2, WALL_MAT),
        Matter.Bodies.rectangle(C, C + WELL_H / 2 + half, WELL_W + WALL * 2, WALL, WALL_MAT),
        Matter.Bodies.rectangle(C, C - WELL_H / 2 - half, WELL_W + WALL * 2, WALL, WALL_MAT),
      ],
    });
    frameRef.current = frame;
    Matter.Composite.add(engine.world, frame);

    spawn();

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const draw = () => {
      ctx.clearRect(0, 0, STAGE, STAGE);

      // The well, drawn from the frame's own vertices so it is always exactly
      // where the solver thinks it is.
      ctx.save();
      ctx.translate(C, C);
      // Drawn from the body's own angle, not the dial's. They diverge while the
      // well is catching up, and the outline must agree with what the cubes are
      // actually colliding against.
      ctx.rotate(frameRef.current?.angle ?? 0);
      ctx.strokeStyle = 'rgba(250,250,249,.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-WELL_W / 2, -WELL_H / 2, WELL_W, WELL_H, 6);
      ctx.stroke();
      ctx.restore();

      const paint = (body: Matter.Body, color: string) => {
        const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
        const sprite = spriteFor(color);
        for (const part of parts) {
          ctx.save();
          ctx.translate(part.position.x, part.position.y);
          ctx.rotate(part.angle);
          ctx.drawImage(sprite, -CELL / 2, -CELL / 2, CELL, CELL);
          ctx.restore();
        }
      };

      for (const cube of cubesRef.current) paint(cube, cube.plugin.color);
      if (pieceRef.current) {
        paint(pieceRef.current, (pieceRef.current as Cube).plugin?.color ?? COLORS[0]);
      }
    };

    const step = () => {
      // Walk the frame toward the dial, clamped. `setAngle(..., true)` resets
      // anglePrev first, so the solver sees a real surface velocity and drags
      // the pile by friction — without it the walls teleport and the pile is
      // shoved apart by penetration correction instead.
      const frameBody = frameRef.current;
      if (frameBody) {
        const tau = Math.PI * 2;
        let toTarget = (targetRef.current * Math.PI) / 180 - frameBody.angle;
        toTarget -= tau * Math.round(toTarget / tau);

        spinRef.current = (spinRef.current + toTarget * SPRING) * DAMPING;
        // Still clamped: the far wall must not sweep further in one step than a
        // wall is thick, or cubes tunnel through it.
        const d = Math.max(-MAX_STEP_RAD, Math.min(MAX_STEP_RAD, spinRef.current));
        if (Math.abs(d) > 1e-5) {
          rotateFrame(frameBody, frameBody.angle + d);
          // Static bodies never wake their neighbours, so a turning wall would
          // slide straight under a sleeping pile without disturbing it.
          for (const cube of cubesRef.current) Matter.Sleeping.set(cube, false);
        }
      }

      const piece = pieceRef.current;
      if (piece && nudgeRef.current !== 0) {
        // Only ever accelerate toward the target, so a held drag cannot keep
        // overwriting the separation impulses the walls give the piece.
        if (Math.abs(piece.velocity.x) < NUDGE_V) {
          Matter.Body.setVelocity(piece, {
            x: Math.sign(nudgeRef.current) * NUDGE_V,
            y: piece.velocity.y,
          });
        }
        nudgeRef.current = 0;
      }

      // Clamp before integrating, not after, or the overshoot has already
      // happened by the time we look.
      for (const body of [pieceRef.current, ...cubesRef.current]) {
        if (!body) continue;
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed > MAX_SPEED) {
          const k = MAX_SPEED / speed;
          Matter.Body.setVelocity(body, { x: body.velocity.x * k, y: body.velocity.y * k });
        }
      }

      Matter.Engine.update(engine, STEP_MS);

      if (piece && !overRef.current) {
        const speed = Math.hypot(piece.velocity.x, piece.velocity.y);
        const settled = speed < REST_SPEED && Math.abs(piece.angularVelocity) < 0.02;
        restRef.current = settled ? restRef.current + 1 : 0;
        if (restRef.current > REST_FRAMES) land();
      }

      // Anything that escapes the dial would otherwise fall forever, stay in the
      // body list and keep being drawn.
      for (const cube of cubesRef.current) {
        if (Math.hypot(cube.position.x - C, cube.position.y - C) > CULL_R) {
          Matter.Composite.remove(engine.world, cube);
          cubesRef.current = cubesRef.current.filter((c) => c !== cube);
        }
      }
    };

    const loop = () => {
      const now = performance.now();
      // One rAF driving both, with a fixed-size physics step. A separate
      // setInterval ran at 62.5Hz against a 60Hz paint and drifted permanently
      // out of phase, which showed up as judder even at a steady frame rate.
      acc += Math.min(now - last, 100);
      last = now;

      if (visibleRef.current) {
        let steps = 0;
        while (acc >= STEP_MS && steps < 3) {
          step();
          acc -= STEP_MS;
          steps += 1;
        }
        if (acc > STEP_MS * 3) acc = 0;
        draw();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      // Bodies belong to a world that no longer exists. Left in place they are
      // still painted and still fed to the lose check on StrictMode's remount.
      cubesRef.current = [];
      pieceRef.current = null;
      restRef.current = 0;
    };
  }, [spawn, land]);

  // ── the dial ────────────────────────────────────────────────────────────────
  const setAngle = useCallback((next: number) => {
    angleRef.current = next;
    targetRef.current = next;
    setHud((h) => {
      const rounded = Math.round(((next % 360) + 360) % 360);
      return h.angle === rounded ? h : { ...h, angle: rounded };
    });
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const scale = box.width / STAGE;
    const dx = e.clientX - (box.left + C_CSS * scale);
    const dy = e.clientY - (box.top + C_CSS * scale);

    const screenAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    let delta = screenAngle - 90 - angleRef.current;
    delta -= 360 * Math.round(delta / 360);

    // Gravity is world-down, so "sideways" is world-horizontal unconditionally.
    // The old tangent term was -cos(angle), which hit zero at +/-90 degrees and
    // hard-braked the piece to a standstill exactly when the well was on its
    // side, then flipped sign discontinuously across it.
    if (Math.abs(delta) > 0.4) nudgeRef.current = Math.sign(delta);

    setAngle(angleRef.current + delta);
  };

  // The dial is one section of a long page. Without this the arrow keys swallow
  // page scrolling for the whole site whenever the panel is mounted, on screen
  // or not — and the loop keeps simulating off-screen.
  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const piece = pieceRef.current;
      if (!piece || overRef.current || !visibleRef.current) return;
      if (e.key === 'ArrowLeft')
        Matter.Body.setVelocity(piece, { x: -NUDGE_V, y: piece.velocity.y });
      else if (e.key === 'ArrowRight')
        Matter.Body.setVelocity(piece, { x: NUDGE_V, y: piece.velocity.y });
      else if (e.key === 'ArrowUp') Matter.Body.rotate(piece, Math.PI / 2);
      else if (e.key === 'ArrowDown') Matter.Body.setVelocity(piece, { x: piece.velocity.x, y: 9 });
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const bubbleRad = ((hud.angle + 90) * Math.PI) / 180;

  return (
    <div className="flex w-full justify-center">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the dial is a pointer surface; the game is playable from the keyboard handler above, and the canvas carries the accessible description */}
      <div
        className="relative w-full max-w-[520px] touch-none select-none"
        style={{ aspectRatio: '1' }}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = false;
        }}
        onPointerCancel={() => {
          dragRef.current = false;
        }}
      >
        <svg viewBox={`0 0 ${STAGE} ${STAGE}`} className="absolute inset-0" aria-hidden="true">
          <title>Rotation dial</title>
          <circle
            cx={C_CSS}
            cy={C_CSS}
            r={RING}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1.5}
          />
        </svg>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-label={`Gyro Tetris. The well is held at ${hud.angle} degrees. ${hud.cleared} rows cleared. Arrow keys move, rotate and drop.`}
        />

        <button
          type="button"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            dragRef.current = true;
          }}
          aria-label="Rotate the well"
          className="absolute size-[22px] cursor-grab rounded-full border border-accent/70 bg-accent/20 shadow-lg backdrop-blur-sm transition-colors before:absolute before:-inset-[11px] before:content-[''] hover:bg-accent/35 active:cursor-grabbing"
          style={{
            left: `${((C_CSS + RING * Math.cos(bubbleRad)) / STAGE) * 100}%`,
            top: `${((C_CSS + RING * Math.sin(bubbleRad)) / STAGE) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />

        {hud.over && (
          <div className="absolute inset-0 grid place-items-center">
            <button
              type="button"
              onClick={reset}
              className="squircle-xs border border-border bg-bg/80 px-3 py-1.5 text-sm text-muted backdrop-blur-sm transition-colors hover:text-fg"
            >
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GyroTetris;
