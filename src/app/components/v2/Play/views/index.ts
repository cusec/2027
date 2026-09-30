"use client";

import type { GameId } from "@/lib/arcade/types";
import type { GameView } from "../view";
import { rallyView } from "./rally";
import { pongView } from "./pong";
import { breakoutView } from "./breakout";
import { createMatch3View } from "./match3";

/** One cabinet instance per mount; match3 carries per-instance selection. */
export const views: Record<GameId, () => GameView> = {
  rally: () => rallyView,
  pong: () => pongView,
  breakout: () => breakoutView,
  match3: createMatch3View,
};
