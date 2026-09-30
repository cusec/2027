import type { ArcadeGame } from "../types";
import { Rng, tupleParser } from "../types";

/**
 * Brick Rally — the 1-breakout assignment adapted: seeded brick levels,
 * hearts, a multi-ball power-up, a locked brick opened by a key bubble, and
 * endless level progression while Cubear keeps the rally alive.
 *
 * Determinism notes:
 * - every random quantity (level layout, power-up drops, serve angles) flows
 *   from the seeded RNG inside `step()`;
 * - collision responses use plain penetration reflection — no trigonometry;
 * - state is plain data rebuilt from (seed, transcript), never serialized, so
 *   the browser and the server replay from equal footing every run.
 *
 * Ranked score = destroyed brick values. The run ends when the last heart is
 * spent or the tick ceiling is reached.
 */
export const ARENA = { width: 480, height: 640 } as const;
export const BALL_RADIUS = 10;
export const PADDLE = { baseWidth: 110, minShrink: 62, growBonus: 9, playerSpeed: 6.2, lossPenalty: 14 } as const;
export const PLAYER_Y = ARENA.height - 26;
/** A ball must pass this far above the paddle centre line to be "caught". */
const PADDLE_FACE = BALL_RADIUS + 7;
export const BRICKS = {
  cols: 10, rowsMax: 6, top: 84, height: 16, gap: 5, side: 7,
  lockedPoints: 8,
} as const;
export const BRICK_W = Math.floor((ARENA.width - 2 * BRICKS.side - (BRICKS.cols - 1) * BRICKS.gap) / BRICKS.cols);
export const LIVES_START = 3;
export const LIVES_MAX = 5;
/** Horizontal component never exceeds this fraction of vertical on a return. */
const MAX_X_RATIO = 0.9;
const SERVE_DELAY = 42;
export const BALL_SLOW = 5.2;
const POWERUP_EVERY = 5; // one perk per POWERUP_EVERY destroyed bricks
const POWERUP_FALL = 2.4; // px per tick
export const PADDLE_GROW_EVERY = 120; // score milestone, then one +growBonus
const MAX_BALLS = 9;
/** The run also ends at the ceiling — the wall outlasts the clock. */
export const MAX_TICKS = 43_200;

export type Ball = { x: number; y: number; vx: number; vy: number };
export type Brick = { col: number; row: number; health: number; locked: boolean };
export type Drop = { x: number; y: number; kind: "heart" | "key" | "multiball" };

export type BreakoutState = {
  tick: number;
  score: number;
  ended: boolean;
  sfx: string[];
  playerX: number;
  paddleWidth: number;
  lives: number;
  level: number;
  bricks: Brick[];
  balls: Ball[];
  drops: Drop[];
  hasKey: boolean;
  sinceDrop: number;
  serving: number;
  rng: Rng;
};

function clampAim(x: number): number {
  return Math.max(BALL_RADIUS, Math.min(ARENA.width - BALL_RADIUS, x));
}

function cappedDelta(delta: number, cap: number): number {
  return Math.max(-cap, Math.min(cap, delta));
}

export function currentSpeed(ball: Ball): number {
  return Math.hypot(ball.vx, ball.vy);
}

/**
 * Level maker — the seeded rebuild of LevelMaker.js. Each level picks a
 * pattern family (checker, pyramid, stripe, sparse); rows grow with the
 * level; tier strength climbs toward the top; and exactly one standing brick
 * is locked, locked bricks yield to no ball until a key bubble opens them.
 */
export function buildLevel(level: number, rng: Rng): Brick[] {
  const rows = Math.min(BRICKS.rowsMax, 3 + Math.floor(level / 2));
  const family = rng.int(4);
  const bricks: Brick[] = [];
  let placed = 0;
  const lockAt = 1 + rng.int(Math.max(8, rows * BRICKS.cols));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < BRICKS.cols; col += 1) {
      let keep = true;
      if (family === 0) keep = (row + col) % 2 === 0;                                  // checker
      else if (family === 1) keep = Math.abs(col - (BRICKS.cols - 1) / 2) <= row + 1;  // pyramid
      else if (family === 2) keep = row % 2 === 0 || rng.int(2) === 0;                  // stripe + scatter
      else keep = rng.int(3) !== 0;                                                    // sparse
      if (!keep) continue;
      placed += 1;
      const locked = placed === lockAt;
      bricks.push({ col, row, health: locked ? 1 : rows - row, locked });
    }
  }
  return bricks;
}

export function brickRect(brick: Brick): { left: number; right: number; top: number; bottom: number } {
  const left = BRICKS.side + brick.col * (BRICK_W + BRICKS.gap);
  const top = BRICKS.top + brick.row * (BRICKS.height + BRICKS.gap);
  return { left, right: left + BRICK_W, top, bottom: top + BRICKS.height };
}

