import { createHash, randomBytes, randomUUID } from "node:crypto";
import mongoose, { Schema } from "mongoose";
import type { Model } from "mongoose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import connectMongoDB from "../mongodb";
import { GAMES, isGameId } from "./registry";
import { parseEventStream, replayTranscript } from "./types";
import type { GameId } from "./types";

type Player = {
  tokenHash: string; nickname: string;
  best: number; achievedAt: Date;
  /** Per-game bests for every mode except rally, which keeps `best`. */
  scores?: Record<string, { score: number; achievedAt: Date }>;
};
type Run = { id: string; game: GameId; playerId: string; seed: number; version: number; startedAt: Date;
  expiresAt: Date; completedAt: Date | null; score: number; pending: boolean };

const playerSchema = new Schema<Player>({
  tokenHash: { type: String, required: true, unique: true },
  nickname: { type: String, required: true, unique: true },
  best: { type: Number, default: 0 },
  achievedAt: { type: Date, default: () => new Date(0) },
  scores: { type: Schema.Types.Mixed, default: {} },
});
playerSchema.index({ best: -1, achievedAt: 1, nickname: 1 });
const runSchema = new Schema<Run>({
  id: { type: String, required: true, unique: true },
  game: { type: String, default: "rally" },
  playerId: { type: String, required: true },
  seed: { type: Number, required: true },
  version: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
  score: { type: Number, default: 0 },
  pending: { type: Boolean, default: true },
});
runSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
runSchema.index({ playerId: 1 }, { unique: true, partialFilterExpression: { pending: true } });

/** Same collection names as the original rally server — zero migration. */
export const ArcadePlayer: Model<Player> = mongoose.modelNames().includes("RallyPlayer")
  ? mongoose.model<Player>("RallyPlayer") : mongoose.model("RallyPlayer", playerSchema);
export const ArcadeRun: Model<Run> = mongoose.modelNames().includes("RallyRun")
  ? mongoose.model<Run>("RallyRun") : mongoose.model("RallyRun", runSchema);

const COOKIE = "cusec-rally";
const MAX_BODY = 256 * 1024;
/** Older rally runs predate the game column — they rank the rally court. */
const DEFAULT_GAME: GameId = "rally";

export class ArcadeError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

/** Back-compat alias for the pre-arcade module name. */
export const RallyError = ArcadeError;

async function resolvePlayer(request: NextRequest, create: boolean) {
  const token = request.cookies.get(COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const player = await ArcadePlayer.findOne({ tokenHash: createHash("sha256").update(token).digest("hex") });
    if (player) return { player, token: null };
  }
  if (!create) throw new ArcadeError(401, "Player cookie missing");
  const freshToken = randomBytes(32).toString("hex");
  const player = await ArcadePlayer.create({
    tokenHash: createHash("sha256").update(freshToken).digest("hex"),
    nickname: `Cubear-${randomBytes(3).toString("hex").toUpperCase()}`,
  });
  return { player, token: freshToken };
}

function bestOf(game: GameId, player: Player): number {
  if (game === DEFAULT_GAME) return player.best;
  return player.scores?.[game]?.score ?? 0;
}

/**
 * Verify a run against its mode. All checks mirror the original rally
 * verifier — 409 version, 410 lifetime, 422 too-soon, 422 no valid ending —
 * with the tick rate and lifetime provided by each game's own definition.
 * Old rally runs carry no `game` column and verify on the rally court.
 */
export function verifyRun(run: {
  readonly game?: GameId;
  readonly seed: number;
  readonly version: number;
  readonly startedAt: Date;
}, transcript: unknown, now: number): number {
  const gameId = run.game ?? DEFAULT_GAME;
  const game = isGameId(gameId) ? GAMES[gameId] : null;
  if (!game) throw new ArcadeError(409, "Run game unknown");
  if (run.version !== game.version) throw new ArcadeError(409, "Run version changed");
  const elapsed = now - run.startedAt.getTime();
  if (elapsed > game.runLifetimeMs) throw new ArcadeError(410, "Run expired");
  if (isTranscript(transcript) && elapsed < transcript.finalTick / game.tps * 1000)
    throw new ArcadeError(422, "Run submitted too soon");
  const score = replayTranscript(game, run.seed, transcript);
  if (typeof score !== "number") throw new ArcadeError(422, "Run has no valid ending");
  return score;
}

function isTranscript(value: unknown): value is { inputs: unknown[]; finalTick: number } {
  return !!value && typeof value === "object" &&
    Array.isArray((value as { inputs?: unknown }).inputs) &&
    typeof (value as { finalTick?: unknown }).finalTick === "number";
}

async function readTranscript(request: NextRequest, gameId: GameId): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ArcadeError(415, "JSON required");
  const reader = request.body?.getReader();
  if (!reader) throw new ArcadeError(400, "Transcript required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); throw new ArcadeError(413, "Transcript too large"); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch (error) { if (error instanceof SyntaxError) throw new ArcadeError(400, "Invalid JSON"); throw error; }
  if (!parseEventStream(value, GAMES[gameId])) throw new ArcadeError(400, "Invalid transcript");
  return value;
}

