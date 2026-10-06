export const ARENA = { width: 480, height: 640, radius: 12, platformWidth: 100, platformY: 574 } as const;
export const VERSION = 1;
export const MAX_TICKS = 10_800;
export const TICKS_PER_SECOND = 60;

export type Input = readonly [tick: number, target: number];
export type Transcript = { readonly inputs: readonly Input[]; readonly finalTick: number };
export type RallyState = {
  tick: number;
  score: number;
  playerX: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ended: boolean;
};

export function createRally(seed: number): RallyState {
  const angle = ((seed >>> 0) / 0xffffffff - 0.5) * Math.PI / 3;
  return { tick: 0, score: 0, playerX: 240, x: 240, y: 200,
    vx: Math.sin(angle) * 220, vy: Math.cos(angle) * 220, ended: false };
}

export function stepRally(state: RallyState, target: number): void {
  if (state.ended) return;
  const half = ARENA.platformWidth / 2;
  const destination = Math.max(half, Math.min(ARENA.width - half, target));
  state.playerX += Math.max(-400 / 60, Math.min(400 / 60, destination - state.playerX));
  const previousY = state.y;
  state.x += state.vx / 60;
  state.y += state.vy / 60;
  if (state.x < ARENA.radius) {
    state.x = 2 * ARENA.radius - state.x;
    state.vx = Math.abs(state.vx);
  } else if (state.x > ARENA.width - ARENA.radius) {
    state.x = 2 * (ARENA.width - ARENA.radius) - state.x;
    state.vx = -Math.abs(state.vx);
  }
  if (state.y < ARENA.radius) {
    state.y = 2 * ARENA.radius - state.y;
    state.vy = Math.abs(state.vy);
  }
  const contactY = ARENA.platformY - ARENA.radius;
  if (state.vy > 0 && previousY <= contactY && state.y >= contactY &&
      Math.abs(state.x - state.playerX) <= half + ARENA.radius) {
    state.score += 1;
    const speed = Math.min(420, 220 * 1.05 ** Math.floor(state.score / 5));
    const offset = Math.max(-1, Math.min(1, (state.x - state.playerX) / half));
    const angle = offset * Math.PI / 3;
    state.y = 2 * contactY - state.y;
    state.vx = Math.sin(angle) * speed;
    state.vy = -Math.cos(angle) * speed;
  }
  state.tick += 1;
  state.ended = state.y - ARENA.radius > ARENA.height || state.tick >= MAX_TICKS;
}

export function parseTranscript(value: unknown): Transcript | null {
  if (!value || typeof value !== "object" || !("inputs" in value) || !("finalTick" in value)) return null;
  const { inputs, finalTick } = value;
  if (typeof finalTick !== "number" || !Number.isInteger(finalTick) || finalTick < 1 || finalTick > MAX_TICKS ||
      !Array.isArray(inputs) || inputs.length > MAX_TICKS) return null;
  const parsed: Input[] = [];
  let previous = -1;
  for (const entry of inputs) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [tick, target]: unknown[] = entry;
    if (typeof tick !== "number" || !Number.isInteger(tick) || tick <= previous || tick < 0 || tick >= finalTick ||
        typeof target !== "number" || !Number.isInteger(target) || target < 0 || target > ARENA.width) return null;
    parsed.push([tick, target]);
    previous = tick;
  }
  return { inputs: parsed, finalTick };
}

export function replayRally(seed: number, transcript: Transcript): RallyState | null {
  const state = createRally(seed);
  let index = 0;
  let target = 240;
  while (state.tick < transcript.finalTick && !state.ended) {
    const input = transcript.inputs[index];
    if (input?.[0] === state.tick) { target = input[1]; index += 1; }
    stepRally(state, target);
  }
  return state.ended && state.tick === transcript.finalTick ? state : null;
}

export type RunTicket = {
  readonly id: string;
  readonly seed: number;
  readonly version: number;
  readonly nickname: string;
  readonly best: number;
};
export type LeaderEntry = { readonly rank: number; readonly nickname: string; readonly score: number };

export function parseTicket(value: unknown): RunTicket | null {
  if (!value || typeof value !== "object") return null;
  if (!("id" in value) || typeof value.id !== "string" || !("seed" in value) || typeof value.seed !== "number" ||
      !("version" in value) || value.version !== VERSION || !("nickname" in value) || typeof value.nickname !== "string" ||
      !("best" in value) || typeof value.best !== "number") return null;
  return { id: value.id, seed: value.seed, version: value.version, nickname: value.nickname, best: value.best };
}

export function parseLeaderboard(value: unknown): LeaderEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: LeaderEntry[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object" || !("rank" in row) || typeof row.rank !== "number" ||
        !("nickname" in row) || typeof row.nickname !== "string" || !("score" in row) || typeof row.score !== "number") return null;
    entries.push({ rank: row.rank, nickname: row.nickname, score: row.score });
  }
  return entries;
}
