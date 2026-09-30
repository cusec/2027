import type { ArcadeGame, GameId } from "./types";
import { flappyGame } from "./games/flappy";
import { rallyGame } from "./games/rally";
import { stackGame } from "./games/stack";
import { whackGame } from "./games/whack";

/**
 * The pure sim registry — shared by the cabinet on the client and the
 * verifier on the server (no mongoose, no Next imports in here). The modes
 * not in this registry (dash, climber, cubear says, 2048, 2064-dle, pet,
 * and the rest of the wishlist) are authored games still being built; the
 * hub marks them coming soon.
 */
export const GAMES: Record<GameId, ArcadeGame> = {
  rally: rallyGame,
  flappy: flappyGame,
  stack: stackGame,
  whack: whackGame,
};

export const gameOrder: readonly GameId[] = ["flappy", "stack", "whack", "rally"];

export const isGameId = (value: string): value is GameId => value in GAMES;
