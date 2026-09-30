import type { ArcadeGame, GameId } from "./types";
import { breakoutGame } from "./games/breakout";
import { match3Game } from "./games/match3";
import { pongGame } from "./games/pong";
import { rallyGame } from "./games/rally";

/**
 * The pure sim registry — shared by the cabinet on the client and the
 * verifier on the server (no mongoose, no Next imports in here). The modes
 * not in this registry (platformer, dungeon, slingshot, overworld) are
 * authored games still being ported; the hub marks them coming soon.
 */
export const GAMES: Record<GameId, ArcadeGame> = {
  rally: rallyGame,
  pong: pongGame,
  breakout: breakoutGame,
  match3: match3Game,
};

export const isGameId = (value: string): value is GameId => value in GAMES;
