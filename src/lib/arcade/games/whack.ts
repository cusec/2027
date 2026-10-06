import type { ArcadeGame } from "../types";
import { Rng, tupleParser } from "../types";

/**
 * Whack-a-Delegate — Cubears pop out of conference holes on a seeded
 * schedule; a tap on a live Cubear's hole banks a point. Teammates pop up
 * too; a tap on a teammate drops a point (never below zero) and wastes the
 * pop. Three whiffs on empty holes end the run; a 60-second clock also ends
 * it, at which point the score stands.
 *
 * Determinism: the spawn schedule (hole, kind, up/down ticks, gap ticks)
 * flows from the seeded RNG inside `step()`; a tap records its hole index.
 */
export const ARENA = { width: 480, height: 640 } as const;
export const HOLES: readonly [number, number][] = [
  [96, 330], [240, 330], [384, 330],
  [96, 425], [240, 425], [384, 425],
  [96, 520], [240, 520], [384, 520],
];
export const CLOCK_TICKS = 60 * 60; // sixty seconds, then the score stands
export const WHIFF_LIMIT = 3;
export type WhackState = {
  tick: number;
  score: number;
  ended: boolean;
  sfx: string[];
  current: { hole: number; kind: "bear" | "friend"; upTick: number; downTick: number } | null;
  nextUp: number; // spawn tick of the next pop
  whiffs: number;
  rng: number;
};

function nextPop(state: WhackState): void {
  const rng = new Rng(state.rng);
  const gap = 10 + rng.int(46); // rest between pops
  state.nextUp = state.tick + gap;
  state.current = {
    hole: rng.int(HOLES.length),
    kind: rng.int(6) === 0 ? "friend" : "bear",
    upTick: state.tick,
    downTick: state.tick + gap + 26 + rng.int(32),
  };
  state.rng = rng.snapshot();
}

/** After an immediate re-pop, pull the rise cadence forward a beat. */
function adjustForFreshPop(state: WhackState, tick: number): void {
  if (!state.current) return;
  state.nextUp = tick + 6;
  state.current.upTick = tick + 6;
}

export const whackGame: ArcadeGame = {
  id: "whack",
  version: 1,
  tps: 60,
  maxTicks: CLOCK_TICKS,
  runLifetimeMs: 30 * 60_000,
  defaultInput: [9],
  inputLength: 1,
  parseTuple: tupleParser(1, [[0, HOLES.length]]),
  create(seed) {
    const state = {
      tick: 0, score: 0, ended: false, sfx: [],
      current: null, nextUp: 20, whiffs: 0, rng: seed >>> 0,
    };
    return state;
  },
  step(blank, input) {
    const state = blank as unknown as WhackState;
    if (state.ended) return;
    state.sfx.length = 0;
    state.tick += 1;

    const tapHole = input[0];
    const tapped = tapHole < HOLES.length;
    if (tapped && state.current && state.current.hole === tapHole && state.tick <= state.current.downTick) {
      // A tap on the live pop: bears bank, teammates cost one.
      if (state.current.kind === "bear") {
        state.score += 1;
        state.sfx.push("bonk");
      } else {
        state.score = Math.max(0, state.score - 1);
        state.sfx.push("friend");
      }
      state.current = null;
      nextPop(state);
      adjustForFreshPop(state, state.tick);
      return;
    }
    if (tapped) { // a swing at an already-popped hole: one whiff closer to over
      state.whiffs += 1;
      state.sfx.push("whiff");
      if (state.whiffs >= WHIFF_LIMIT) { state.ended = true; state.sfx.push("lose"); return; }
    }

    if (state.current && state.tick >= state.current.downTick) {
      state.current = null;
      nextPop(state);
    } else if (!state.current && state.tick >= state.nextUp) {
      nextPop(state);
    }

    if (state.tick >= CLOCK_TICKS) { state.ended = true; state.sfx.push("win"); return; }
  },
};