/** Serve launch — the same seeded ratio table as the pong court, upward. */
function serveRatio(rng: Rng): [number, number] {
  const pick = [[0, 1], [1, 1], [2, 1], [1, 2], [0.4, 1]][rng.int(5)];
  const side = rng.int(2) === 0 ? -1 : 1;
  return [side * pick[0], -1];
}

/** One perk per POWERUP_EVERY destroyed bricks; a key only while one is locked. */
function rollDrop(state: BreakoutState, atX: number, atY: number): void {
  state.sinceDrop += 1;
  if (state.sinceDrop < POWERUP_EVERY) return;
  state.sinceDrop = 0;
  const lockedAlive = state.bricks.some((brick) => brick.locked && brick.health > 0);
  const roll = state.rng.int(10);
  let kind: Drop["kind"];
  if (roll < 3) kind = lockedAlive ? "key" : "multiball";
  else if (roll < 6) kind = "heart";
  else kind = "multiball";
  state.drops.push({ x: atX, y: atY, kind });
}

export const breakoutGame: ArcadeGame = {
  id: "breakout",
  version: 1,
  tps: 60,
  maxTicks: MAX_TICKS,
  runLifetimeMs: 30 * 60_000,
  defaultInput: [Math.round(ARENA.width / 2)],
  inputLength: 1,
  parseTuple: tupleParser(1, [[0, ARENA.width]]),
  create(seed) {
    const rng = new Rng(seed);
    return {
      tick: 0, score: 0, ended: false, sfx: [],
      playerX: ARENA.width / 2, paddleWidth: PADDLE.baseWidth,
      lives: LIVES_START, level: 1,
      bricks: buildLevel(1, rng),
      balls: [], drops: [], hasKey: false, sinceDrop: 0,
      serving: SERVE_DELAY, rng,
    } as never;
  },
  step(blank, input) {
    const state = blank as unknown as BreakoutState;
    if (state.ended) return;
    state.sfx.length = 0;
    state.tick += 1;

    if (state.tick >= MAX_TICKS) { // the clock outruns every wall
      state.ended = true;
      state.sfx.push("lose");
      return;
    }

    // Paddle reach: grows on score milestones, snaps back per heart spent.
    const targetWidth = PADDLE.baseWidth + Math.floor(state.score / PADDLE_GROW_EVERY) * PADDLE.growBonus -
      (LIVES_START - state.lives) * PADDLE.lossPenalty;
    state.paddleWidth = Math.max(PADDLE.minShrink, Math.min(ARENA.width / 2, targetWidth));

    state.playerX = clampAim(state.playerX + cappedDelta(clampAim(input[0]) - state.playerX, PADDLE.playerSpeed));

    if (state.serving > 0) {
      state.serving -= 1;
      if (state.serving === 0) {
        const [ratioX, ratioY] = serveRatio(state.rng);
        const length = Math.hypot(ratioX, ratioY);
        state.balls = [{ x: state.playerX, y: PLAYER_Y - PADDLE_FACE,
          vx: (ratioX / length) * BALL_SLOW, vy: -(1 / length) * BALL_SLOW * Math.abs(ratioY) }];
        state.sfx.push("serve");
      }
      return;
    }

    // Power-ups fall, get caught on the paddle's reach, or sink off screen.
    for (const drop of state.drops) drop.y += POWERUP_FALL;
    const standing: Drop[] = [];
    for (const drop of state.drops) {
      const caught = drop.y >= PLAYER_Y - PADDLE_FACE - 10 &&
        Math.abs(drop.x - state.playerX) <= state.paddleWidth / 2 + 10;
      if (caught) applyDrop(state, drop);
      else if (drop.y < ARENA.height + 10) standing.push(drop);
    }
    state.drops = standing;

    const survivors: Ball[] = [];
    let lost = 0;
    for (const ball of state.balls) {
      if (advanceBall(state, ball, state.paddleWidth / 2)) survivors.push(ball);
      else lost += 1;
    }
    state.balls = survivors;
    if (state.balls.length === 0) {
      state.lives -= 1;
      state.hasKey = false; // a fresh serve re-rolls the key
      if (state.lives <= 0) { state.ended = true; state.sfx.push("lose"); return; }
      state.serving = SERVE_DELAY;
      state.sfx.push("concede");
      return;
    }
    if (lost > 0) state.sfx.push("concede"); // a stray bubble; the rally lives on
  },
};