async function startRun(request: NextRequest) {
  let bytes: unknown = {};
  if (request.headers.get("content-type")?.startsWith("application/json")) {
    try { bytes = await request.json(); } catch { bytes = {}; }
  }
  const requested = bytes && typeof bytes === "object" && "game" in bytes ? bytes.game : DEFAULT_GAME;
  const gameId = typeof requested === "string" && isGameId(requested) ? requested : DEFAULT_GAME;
  if (requested !== gameId) throw new ArcadeError(400, "Unknown game");
  const { player, token } = await resolvePlayer(request, true);
  await ArcadeRun.deleteMany({ playerId: player.id, pending: true });
  const now = Date.now();
  const run = await ArcadeRun.create({ id: randomUUID(), game: gameId, playerId: player.id,
    seed: randomBytes(4).readUInt32BE(), version: GAMES[gameId].version, startedAt: new Date(now),
    expiresAt: new Date(now + 24 * 60 * 60_000) });
  const response = NextResponse.json({ id: run.id, game: gameId, seed: run.seed, version: run.version,
    nickname: player.nickname, best: bestOf(gameId, player as unknown as Player) });
  if (token) response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "strict",
    secure: request.nextUrl.protocol === "https:", path: "/api/play", maxAge: 365 * 24 * 60 * 60 });
  return response;
}

async function finishRun(request: NextRequest, id: string) {
  const { player } = await resolvePlayer(request, false);
  const run = await ArcadeRun.findOne({ id, playerId: player.id });
  if (!run) throw new ArcadeError(404, "Run not found");
  const gameId = run.game ?? DEFAULT_GAME;
  if (!isGameId(gameId)) throw new ArcadeError(409, "Run game unknown");
  let score = run.score;
  let completedAt = run.completedAt;
  if (run.pending) {
    const now = Date.now();
    const transcript = await readTranscript(request, gameId);
    score = verifyRun({ game: gameId, seed: run.seed, version: run.version, startedAt: run.startedAt }, transcript, now);
    const result = await ArcadeRun.findOneAndUpdate({ id, playerId: player.id, pending: true },
      { $set: { score, completedAt: new Date(now), pending: false } }, { new: true });
    const recorded = result ?? await ArcadeRun.findOne({ id, playerId: player.id, pending: false });
    if (!recorded) throw new ArcadeError(409, "Run replaced by a new game");
    score = recorded.score;
    completedAt = recorded.completedAt;
  }
  if (gameId === DEFAULT_GAME) {
    await ArcadePlayer.updateOne({ _id: player._id, best: { $lt: score } },
      { $set: { best: score, achievedAt: completedAt } });
  } else {
    const path = `scores.${gameId}`;
    await ArcadePlayer.updateOne({ _id: player._id, [`${path}.score`]: { $lt: score } },
      { $set: { [`${path}.score`]: score, [`${path}.achievedAt`]: completedAt } });
  }
  const updated = await ArcadePlayer.findById(player._id);
  return NextResponse.json({ score, best: updated ? bestOf(gameId, updated) : score, nickname: player.nickname, game: gameId });
}

export async function serveArcade(request: NextRequest, path: readonly string[]) {
  try {
    if (request.method === "POST" && request.headers.get("origin") !== request.nextUrl.origin)
      throw new ArcadeError(403, "Same-origin request required");
    const leaderboard = request.method === "GET" && path.length === 1 && path[0] === "leaderboard";
    const start = request.method === "POST" && path.length === 1 && path[0] === "runs";
    const finish = request.method === "POST" && path.length === 3 && path[0] === "runs" && path[2] === "finish" &&
      /^[a-f0-9-]{36}$/.test(path[1]);
    if (!leaderboard && !start && !finish) throw new ArcadeError(404, "Route not found");
    await connectMongoDB();
    await Promise.all([ArcadePlayer.init(), ArcadeRun.init()]);
    if (leaderboard) {
      const requested = request.nextUrl.searchParams.get("game") ?? DEFAULT_GAME;
      const gameId = isGameId(requested) ? requested : DEFAULT_GAME;
      const rows = gameId === DEFAULT_GAME
        ? await ArcadePlayer.find({ best: { $gt: 0 } }).limit(50)
            .sort({ best: -1, achievedAt: 1, nickname: 1 })
        : await ArcadePlayer.find({ [`scores.${gameId}.score`]: { $gt: 0 } }).limit(50)
            .sort({ [`scores.${gameId}.score`]: -1, [`scores.${gameId}.achievedAt`]: 1, nickname: 1 });
      const keyed = gameId === DEFAULT_GAME
        ? rows.map((p) => ({ nickname: p.nickname as string, score: p.best, achievedAt: p.achievedAt }))
        : rows.map((p) => ({ nickname: p.nickname as string,
            score: p.scores?.[gameId]?.score ?? 0,
            achievedAt: p.scores?.[gameId]?.achievedAt ?? new Date(0) }));
      keyed.sort((a, b) => b.score - a.score ||
        a.achievedAt.getTime() - b.achievedAt.getTime() ||
        a.nickname.localeCompare(b.nickname));
      return NextResponse.json(keyed.slice(0, 10).map((p, index) =>
        ({ rank: index + 1, nickname: p.nickname, score: p.score })));
    }
    return start ? await startRun(request) : await finishRun(request, path[1]);
  } catch (error) {
    if (error instanceof ArcadeError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000)
      return NextResponse.json({ error: "Please retry starting the game" }, { status: 409 });
    console.error("Arcade API failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Ranking unavailable" }, { status: 503 });
  }
}

export const serveRally = serveArcade;
