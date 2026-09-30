import type { ArcadeGame } from "../types";
import { Rng, tupleParser } from "../types";

/**
 * Pong vs Cubear — the 0-pong assignment adapted: the player's bubble paddle
 * against a rival Cubear who patrols the top of the court.
 *
 * Determinism notes:
 * - every random quantity (serve angle, rival drift) comes from the seeded RNG
 *   inside `step()`, never from wall time or anything ambient;
 * - direction changes use pure ratios — no trigonometry, so a ulp on a
 *   different engine can never flip a paddle-plane comparison.
 *
 * Ranked score = the player's points, plus 7 bonus for winning the match
 * (first to WIN_SCORE). The run ends when either side reaches WIN_SCORE.
 */
export const ARENA = { width: 480, height: 640 } as const;
export const BALL_RADIUS = 12;
export const PADDLE = { width: 88, height: 14, playerSpeed: 6, aiSpeed: 5.2 } as const;
/** Bottom and top paddle resting lines (paddle centre). */
export const PLAYER_Y = ARENA.height - 28;
export const AI_Y = 28;
const PADDLE_HALF = PADDLE.width / 2;
/** Paddle face plane measured from its centre line. */
const PADDLE_FACE = PADDLE.height / 2 + BALL_RADIUS;
export const WIN_SCORE = 7;
const SERVE_DELAY = 32;
/** px/tick at 60 t/s — 5.5 = 330 px/s, nudged up on every return. */
export const BALL_SLOW = 5.5;
export const BALL_FAST = 9;
const RETURN_ACCEL = 1.04;
/** Horizontal component never exceeds this fraction of the vertical one. */
const MAX_X_RATIO = 0.85;
/** The rival aims at the ball plus/minus this much, refreshed on every serve. */
const AI_DRIFT = 42;
const AI_PATROL = ARENA.width / 2;

export type PongState = {
  tick: number;
  score: number;
  ended: boolean;
  sfx: string[];
  playerX: number;
  aiX: number;
  ax: number;
  ay: number;
  vx: number;
  vy: number;
  playerScore: number;
  aiScore: number;
  won: boolean;
  serving: number;
  aiDrift: number;
  speed: number;
  /** Seeded generator; lives inside the state so replay reproduces every roll. */
  rng: Rng;
};

/** Serve launch: a seeded ratio pair (steep|shallow × left|right). */
function serve(rng: Rng): [number, number] {
  const pick = [[0, 1], [1, 1], [2, 1], [1, 2], [0.4, 1]][rng.int(5)];
  const side = rng.int(2) === 0 ? -1 : 1;
  const away = rng.int(2) === 0 ? -1 : 1; // toward the rival or the player
  return [side * pick[0], away * pick[1]];
}

/** Per-tick movement cap shared by both paddles. */
function cappedDelta(delta: number, cap: number): number {
  return Math.max(-cap, Math.min(cap, delta));
}

function clampAim(x: number): number {
  return Math.max(PADDLE_HALF, Math.min(ARENA.width - PADDLE_HALF, x));
}

/** Mirror a launch ratio pair over the horizontal axis so |vx| <= 0.85|vy|. */
function launchDirection(rx: number, ry: number): [number, number] {
  const length = Math.hypot(rx, ry);
  return [rx / length, ry / length];
}

