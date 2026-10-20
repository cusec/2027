import type { ArcadeGame } from "../types";
import { Rng, tupleParser } from "../types";

/**
 * Stack the Hat — a hat sways across the sky; a tap drops it onto the tower.
 * Whatever hangs over the edge is cut away, so the landing plate drifts and
 * shrinks as the tower climbs. A drop that lands fully off the plate sinks
 * and ends the run; a perfect drop (dead-centre) banks a bonus and widens
 * the plate back a touch.
 *
 * Determinism: the swaying hat's x is a pure tick-space triangle wave (no
 * trigonometry) whose starting phase comes from the seed; a tap records the
 * drop tick, and the sim resolves the whole landing within that one step.
 */
export const ARENA = { width: 480, height: 640 } as const;
export const PLATE = { width: 155, height: 32 } as const; // brim per hat
export const SWING_SPEED = 2.6; // px per tick
export const SWING_RANGE = 340; // full travel across the arena
export const PERFECT_ZONE = 7; // px either side of dead-centre
export const MISS_LIMIT = 9; // narrower than this, the hat sinks the run
export const MAX_TICKS = 28_800; // an eight-minute run is a lifetime here

export type Plate = { x: number; width: number };
export type StackState = {
  tick: number;
  score: number;
  ended: boolean;
  sfx: string[];
  phase: number; // sway start offset, in ticks, seeded
  plates: Plate[]; // bottom-up; [0] is the ground plate
};

/** Triangle-wave position of the swaying hat's centre at a given tick. */
export function swayCentre(tick: number, phase: number): number {
  const period = SWING_RANGE / SWING_SPEED; // full traversal in ticks
  const u = ((tick + phase) % period) / period;
  const tri = u < 0.5 ? u * 2 : 2 - u * 2; // 0..1..0, no trig
  return ARENA.width / 2 - SWING_RANGE / 2 + tri * SWING_RANGE;
}

export const stackGame: ArcadeGame = {
  id: "stack",
  version: 1,
  tps: 60,
  maxTicks: MAX_TICKS,
  runLifetimeMs: 30 * 60_000,
  defaultInput: [0],
  inputLength: 1,
  parseTuple: tupleParser(1, [[0, 1]]),
  create(seed) {
    const rng = new Rng(seed);
    const phase = rng.int(Math.round(SWING_RANGE / SWING_SPEED));
    return {
      tick: 0, score: 0, ended: false, sfx: [],
      phase, plates: [{ x: ARENA.width / 2, width: PLATE.width }],
    };
  },
  /** Advance one tick: `input[1] === 1` records this tick's drop. */
  step(blank, input) {
    const state = blank as unknown as StackState;
    if (state.ended) return;
    state.sfx.length = 0;
    state.tick += 1;
    if (state.tick >= MAX_TICKS) { state.ended = true; state.sfx.push("lose"); return; }
    if (input[0] !== 1) return;

    // The hat lands on the top plate: both are full PLATE.width blocks.
    const hatX = swayCentre(state.tick, state.phase);
    const top = state.plates[state.plates.length - 1];
    const left = Math.max(hatX - PLATE.width / 2, top.x - top.width / 2);
    const right = Math.min(hatX + PLATE.width / 2, top.x + top.width / 2);
    const width = right - left;
    if (width < MISS_LIMIT) { // effectively nothing supported it: the run ends
      state.ended = true;
      state.sfx.push("lose");
      return;
    }
    state.plates.push({ x: (left + right) / 2, width });
    if (Math.abs(hatX - top.x) <= PERFECT_ZONE) {
      // Perfect: the top plate heals back toward full instead of shrinking.
      state.plates[state.plates.length - 1] = { x: top.x, width: Math.min(PLATE.width, width + 9) };
      state.score += 2;
      state.sfx.push("perfect");
    } else {
      state.score += 1;
      state.sfx.push("plop");
    }
  },
};
