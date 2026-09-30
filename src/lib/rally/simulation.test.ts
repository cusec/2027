import { describe, expect, it } from "vitest";
import { createRally, parseTranscript, replayRally, stepRally } from "./simulation";

describe("Cubear Rally", () => {
  it("ends a missed bubble without awarding a return", () => {
    const result = replayRally(0, { inputs: [], finalTick: 143 });
    expect(result?.score).toBe(0);
    expect(result?.tick).toBe(143);
  });

  it("rejects a transcript that continues after the miss", () => {
    expect(replayRally(0, { inputs: [], finalTick: 144 })).toBeNull();
  });

  it("rejects a run that is still in play", () => {
    expect(replayRally(0, { inputs: [], finalTick: 100 })).toBeNull();
  });

  it("limits movement even when the target jumps across the arena", () => {
    const state = createRally(0);
    stepRally(state, 0);
    expect(state.playerX).toBeCloseTo(233.333333);
  });

  it("keeps the platform inside the arena", () => {
    const state = createRally(0);
    state.playerX = 51;
    stepRally(state, 0);
    expect(state.playerX).toBe(50);
  });

  it("reflects the bubble at the left wall", () => {
    const state = createRally(0);
    Object.assign(state, { x: 11, vx: -220, vy: 0 });
    stepRally(state, 240);
    expect(state.x).toBeCloseTo(16.666667);
    expect(state.vx).toBe(220);
  });

  it("reflects the bubble at the top wall", () => {
    const state = createRally(0);
    Object.assign(state, { y: 11, vx: 0, vy: -220 });
    stepRally(state, 240);
    expect(state.y).toBeCloseTo(16.666667);
    expect(state.vy).toBe(220);
  });

  it("awards one return when the bubble crosses the platform", () => {
    const state = createRally(0);
    Object.assign(state, { x: 240, y: 560, vx: 0, vy: 220 });
    stepRally(state, 240);
    expect(state.score).toBe(1);
    expect(state.vy).toBe(-220);
    expect(state.y).toBeCloseTo(560.333333);
  });

  it("accelerates on the fifth return", () => {
    const state = createRally(0);
    Object.assign(state, { score: 4, x: 240, y: 560, vx: 0, vy: 220 });
    stepRally(state, 240);
    expect(state.score).toBe(5);
    expect(state.vy).toBe(-231);
  });

  it("caps the speed of later returns", () => {
    const state = createRally(0);
    Object.assign(state, { score: 99, x: 240, y: 560, vx: 0, vy: 420 });
    stepRally(state, 240);
    expect(state.vy).toBe(-420);
  });

  it("ends the run at three minutes", () => {
    const state = createRally(0);
    state.tick = 10_799;
    stepRally(state, 240);
    expect(state.ended).toBe(true);
    expect(state.tick).toBe(10_800);
  });

  it.each([
    { inputs: [[0, 100], [0, 200]], finalTick: 143 },
    { inputs: [[1, 100], [0, 200]], finalTick: 143 },
    { inputs: [[0, 480.1]], finalTick: 143 },
    { inputs: [[0, -1]], finalTick: 143 },
    { inputs: [[143, 240]], finalTick: 143 },
    { inputs: [], finalTick: 10_801 },
    { inputs: [], finalTick: 1.1 },
    { inputs: "fake", finalTick: 143 },
  ])("rejects malformed input %j", (value) => {
    expect(parseTranscript(value)).toBeNull();
  });

  it("parses a valid transcript into tick and target pairs", () => {
    expect(parseTranscript({ inputs: [[0, 50], [12, 400]], finalTick: 143 }))
      .toEqual({ inputs: [[0, 50], [12, 400]], finalTick: 143 });
  });
});
