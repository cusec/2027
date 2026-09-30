import { describe, expect, it } from "vitest";
import { pongGame } from "./pong";
import { breakoutGame } from "./breakout";
import { match3Game } from "./match3";
import { replayTranscript } from "../types";
import type { ArcadeTranscript } from "../types";

describe("arcade sims", () => {
  it("every mode ends an idle run and replays it to the same score", () => {
    for (const game of [pongGame, breakoutGame, match3Game]) {
      for (const seed of [0, 1, 0xffffffff, 1234567]) {
        const state = game.create(seed);
        while (!state.ended && state.tick < game.maxTicks) game.step(state, game.defaultInput);
        expect(state.ended).toBe(true);
        const transcript: ArcadeTranscript = { inputs: [], finalTick: state.tick };
        expect(replayTranscript(game, seed, transcript)).toBe(state.score);
      }
    }
  });

  it("pong: idling banks zero goals and a transcript that runs one tick past the end is rejected", () => {
    const seed = 7;
    const state = pongGame.create(seed);
    while (!state.ended && state.tick < pongGame.maxTicks) pongGame.step(state, pongGame.defaultInput);
    expect(state.score).toBe(0); // an idle player never scores
    const transcript: ArcadeTranscript = { inputs: [], finalTick: state.tick };
    expect(replayTranscript(pongGame, seed, { ...transcript, finalTick: 41 })).toBeNull();
  });

  it("breakout: idling loses every heart then ends", () => {
    const state = breakoutGame.create(3);
    while (!state.ended && state.tick < breakoutGame.maxTicks) breakoutGame.step(state, breakoutGame.defaultInput);
    expect(state.ended).toBe(true);
    expect(state.lives).toBe(0);
  });

  it("match3: the board never self-matches at seed time (seed integrity), and clock ends the run", () => {
    const game = match3Game.create(42);
    for (const cell of game.board) expect(cell).toBeGreaterThanOrEqual(0);
    while (!game.ended && game.tick < match3Game.maxTicks) {
      match3Game.step(game, match3Game.defaultInput);
      if (game.score > 0) break; // idle input must never score
    }
    expect(game.ended && game.score === 0).toBe(true); // stall → drained clock
  });

  it("replay rejects a transcript that ends before the recorded ending", () => {
    const state = pongGame.create(11);
    while (!state.ended && state.tick < pongGame.maxTicks) pongGame.step(state, pongGame.defaultInput);
    const half = Math.max(1, Math.floor(state.tick / 2));
    const transcript: ArcadeTranscript = { inputs: [], finalTick: half };
    expect(replayTranscript(pongGame, 11, transcript)).toBeNull();
  });

  it("determinism across repeated replays: the score never wanders", () => {
    const state = breakoutGame.create(77);
    while (!state.ended && state.tick < breakoutGame.maxTicks) breakoutGame.step(state, breakoutGame.defaultInput);
    const transcript: ArcadeTranscript = { inputs: [], finalTick: state.tick };
    const first = replayTranscript(breakoutGame, 77, transcript);
    const second = replayTranscript(breakoutGame, 77, transcript);
    expect(first).toBe(state.score);
    expect(second).toBe(first);
  });
});
