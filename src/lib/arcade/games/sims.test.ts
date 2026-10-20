import { describe, expect, it } from "vitest";
import { flappyGame } from "./flappy";
import { stackGame } from "./stack";
import { whackGame } from "./whack";
import { rallyGame } from "./rally";
import { replayTranscript } from "../types";
import type { ArcadeTranscript } from "../types";

describe("arcade sims", () => {
  it("every mode ends an idle run and replays it to the same score", () => {
    for (const game of [flappyGame, stackGame, whackGame, rallyGame]) {
      for (const seed of [0, 1, 0xffffffff, 1234567]) {
        const state = game.create(seed);
        while (!state.ended && state.tick < game.maxTicks) game.step(state, game.defaultInput);
        expect(state.ended).toBe(true);
        const transcript: ArcadeTranscript = { inputs: [], finalTick: state.tick };
        expect(replayTranscript(game, seed, transcript)).toBe(state.score);
      }
    }
  });

  it("flappy: tapping flies, idling lands, and a transcript past the ending is rejected", () => {
    // An idle bird falls onto the ground quickly.
    const idle = flappyGame.create(4);
    while (!idle.ended && idle.tick < flappyGame.maxTicks) flappyGame.step(idle, flappyGame.defaultInput);
    expect(idle.tick).toBeLessThan(600);
    // A tapped bird stays airborne far longer than the idle one (blind taps
    // still die on pipes eventually, but never inside the first seconds).
    const tapping = flappyGame.create(4);
    while (!tapping.ended && tapping.tick < 6_000) {
      flappyGame.step(tapping, [tapping.tick % 12 === 0 ? 1 : 0]);
    }
    expect(tapping.tick).toBeGreaterThan(idle.tick * 4);
    const transcript: ArcadeTranscript = { inputs: [], finalTick: idle.tick };
    expect(replayTranscript(flappyGame, 4, { ...transcript, finalTick: idle.tick + 1 })).toBeNull();
  });

  it("stack: idling never stacks, so the tap ceiling ends a lazily idle run", () => {
    const idle = stackGame.create(9);
    while (!idle.ended && idle.tick < stackGame.maxTicks) stackGame.step(idle, stackGame.defaultInput);
    expect(idle.score).toBe(0); // no taps, no hats
  });

  it("whack: idling lets the clock run out with zero bonks", () => {
    const idle = whackGame.create(2);
    while (!idle.ended && idle.tick < whackGame.maxTicks) whackGame.step(idle, whackGame.defaultInput);
    expect(idle.score).toBe(0);
    expect(idle.tick).toBe(whackGame.maxTicks);
  });

  it("replay rejects a transcript that ends before the real ending", () => {
    const idle = flappyGame.create(11);
    while (!idle.ended && idle.tick < flappyGame.maxTicks) flappyGame.step(idle, flappyGame.defaultInput);
    const transcript: ArcadeTranscript = { inputs: [], finalTick: Math.max(1, Math.floor(idle.tick / 2)) };
    expect(replayTranscript(flappyGame, 11, transcript)).toBeNull();
  });

  it("determinism: the same seed and transcript always replay to the same score", () => {
    const state = flappyGame.create(77);
    while (!state.ended && state.tick < flappyGame.maxTicks) flappyGame.step(state, flappyGame.defaultInput);
    const transcript: ArcadeTranscript = { inputs: [], finalTick: state.tick };
    const first = replayTranscript(flappyGame, 77, transcript);
    const second = replayTranscript(flappyGame, 77, transcript);
    expect(first).toBe(state.score);
    expect(second).toBe(first);
  });
});
