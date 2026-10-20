import type { ArcadeGame } from "../types";
import { Rng, tupleParser } from "../types";

/**
 * Flappy Cubear — tap to flap, drift through pipe gaps, score a point per
 * pair passed. One hit ends the run; the sky keeps scrolling until then.
 *
 * Determinism: pipe x positions live in the sim (moving left at a fixed px/t
 * with a seeded gap y roll per pipe). Input tuple = the tap state per tick
 * (0 = glide, 1 = flap). Gravity, cap speed and pipe spacing are constants.
 */
export const ARENA = { width: 480, height: 640 } as const;
export const CUBE = { size: 44 } as const;
/** px per tick — 60 t/s; gravity 0.45 px/t², flap kick −7.4 px/t. */
const GRAVITY = 0.45;
const FLAP_KICK = -7.4;
const MAX_FALL = 11;
export const PIPE = { width: 74, gap: 172, speed: 2.9, spacing: 216 } as const;
const PIPE_TOP_MARGIN = 56;
const PIPE_BOTTOM_MARGIN = 86;
/** The run also ends at the ceiling of ticks, same as the old rally cap. */
export const MAX_TICKS = 43_200;

export type Pipe = { x: number; gapY: number; passed: boolean };
export type FlappyState = {
  tick: number;
  score: number;
  ended: boolean;
  sfx: string[];
  x: number;
  y: number;
  vy: number;
  pipes: Pipe[];
  rng: number;
};

function pipeGapY(rng: Rng): number {
  const lo = PIPE_TOP_MARGIN + PIPE.gap / 2;
  const hi = ARENA.height - PIPE_BOTTOM_MARGIN - PIPE.gap / 2;
  return lo + rng.next() * (hi - lo);
}

function spawnGap(state: FlappyState, x: number): void {
  const rng = new Rng(state.rng);
  state.pipes.push({ x, gapY: pipeGapY(rng), passed: false });
  state.rng = rng.snapshot();
}

export const flappyGame: ArcadeGame = {
  id: "flappy",
  version: 1,
  tps: 60,
  maxTicks: MAX_TICKS,
  runLifetimeMs: 30 * 60_000,
  defaultInput: [0],
  inputLength: 1,
  parseTuple: tupleParser(1, [[0, 1]]),
  create(seed) {
    const state = {
      tick: 0, score: 0, ended: false, sfx: [],
      x: 132, y: ARENA.height / 2, vy: 0,
      pipes: [], rng: seed >>> 0,
    };
    // Two pipes ahead on a fixed beat: the first gap is never offscreen-close.
    spawnGap(state, ARENA.width + 90);
    spawnGap(state, ARENA.width + 90 + PIPE.spacing);
    return state;
  },
  step(blank, input) {
    const state = blank as unknown as FlappyState;
    if (state.ended) return;
    state.sfx.length = 0;
    state.tick += 1;

    if (state.tick >= MAX_TICKS) { state.ended = true; state.sfx.push("lose"); return; }

    if (input[0] === 1) { state.vy = FLAP_KICK; state.sfx.push("flap"); }

    state.vy = Math.min(MAX_FALL, state.vy + GRAVITY);
    state.y += state.vy;

    const speed = PIPE.speed;
    for (const pipe of state.pipes) pipe.x -= speed;
    while (state.pipes.length > 0 && state.pipes[0].x < -PIPE.width) state.pipes.shift();
    const last = state.pipes[state.pipes.length - 1];
    if (last && last.x < ARENA.width - PIPE.spacing) {
      spawnGap(state, last.x + PIPE.spacing);
    }

    // Scoring: a point when Cubear clears a pair's trailing edge.
    for (const pipe of state.pipes) {
      if (!pipe.passed && pipe.x + PIPE.width < state.x) {
        pipe.passed = true;
        state.score += 1;
        state.sfx.push("point");
      }
    }

    // Ceiling forgiveness: clamp instead of kill, keeps taps honest.
    if (state.y < CUBE.size / 2) { state.y = CUBE.size; state.vy = 0; }

    // Ground hit or a pipe overlap ends the run.
    if (state.y + CUBE.size / 2 >= ARENA.height - 56) {
      state.ended = true;
      state.sfx.push("lose");
      return;
    }
    for (const pipe of state.pipes) {
      if (state.x + CUBE.size / 2 < pipe.x || state.x - CUBE.size / 2 > pipe.x + PIPE.width) continue;
      const topEdge = pipe.gapY - PIPE.gap / 2;
      const bottomEdge = pipe.gapY + PIPE.gap / 2;
      if (state.y - CUBE.size / 2 < topEdge || state.y + CUBE.size / 2 > bottomEdge) {
        state.ended = true;
        state.sfx.push("lose");
        return;
      }
    }
  },
};
