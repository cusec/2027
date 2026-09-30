"use client";

import { GAMES } from "@/lib/arcade/registry";
import type { GameId } from "@/lib/arcade/types";

/** Playable sims live in the registry; the rest are authored still coming. */
export type ModeKey = GameId | "mario" | "zelda" | "slingshot" | "pokemon";

export const ALL_MODES: readonly ModeKey[] =
  ["rally", "pong", "breakout", "match3", "mario", "zelda", "slingshot", "pokemon"] as const;

export const isPlayable = (key: ModeKey): key is GameId => key in GAMES;

/** The tile art: one Cubear pose per cabinet, drawn from existing renders. */
export const MODE_ART: Record<ModeKey, string> = {
  rally: "/assets/v2/cubear/cubear-default.webp",
  pong: "/assets/v2/cubear/cubear-erm.webp",
  breakout: "/assets/v2/cubear/cubear-book.webp",
  match3: "/assets/v2/cubear/cubear-laptop.webp",
  mario: "/assets/v2/cubear/cubear-shock.webp",
  zelda: "/assets/v2/cubear/cubear-speaker.webp",
  slingshot: "/assets/v2/cubear/cubear-erm.webp",
  pokemon: "/assets/v2/cubear/cubear-default.webp",
};
