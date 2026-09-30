/**
 * The arcade sim contract.
 *
 * Every mode is a *pure* deterministic simulation: at publish time the server
 * replays the run's recorded inputs from the seed and must land on the exact
 * ending the browser reported, so surface scores can't be cherry-picked
 * mid-run or faked with hand-made transcripts. A sim may only use seed-driven
 * integer RNG and plain arithmetic — no Date.now(), no Math.random(), no DOM.
 *
 * A game also never talks to React directly. The cabinet component drives
 * it and reads `state.sfx` — an event queue cleared each step, so emitting
 * effects can never change the replayed outcome.
 *
 * Transcendental functions (`Math.sin/cos/pow/exp`) are used sparingly and
 * never where a ulp could flip a game outcome: deciding comparisons stay in
 * integer or simple float arithmetic. The original Cubear Rally already
 * leans on them (its serve angle comes from Math.sin/Math.cos).
 *
 * Input events are stored as `[tick, ...tuple]`. `step()` only ever sees the
 * tuple (the event minus its tick); `defaultInput` is a bare tuple, applied
 * on every tick without an event. Recorded ticks strictly increase and are
 * read on the tick they land on.
 */

export type GameId = "rally" | "pong" | "breakout" | "match3";

export type ArcadeInput = readonly number[];

export type ArcadeTranscript = { readonly inputs: readonly unknown[]; readonly finalTick: number };

export type ArcadeState = {
  tick: number;
  score: number;
  ended: boolean;
  /** Effects emitted by this step. Played client-side; ignored by the replay. */
  sfx: string[];
};

export type ArcadeGame = {
  id: GameId;  /** Bump this to invalidate every outstanding ranked run of the mode. */
  version: number;
  /** Fixed logical tick rate. Inputs are recorded on this grid, never per frame. */
  tps: number;
  /** Absolute tick ceiling; a transcript past it is invalid by construction. */
  maxTicks: number;
  /** Wall-clock ceiling for finishing a ranked run, measured from start. */
  runLifetimeMs: number;
  /** Tuple applied on every tick without an event. */
  defaultInput: ArcadeInput;
  /** Tuple length; a stored event is exactly this plus one leading tick. */
  inputLength: number;
  /** Validate a bare input tuple (no tick). Rejects wrong length, non-integers, out-of-range values. */
  parseTuple(value: unknown): ArcadeInput | null;
  create(seed: number): ArcadeState;
  /** Advance one tick. Same inputs → same ending, bit for bit. */
  step(state: ArcadeState, input: ArcadeInput): void;
};

export type ParsedEvent = { tick: number; tuple: ArcadeInput };
export type ParsedTranscript = { finalTick: number; events: readonly ParsedEvent[] };

/** xorshift32: integer-only, seed-driven, 2^32-step period, shares nothing. */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = (seed >>> 0) || 0x9e3779b9; }
  /** Uniform [0, 1), integer math only. */
  next(): number { return (this.nextRaw() >>> 8) / 0x1000000; }
  /** Uniform integer in [0, bound). */
  int(bound: number): number { return Math.min(bound - 1, Math.floor(this.next() * bound)); }
  nextRaw(): number {
    let s = this.s;
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    this.s = s;
    return s;
  }
}

/**
 * Validate one transcript against a game: the `{ inputs, finalTick }` shape,
 * the tick grid, and every event through the game's own tuple check.
 */
export function parseEventStream(
  value: unknown,
  game: Pick<ArcadeGame, "inputLength" | "maxTicks" | "parseTuple">,
): ParsedTranscript | null {
  if (!value || typeof value !== "object" || !("inputs" in value) || !("finalTick" in value)) return null;
  const { inputs, finalTick } = value as Record<string, unknown>;
  if (typeof finalTick !== "number" || !Number.isInteger(finalTick) ||
      finalTick < 1 || finalTick > game.maxTicks) return null;
  if (!Array.isArray(inputs) || inputs.length > game.maxTicks) return null;
  const events: ParsedEvent[] = [];
  let previous = -1;
  for (const entry of inputs) {
    if (!Array.isArray(entry) || entry.length !== game.inputLength + 1) return null;
    const tick = entry[0];
    if (typeof tick !== "number" || !Number.isInteger(tick) ||
        tick < 0 || tick >= finalTick || tick <= previous) return null;
    const tuple = game.parseTuple(entry.slice(1));
    if (!tuple) return null;
    events.push({ tick, tuple });
    previous = tick;
  }
  return { finalTick, events };
}

/**
 * Strict tick-wise replay — the shared core of the browser loop and the
 * server verifier. The run stops early only through `ended`; a transcript
 * that stops before the ending the seed produces, or continues past one, is
 * rejected and returns null.
 */
export function replayTranscript(
  game: Pick<ArcadeGame, "inputLength" | "maxTicks" | "parseTuple" | "defaultInput" | "create" | "step">,
  seed: number,
  value: unknown,
): number | null {
  const transcript = parseEventStream(value, game);
  if (!transcript) return null;
  const { finalTick, events } = transcript;
  const state = game.create(seed);
  let index = 0;
  let input = game.defaultInput;
  while (state.tick < finalTick && !state.ended) {
    if (index < events.length && events[index].tick === state.tick) { input = events[index].tuple; index += 1; }
    game.step(state, input);
  }
  return state.ended && state.tick === finalTick ? state.score : null;
}

/** Build a bare-tuple validator from an exact length and per-cell ranges. */
export function tupleParser(length: number, ranges: readonly (readonly [min: number, max: number])[]) {
  if (ranges.length !== length) throw new Error("ranges must cover every tuple cell");
  return (value: unknown): ArcadeInput | null => {
    if (!Array.isArray(value) || value.length !== length) return null;
    const out: number[] = [];
    for (let i = 0; i < length; i += 1) {
      const n = value[i];
      if (typeof n !== "number" || !Number.isInteger(n)) return null;
      if (n < ranges[i][0] || n > ranges[i][1]) return null;
      out.push(n);
    }
    return out;
  };
}
