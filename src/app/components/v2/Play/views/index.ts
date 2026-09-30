"use client";

import type { GameId } from "@/lib/arcade/types";
import type { GameView } from "../view";
import { rallyView } from "./rally";
import { flappyView } from "./flappy";
import { stackView } from "./stack";
import { whackView } from "./whack";

/** One cabinet instance per mount; each mode owns its render + input. */
export const views: Record<GameId, () => GameView> = {
  rally: () => rallyView,
  flappy: () => flappyView,
  stack: () => stackView,
  whack: () => whackView,
};
