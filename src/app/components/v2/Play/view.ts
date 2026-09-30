"use client";

import type { ArcadeInput, GameId } from "@/lib/arcade/types";

/**
 * One playable arcade mode, from the browser's side: the cabinet handles
 * phases, transcripts, publication and the leaderboard; a view supplies the
 * interaction mapping, renderer and stat panel for its own sim.
 *
 * Views are client-only by nature (canvas, images), but all game *state*
 * still comes from the pure sim modules in src/lib/arcade/games/.
 */
export type Palette = {
  ink: string; inkDeep: string; lime: string; limeDeep: string; mint: string;
  mintBright: string; navy: string; teal: string; tealDeep: string;
  white: string; gold: string; red: string; blue: string; slate: string;
};

export type Images = Record<string, HTMLImageElement | null>;

export type AimControls = { aim: number | null; direction: -1 | 0 | 1 };

export type GameView = {
  id: GameId;
  /** Cubear poses and any extra art this mode needs; cabinet preloads by URL. */
  assets: readonly string[];
  /** This tick's input tuple, built from the live controls. */
  input(controls: AimControls): ArcadeInput;
  /** Point-and-tap modes: map a cell tap (0..63 row-major) to an input tuple. */
  tap?: (state: unknown, cell: number) => ArcadeInput | null;
  /** Extra key handling (hint, cursor moves); returns a tuple or null. */
  key?: (event: KeyboardEvent, meta: { state: unknown; phase: string }) => ArcadeInput | null;
  /** Draw the whole logical canvas (coordinates 480×640, scaled beforehand). */
  render(context: CanvasRenderingContext2D, state: unknown, images: Images, palette: Palette): void;
  /** The cabinet sidebar numbers: label keys resolve as V2.play.stats.<key>. */
  stats(state: unknown): Array<[key: string, value: string]>;
  /** The how-to sidebar keys, resolved under V2.play.games.<id>.* */
  helpKeys: ["how-title", "instructions", "rules"] | readonly string[];
};

export const CUBEARS = {
  default: "/assets/v2/cubear/cubear-default.webp",
  shock: "/assets/v2/cubear/cubear-shock.webp",
  speaker: "/assets/v2/cubear/cubear-speaker.webp",
  laptop: "/assets/v2/cubear/cubear-laptop.webp",
  book: "/assets/v2/cubear/cubear-book.webp",
  erm: "/assets/v2/cubear/cubear-erm.webp",
} as const;

/** Move-aim input shared by the paddle modes; direction overrides the pointer. */
export function paddleAim(width: number, { aim, direction }: AimControls): ArcadeInput {
  if (direction < 0) return [0];
  if (direction > 0) return [width];
  return [aim ?? Math.round(width / 2)];
}
