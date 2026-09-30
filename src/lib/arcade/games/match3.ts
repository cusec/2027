import type { ArcadeGame } from "../types";
import { Rng, tupleParser } from "../types";

/**
 * Tile Sweep — the 2-match3 assignment adapted: an 8×8 board of patterned
 * tiles, cascades, time bought back by matches, level-locked tile patterns
 * and a rare star tile that drowns a whole row when it joins a match.
 *
 * Determinism notes:
 * - board refills roll from the seeded RNG inside `step()`;
 * - a swap that produces no match reverts (assignment rule), so the board
 *   can't be fished for a result with rejected swaps;
 * - the run ends when the time budget drains — it is only extended by
 *   cascades, never by stalling.
 *
 * Ranked score = matched tile values. The clock is stored in ticks (60 per
 * second) so the transcript grid and the clock share one integer timeline.
 */
export const SIZE = 8;
const CELLS = SIZE * SIZE;
export const KINDS_BASE = 3; // tile patterns 0..KINDS_BASE-1 exist at level 1
export const KINDS_MAX = 6;
/** The one kind above the patterns: a wildcard worth a drowned row. */
export const STAR = 6;
const WILDCARD = STAR;
const TIME_START_TICKS = 120 * 60; // 120 s on the 60 Hz grid
const TIME_MAX_TICKS = 180 * 60;
/** One cascade wave buys exactly this many ticks (two seconds). */
const TIME_PER_WAVE = 2 * 60;
export const LEVEL_GOAL = 400;
/** Odds a refilled tile is a star: 1 in this many. */
const STAR_ODDS = 40;

export type Match3State = {
  tick: number;
  score: number;
  ended: boolean;
  sfx: string[];
  timeTicks: number;
  level: number;
  board: number[]; // row-major 8×8; -1 is an empty cell mid-sweep
  rng: Rng;
};

type Run = { cells: number[]; starCell: number | null };

function kindSpread(level: number): number {
  return Math.min(KINDS_MAX, KINDS_BASE + level);
}

function adjacent(a: number, b: number): boolean {
  if (a < 0 || a >= CELLS || b < 0 || b >= CELLS || a === b) return false;
  const rowA = Math.floor(a / SIZE);
  const rowB = Math.floor(b / SIZE);
  return Math.abs(rowA - rowB) + Math.abs((a % SIZE) - (b % SIZE)) === 1;
}

/**
 * Horizontal and vertical runs of ≥3, star-aware: a star tile extends a run
 * of any kind it sits inside, and the first star in a run marks its row for
 * drowning when the wave sweeps.
 */
function findRuns(board: readonly number[]): Run[] {
  const runs: Run[] = [];
  for (let axis = 0; axis < 2; axis += 1) {
    for (let line = 0; line < SIZE; line += 1) {
      let anchor = -1;
      let cells: number[] = [];
      const close = () => {
        if (cells.length >= 3) {
          const starCell = cells.find((cell) => board[cell] === WILDCARD) ?? null;
          runs.push({ cells, starCell });
        }
      };
      for (let c = 0; c < SIZE; c += 1) {
        const index = axis === 0 ? line * SIZE + c : c * SIZE + line;
        const kind = board[index];
        const wildcard = kind === WILDCARD;
        if (anchor >= 0 && (kind === anchor || wildcard || anchor === WILDCARD)) {
          // Runs continue through stars and same-kind neighbours; a run seeded
          // on a star adopts the first ordinary kind it meets as its anchor.
          if (anchor === WILDCARD && kind !== WILDCARD) anchor = kind;
          cells.push(index);
          continue;
        }
        close();
        anchor = -1;
        cells = [];
        if (kind >= 0) { anchor = kind; cells = [index]; }
      }
      close();
    }
  }
  return runs;
}

/**
 * Sweep one wave of matches: score them, drown rows that carry a star,
 * drain the tiles and let gravity rebuild. One wave per tick keeps the
 * cascade visible to the player and identical for the replay.
 */