function advanceBall(state: BreakoutState, ball: Ball, paddleHalf: number): boolean {
  const previousY = ball.y;
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x < BALL_RADIUS) {
    ball.x = 2 * BALL_RADIUS - ball.x;
    ball.vx = Math.abs(ball.vx);
    state.sfx.push("wall");
  } else if (ball.x > ARENA.width - BALL_RADIUS) {
    ball.x = 2 * (ARENA.width - BALL_RADIUS) - ball.x;
    ball.vx = -Math.abs(ball.vx);
    state.sfx.push("wall");
  }
  if (ball.y < BALL_RADIUS) {
    ball.y = 2 * BALL_RADIUS - ball.y;
    ball.vy = Math.abs(ball.vy);
    state.sfx.push("wall");
  }

  const contactY = PLAYER_Y - PADDLE_FACE;
  if (ball.vy > 0 && previousY < contactY && ball.y >= contactY &&
      Math.abs(ball.x - state.playerX) <= paddleHalf + BALL_RADIUS) {
    reflectFromPaddle(state, ball);
    state.sfx.push("paddle");
  }

  for (const brick of state.bricks) {
    if (brick.health <= 0) continue;
    const rect = brickRect(brick);
    if (ball.x < rect.left - BALL_RADIUS || ball.x > rect.right + BALL_RADIUS) continue;
    if (ball.y < rect.top - BALL_RADIUS || ball.y > rect.bottom + BALL_RADIUS) continue;
    hitBrick(state, brick, ball);
    break; // one brick impact per tick
  }

  return ball.y - BALL_RADIUS <= ARENA.height;
}

/** Angle off the paddle face, horizontal capped, current speed preserved. */
function reflectFromPaddle(state: BreakoutState, ball: Ball): void {
  const offset = Math.max(-1, Math.min(1, (ball.x - state.playerX) / (state.paddleWidth / 2)));
  const ratioX = offset * MAX_X_RATIO;
  const length = Math.hypot(ratioX, 1);
  const speed = currentSpeed(ball);
  ball.vx = (ratioX / length) * speed;
  ball.vy = -(1 / length) * speed;
  ball.y = Math.min(ball.y, PLAYER_Y - PADDLE_FACE);
}

function hitBrick(state: BreakoutState, brick: Brick, ball: Ball): void {
  if (brick.locked && !state.hasKey) {
    state.sfx.push("locked");
    bounceOffBrick(brick, ball);
    return;
  }
  const wasLocked = brick.locked;
  // A brick is worth its own health: tougher tiers pay more, and rows reach
  // six at high levels, so the value is the health itself rather than a table.
  state.score += wasLocked ? BRICKS.lockedPoints : brick.health;
  brick.health = 0;
  brick.locked = false;
  state.sfx.push(wasLocked ? "unlock" : "brick");
  rollDrop(state, ball.x, ball.y);
  bounceOffBrick(brick, ball);
  if (!state.bricks.some((b) => b.health > 0)) {
    state.level += 1;
    state.sinceDrop = 0;
    state.drops = [];
    state.bricks = buildLevel(state.level, state.rng);
    state.serving = SERVE_DELAY;
    if (state.lives < LIVES_MAX) state.lives += 1;
    state.sfx.push("level");
  }
}

/** Reflect off whichever brick face the bubble struck (penetration depths). */
function bounceOffBrick(brick: Brick, ball: Ball): void {
  const rect = brickRect(brick);
  const dx = ball.x - (rect.left + rect.right) / 2;
  const dy = ball.y - (rect.top + rect.bottom) / 2;
  const overlapX = (BRICK_W / 2 + BALL_RADIUS) - Math.abs(dx);
  const overlapY = (BRICKS.height / 2 + BALL_RADIUS) - Math.abs(dy);
  if (overlapY < overlapX) {
    ball.vy = dy < 0 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
    ball.y = dy < 0 ? rect.top - BALL_RADIUS : rect.bottom + BALL_RADIUS;
  } else {
    ball.vx = dx < 0 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
    ball.x = dx < 0 ? rect.left - BALL_RADIUS : rect.right + BALL_RADIUS;
  }
}

function applyDrop(state: BreakoutState, drop: Drop): void {
  if (drop.kind === "heart") {
    if (state.lives < LIVES_MAX) { state.lives += 1; state.sfx.push("heart-up"); }
    else { state.score += 3; state.sfx.push("score"); }
    return;
  }
  if (drop.kind === "key") { state.hasKey = true; state.sfx.push("key"); return; }
  if (state.balls.length === 0 || state.balls.length > MAX_BALLS - 2) return;
  // multiball: two extra bubbles peel off the first, arcing separately
  for (const offset of [-46, 46]) {
    const ball = { ...state.balls[0] };
    ball.x += offset;
    ball.y = PLAYER_Y - PADDLE_FACE - 6;
    ball.vx = (offset > 0 ? 0.55 : -0.55) * BALL_SLOW * 1.15;
    ball.vy = -0.85 * BALL_SLOW * 1.15;
    state.balls.push(ball);
  }
  state.sfx.push("multiball");
}