export const pongGame: ArcadeGame = {
  id: "pong",
  version: 1,
  tps: 60,
  maxTicks: 54_000,
  runLifetimeMs: 30 * 60_000,
  defaultInput: [Math.round(ARENA.width / 2)],
  inputLength: 1,
  parseTuple: tupleParser(1, [[0, ARENA.width]]),
  create(seed) {
    return {
      tick: 0, score: 0, ended: false, sfx: [],
      playerX: ARENA.width / 2, aiX: ARENA.width / 2,
      ax: ARENA.width / 2, ay: ARENA.height / 2,
      vx: 0, vy: 0, playerScore: 0, aiScore: 0, won: false,
      serving: SERVE_DELAY, aiDrift: 0, speed: BALL_SLOW, rng: new Rng(seed),
    };
  },
  step(blank, input) {
    const state = blank as unknown as PongState;
    if (state.ended) return;
    state.sfx.length = 0;
    state.tick += 1;

    state.playerX = clampAim(state.playerX + cappedDelta(clampAim(input[0]) - state.playerX, PADDLE.playerSpeed));

    if (state.serving > 0) {
      state.serving -= 1;
      if (state.serving === 0) {
        const [rx, ry] = serve(state.rng);
        const [dirX, dirY] = launchDirection(rx, ry);
        state.speed = BALL_SLOW;
        state.aiDrift = (state.rng.int(2) === 0 ? -1 : 1) * (AI_DRIFT - state.rng.int(AI_DRIFT));
        state.ax = ARENA.width / 2;
        state.ay = ARENA.height / 2;
        state.vx = dirX * state.speed;
        state.vy = dirY * state.speed;
        state.sfx.push("serve");
      }
      return;
    }

    // The rival heads to the ball when it climbs, homes to centre otherwise.
    const aim = state.vy < 0 ? clampAim(state.ax + state.aiDrift) : AI_PATROL;
    state.aiX = clampAim(state.aiX + cappedDelta(aim - state.aiX, PADDLE.aiSpeed));

    const previousAy = state.ay;
    state.ax += state.vx;
    state.ay += state.vy;

    if (state.ax < BALL_RADIUS) {
      state.ax = 2 * BALL_RADIUS - state.ax;
      state.vx = Math.abs(state.vx);
      state.sfx.push("wall");
    } else if (state.ax > ARENA.width - BALL_RADIUS) {
      state.ax = 2 * (ARENA.width - BALL_RADIUS) - state.ax;
      state.vx = -Math.abs(state.vx);
      state.sfx.push("wall");
    }

    if (state.vy < 0 && state.ay <= AI_Y) {
      // Past the rival's plane: a point for the player, then a fresh serve.
      state.playerScore += 1;
      state.score = state.playerScore;
      state.sfx.push("point");
      if (state.playerScore >= WIN_SCORE) {
        state.score = state.playerScore + WIN_SCORE;
        state.won = true;
        state.ended = true;
        state.sfx.push("win");
        return;
      }
      resetToServe(state);
      return;
    }

    if (state.vy > 0 && state.ay >= ARENA.height) {
      // Past the player's plane: the rival banks one.
      state.aiScore += 1;
      state.sfx.push("concede");
      if (state.aiScore >= WIN_SCORE) {
        state.score = state.playerScore;
        state.ended = true;
        state.sfx.push("lose");
        return;
      }
      resetToServe(state);
      return;
    }

    // Rival face: ball returning upward while crossing the AI plane.
    const aiContact = AI_Y + PADDLE_FACE;
    if (state.vy < 0 && previousAy > aiContact && state.ay <= aiContact &&
        Math.abs(state.ax - state.aiX) <= PADDLE_HALF + BALL_RADIUS) {
      reflect(state, state.aiX, 1);
      state.sfx.push("block");
      return;
    }

    // Player plane: the rally return — one speed step up, angle off the face.
    const playerContact = PLAYER_Y - PADDLE_FACE;
    if (state.vy > 0 && previousAy < playerContact && state.ay >= playerContact &&
        Math.abs(state.ax - state.playerX) <= PADDLE_HALF + BALL_RADIUS) {
      reflect(state, state.playerX, -1);
      state.sfx.push("paddle");
    }
  },
};

function reflect(state: PongState, paddleX: number, towardY: number): void {
  const offset = Math.max(-1, Math.min(1, (state.ax - paddleX) / PADDLE_HALF));
  state.speed = Math.min(BALL_FAST, state.speed * RETURN_ACCEL);
  const [dirX, dirY] = launchDirection(offset * MAX_X_RATIO, towardY);
  state.vx = dirX * state.speed;
  state.vy = dirY * state.speed;
  // Only ever flip the ball's side; never nudge it into a paddle face twice.
  if (towardY < 0) state.ay = Math.min(state.ay, PLAYER_Y - PADDLE_FACE);
  else state.ay = Math.max(state.ay, AI_Y + PADDLE_FACE);
}

function resetToServe(state: PongState): void {
  state.serving = SERVE_DELAY;
  state.ax = ARENA.width / 2;
  state.ay = ARENA.height / 2;
  state.vx = 0;
  state.vy = 0;
  state.speed = BALL_SLOW;
}
