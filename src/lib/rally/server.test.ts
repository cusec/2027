import { describe, expect, it, vi } from "vitest";
vi.hoisted(() => { process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27028"; });
import { RallyError, verifyRun } from "./server";

const run = { seed: 0, version: 1, startedAt: new Date(0) };
const transcript = { inputs: [], finalTick: 143 };

describe("ranked rally verification", () => {
  it("computes the score from a valid ending", () => {
    expect(verifyRun(run, transcript, 3000)).toBe(0);
  });

  it("rejects runs submitted faster than the simulation", () => {
    expect(() => verifyRun(run, transcript, 2000)).toThrowError(new RallyError(422, "Run submitted too soon"));
  });

  it("rejects expired runs", () => {
    expect(() => verifyRun(run, transcript, 1_800_001)).toThrowError(new RallyError(410, "Run expired"));
  });

  it("rejects unknown simulation versions", () => {
    expect(() => verifyRun({ ...run, version: 2 }, transcript, 3000)).toThrowError(new RallyError(409, "Run version changed"));
  });

  it("rejects a transcript that stops before a loss", () => {
    expect(() => verifyRun(run, { inputs: [], finalTick: 100 }, 3000))
      .toThrowError(new RallyError(422, "Run has no valid ending"));
  });
});
