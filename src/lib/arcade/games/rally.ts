import { ARENA, createRally, stepRally } from "../../rally/simulation";
import type { ArcadeGame, ArcadeState } from "../types";
import { tupleParser } from "../types";

/**
 * The original Cubear Rally, wrapped in the arcade contract.
 *
 * The wrapped sim is the exact math from src/lib/rally/simulation.ts — do not
 * "port" it into arcade types, because outstanding ranked runs were recorded
 * against that version and must still verify server-side, tick for tick.
 *
 * The sim itself emits no effects (it predates the sfx queue), so the wrapper
 * infers them from before/after state deltas. Deltas never change the final
 * state, so the replayed score is identical whether or not effects play.
 */
type RallyState = ReturnType<typeof createRally> & { sfx: string[] };

export const rallyGame: ArcadeGame = {
  id: "rally",
  version: 1,
  tps: 60,
  maxTicks: 10_800,
  runLifetimeMs: 30 * 60_000,
  defaultInput: [Math.round(ARENA.width / 2)],
  inputLength: 1,
  parseTuple: tupleParser(1, [[0, ARENA.width]]),
  create(seed) {
    return { ...createRally(seed), sfx: [] } as unknown as ArcadeState;
  },
  step(blank, input) {
    const rally = blank as unknown as RallyState & ReturnType<typeof createRally>;
    const before = { score: rally.score, vx: rally.vx, vy: rally.vy };
    stepRally(rally, input[0]);
    rally.sfx.length = 0;
    if (rally.score !== before.score) rally.sfx.push("paddle");
    else if (rally.ended) rally.sfx.push("miss");
    else if (rally.vx !== before.vx || rally.vy * before.vy < 0) rally.sfx.push("wall");
  },
};