function sweepWave(state: Match3State): void {
  const runs = findRuns(state.board);
  if (runs.length === 0) return;
  const doomed = new Set<number>();
  for (const run of runs) {
    for (const cell of run.cells) {
      doomed.add(cell);
      if (run.starCell !== null) {
        const row = Math.floor(run.starCell / SIZE);
        for (let col = 0; col < SIZE; col += 1) doomed.add(row * SIZE + col);
      }
    }
  }
  for (const cell of doomed) state.score += (state.board[cell] + 1) * 5;
  state.timeTicks = Math.min(TIME_MAX_TICKS, state.timeTicks + TIME_PER_WAVE);
  for (const cell of doomed) state.board[cell] = -1;
  refill(state);
  state.sfx.push("pop");
}

/** Tiles fall into holes; the top refills with seeded, level-legal patterns. */
function refill(state: Match3State): void {
  for (let col = 0; col < SIZE; col += 1) {
    const column: number[] = [];
    for (let row = SIZE - 1; row >= 0; row -= 1) {
      const kind = state.board[row * SIZE + col];
      if (kind >= 0) column.push(kind);
    }
    // column[0] is bottom-most; restored top-down over any empty head cells.
    for (let row = SIZE - 1; row >= 0; row -= 1) {
      const alive = column[SIZE - 1 - row];
      if (alive >= 0) state.board[row * SIZE + col] = alive;
      else {
        const star = state.rng.int(STAR_ODDS) === 0;
        state.board[row * SIZE + col] = star ? WILDCARD : state.rng.int(kindSpread(state.level));
      }
    }
  }
}

function boardHasRun(board: readonly number[]): boolean {
  return findRuns(board).length > 0;
}

export const match3Game: ArcadeGame = {
  id: "match3",
  version: 1,
  tps: 60,
  maxTicks: 32_400, // 9 minutes on the clock grid at worst
  runLifetimeMs: 30 * 60_000,
  defaultInput: [0, 0, 0],
  inputLength: 3,
  parseTuple: tupleParser(3, [[0, 2], [0, CELLS - 1], [0, CELLS - 1]]),
  create(seed) {
    const rng = new Rng(seed);
    const state: Match3State = {
      tick: 0, score: 0, ended: false, sfx: [],
      timeTicks: TIME_START_TICKS, level: 1, board: new Array<number>(CELLS).fill(0), rng,
    };
    seedBoard(state);
    return state as never;
  },
  step(blank, input) {
    const state = blank as unknown as Match3State;
    if (state.ended) return;
    state.sfx.length = 0;

    const stable = !boardHasRun(state.board);
    const [action, a, b] = input;
    if (action === 1 && stable && adjacent(a, b)) {
      const board = state.board;
      const from = board[a];
      board[a] = board[b];
      board[b] = from;
      if (boardHasRun(board)) { state.sfx.push("swap"); }
      else { // reverts: only swaps that match are allowed
        board[b] = board[a];
        board[a] = from;
        state.sfx.push("nomatch");
      }
    } else if (action === 2) state.sfx.push("hint");

    if (boardHasRun(state.board)) sweepWave(state);

    state.tick += 1;
    state.timeTicks -= 1;
    if (state.timeTicks <= 0) { state.ended = true; state.sfx.push("lose"); return; }

    if (state.score >= state.level * LEVEL_GOAL) { state.level += 1; state.sfx.push("level"); }
  },
};

/** Fill the board fresh: no premade run, spread exactly at level-one width. */
function seedBoard(state: Match3State): void {
  const spread = kindSpread(1);
  for (let cell = 0; cell < CELLS; cell += 1) {
    let kind = state.rng.int(spread);
    while ((cell % SIZE >= 2 && state.board[cell - 1] === kind && state.board[cell - 2] === kind) ||
           (cell >= SIZE * 2 && state.board[cell - SIZE] === kind && state.board[cell - 2 * SIZE] === kind)) {
      kind = state.rng.int(spread);
    }
    state.board[cell] = kind;
  }
}
