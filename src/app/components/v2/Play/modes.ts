"use client";

import { GAMES } from "@/lib/arcade/registry";
import type { GameId } from "@/lib/arcade/types";

/**
 * Playable sims live in the registry; the rest of the wishlist render as
 * coming-soon plates. New modes land here first, then in `modes.soon`.
 */
export type ModeKey = GameId | "dash" | "jumper" | "climber" | "says" | "memory" | "snake" | "minesweeper" | "merge" | "dle" | "pet";

export const ALL_MODES: readonly ModeKey[] =
  ["flappy", "stack", "whack", "rally", "dash", "jumper", "climber", "says", "memory", "snake", "minesweeper", "merge", "dle", "pet"] as const;

export const isPlayable = (key: ModeKey): key is GameId => key in GAMES;

/** The tile art: one Cubear pose per cabinet, drawn from existing renders. */
export const MODE_ART: Record<ModeKey, string> = {
  rally: "/assets/v2/cubear/cubear-default.webp",
  flappy: "/assets/v2/cubear/cubear-erm.webp",
  stack: "/assets/v2/cubear/cubear-book.webp",
  whack: "/assets/v2/cubear/cubear-shock.webp",
  dash: "/assets/v2/cubear/cubear-laptop.webp",
  jumper: "/assets/v2/cubear/cubear-speaker.webp",
  climber: "/assets/v2/cubear/cubear-erm.webp",
  says: "/assets/v2/cubear/cubear-default.webp",
  memory: "/assets/v2/cubear/cubear-book.webp",
  snake: "/assets/v2/cubear/cubear-default.webp",
  minesweeper: "/assets/v2/cubear/cubear-shock.webp",
  merge: "/assets/v2/cubear/cubear-laptop.webp",
  dle: "/assets/v2/cubear/cubear-laptop.webp",
  pet: "/assets/v2/cubear/cubear-default.webp",
};
